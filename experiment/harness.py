"""Harness do experimento controlado.

Aplica cada cenario de mudanca de interface sobre a aplicacao de demonstracao,
executa o engine de self-healing e mede taxa de recuperacao, precisao e tempo.
A verificacao do acerto usa o gabarito emitido pelo script de mutacao, definido
antes da execucao, evitando inspecao manual.
"""
import json
import subprocess
import time
from pathlib import Path
from typing import Dict, List

from playwright.sync_api import sync_playwright

from selfheal.descriptor import WEIGHTS
from selfheal.extractor import collect_from_page
from selfheal.knowledge import KnowledgeBase
from selfheal.similo import locate, rank_candidates

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
OUT = ROOT / ".selfheal"
BASE_URL = "http://127.0.0.1:3000"

PAGES = {
    "login": "/login",
    "catalogo": "/catalogo",
    "carrinho": "/carrinho",
    "checkout": "/checkout",
    "galeria": "/galeria",
}

# Em qual pagina vive cada elemento do registro.
PAGE_OF_PREFIX = {"login": "login", "cat": "catalogo", "car": "carrinho",
                  "ck": "checkout", "thumb": "galeria"}


def page_for(key: str) -> str:
    for prefix, page in PAGE_OF_PREFIX.items():
        if key.startswith(prefix):
            return page
    raise ValueError(key)


def apply_variant(scenario: str, catalog_size: int = 4) -> dict:
    subprocess.run(["node", "scripts/apply-variant.mjs", scenario, str(catalog_size)],
                   cwd=WEB, check=True, capture_output=True)
    return json.loads((OUT / "variant-map.json").read_text(encoding="utf-8"))


def goto(page, path: str, expect_id: str = "", retries: int = 8) -> None:
    """Navega e confirma que a variante ja foi recompilada e servida.

    Sem essa verificacao o servidor de desenvolvimento pode devolver a versao
    anterior da pagina, contaminando a medicao.
    """
    for attempt in range(retries):
        try:
            page.goto(BASE_URL + path + f"?v={time.time()}",
                      wait_until="networkidle", timeout=60000)
            page.wait_for_selector("main", timeout=30000)
            if not expect_id:
                return
            if page.query_selector(f"#{expect_id}") is not None:
                return
        except Exception:
            if attempt == retries - 1:
                raise
        time.sleep(1.5)
    raise RuntimeError(f"variante nao aplicada em {path}: #{expect_id} ausente")


def first_id_on(elements: dict, page_name: str, field: str) -> str:
    """Um id conhecido daquela pagina, usado para confirmar a recompilacao."""
    for key, info in elements.items():
        if page_for(key) == page_name:
            return info[field]["id"]
    return ""


def record_baseline(page, elements: Dict[str, dict], kb: KnowledgeBase) -> int:
    """Passo 1: registra os descritores com a interface original."""
    stored = 0
    for page_name, path in PAGES.items():
        goto(page, path, first_id_on(elements, page_name, "baseline"))
        candidates = collect_from_page(page)
        by_id = {c.id: c for c in candidates if c.id}
        for key, info in elements.items():
            if page_for(key) != page_name:
                continue
            descriptor = by_id.get(info["baseline"]["id"])
            if descriptor is not None:
                kb.record(info["baseline"]["selector"], descriptor)
                stored += 1
    kb.save()
    return stored


def run_scenario(page, scenario: str, kb: KnowledgeBase,
                 threshold: float = 0.60, catalog_size: int = 4) -> List[dict]:
    """Aplica o cenario e tenta recuperar cada seletor invalidado."""
    variant = apply_variant(scenario, catalog_size)
    elements = variant["elements"]
    results: List[dict] = []

    for page_name, path in PAGES.items():
        goto(page, path, first_id_on(elements, page_name, "mutated"))
        candidates = collect_from_page(page)
        by_id = {c.id: c for c in candidates if c.id}

        for key, info in elements.items():
            if page_for(key) != page_name:
                continue

            old_selector = info["baseline"]["selector"]
            expected = by_id.get(info["mutated"]["id"])
            target = kb.get(old_selector)
            if target is None or expected is None:
                continue

            broken = page.query_selector(old_selector) is None
            if not broken:
                results.append({"scenario": scenario, "catalog_size": catalog_size,
                                "key": key, "selector": old_selector,
                                "broken": False, "top1_correct": True,
                                "score": 1.0, "runner_up": 0.0, "margin": 1.0,
                                "candidates": len(candidates), "duration_ms": 0.0})
                continue

            started = time.perf_counter()
            ranked = rank_candidates(target, candidates, WEIGHTS)
            elapsed = (time.perf_counter() - started) * 1000
            best, score = ranked[0] if ranked else (None, 0.0)
            runner_up = ranked[1][1] if len(ranked) > 1 else 0.0

            correct = bool(best is not None and best.xpath == expected.xpath)
            results.append({
                "scenario": scenario, "catalog_size": catalog_size,
                "key": key, "selector": old_selector,
                "broken": True, "top1_correct": correct,
                "score": round(score, 4), "runner_up": round(runner_up, 4),
                "margin": round(score - runner_up, 4),
                "candidates": len(candidates),
                "duration_ms": round(elapsed, 3),
                "expected_id": info["mutated"]["id"],
                "chosen_id": best.id if best else None,
                "chosen_text": best.visible_text if best else None,
            })
    return results


def summarize(results: List[dict], threshold: float = 0.50,
              margin: float = 0.005) -> dict:
    """Metricas para um dado par (limiar, margem), a partir do ranking.

    Uma correcao so e aplicada quando a pontuacao supera o limiar E o
    primeiro colocado se separa do segundo por pelo menos `margin`. Com
    margin=0 o criterio equivale ao Similo original, o que permite medir o
    efeito isolado da rejeicao por ambiguidade sobre os mesmos dados.
    """
    broken = [r for r in results if r["broken"]]
    healed = [r for r in broken
              if r["score"] >= threshold and r.get("margin", 1.0) >= margin]
    correct = [r for r in healed if r["top1_correct"]]
    return {
        "quebrados": len(broken),
        "corrigidos": len(healed),
        "corretos": len(correct),
        "taxa_recuperacao": round(len(correct) / len(broken) * 100, 1) if broken else 0.0,
        "precisao": round(len(correct) / len(healed) * 100, 1) if healed else 0.0,
        "tempo_medio_ms": round(sum(r["duration_ms"] for r in broken) / len(broken), 2) if broken else 0.0,
        "nao_recuperados": len(broken) - len(healed),
        "incorretos": len(healed) - len(correct),
    }


def sweep(results: List[dict], lo: float = 0.30, hi: float = 0.80,
          step: float = 0.05, margin: float = 0.0) -> List[dict]:
    """Varredura do limiar, com a margem fixada: calibracao de tau."""
    rows, t = [], lo
    while t <= hi + 1e-9:
        s = summarize(results, round(t, 2), margin)
        rows.append({"limiar": round(t, 2), "margem": margin, **s})
        t += step
    return rows


def sweep_margin(results: List[dict], threshold: float = 0.50,
                 margins=(0.0, 0.005, 0.010, 0.020, 0.030, 0.050)) -> List[dict]:
    """Varredura da margem, com o limiar fixado: calibracao de delta.

    E esta varredura que quantifica o efeito da rejeicao por ambiguidade:
    quanto de recuperacao se troca por quanto de precisao.
    """
    return [{"limiar": threshold, "margem": m, **summarize(results, threshold, m)}
            for m in margins]


def main(scenarios=("c1", "c2", "c3", "c4"), threshold: float = 0.50,
         margin: float = 0.005, densities=(4, 24)) -> dict:
    OUT.mkdir(exist_ok=True)
    all_results: List[dict] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        for size in densities:
            print(f"\n### densidade: catalogo com {size} produtos ###")
            kb = KnowledgeBase(str(OUT / f"knowledge-{size}.json"))
            variant = apply_variant("base", size)
            stored = record_baseline(page, variant["elements"], kb)
            print(f"linha de base: {stored} elementos registrados\n")

            for scenario in scenarios:
                results = run_scenario(page, scenario, kb, threshold, size)
                all_results.extend(results)
                s = summarize(results, threshold, margin)
                print(f"  {scenario.upper()}: quebrados={s['quebrados']} "
                      f"corrigidos={s['corrigidos']} corretos={s['corretos']} "
                      f"recuperacao={s['taxa_recuperacao']}% "
                      f"precisao={s['precisao']}%")

        browser.close()

    apply_variant("base", 4)
    def subset(**kw):
        rows = all_results
        for k, v in kw.items():
            rows = [r for r in rows if r.get(k) == v]
        return summarize(rows, threshold, margin)

    payload = {
        "threshold": threshold,
        "margin": margin,
        "calibracao": sweep(all_results),
        "calibracao_margem": sweep_margin(all_results, threshold),
        "calibracao_por_cenario": {
            s: sweep([r for r in all_results if r["scenario"] == s])
            for s in scenarios},
        "global": summarize(all_results, threshold, margin),
        "por_densidade": {str(d): subset(catalog_size=d) for d in densities},
        "por_cenario": {s: subset(scenario=s) for s in scenarios},
        "por_cenario_densidade": {
            f"{s}@{d}": subset(scenario=s, catalog_size=d)
            for d in densities for s in scenarios},
        "resultados": all_results,
    }
    (OUT / "experimento.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return payload


if __name__ == "__main__":
    result = main()
    g = result["global"]
    print("=" * 60)
    print(f"GLOBAL  recuperacao={g['taxa_recuperacao']}%  precisao={g['precisao']}%  "
          f"tempo={g['tempo_medio_ms']}ms")
    print("=" * 60)
