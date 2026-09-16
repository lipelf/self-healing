"""Demonstracao ponta a ponta do modo auto-fix.

Aplica uma mudanca de interface, recupera os seletores quebrados e reescreve
os arquivos .spec.ts, de modo que a correcao seja permanente.
"""
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

from selfheal import SelfHealEngine, MODE_AUTOFIX
from selfheal.rewriter import find_occurrences

ROOT = Path(__file__).resolve().parents[1]
WEB, E2E, OUT = ROOT / "web", ROOT / "e2e", ROOT / ".selfheal"
BASE_URL = "http://127.0.0.1:3000"
SPECS = sorted((E2E / "tests").glob("*.spec.ts"))

PAGE_OF = {"login": "/login", "campo-busca": "/catalogo", "filtro": "/catalogo",
           "ordenar": "/catalogo", "add-produto": "/catalogo",
           "detalhe-produto": "/catalogo", "btn-ver-mais": "/catalogo",
           "item": "/carrinho", "cupom": "/carrinho", "continuar": "/carrinho",
           "finalizar": "/carrinho", "checkout": "/checkout",
           "btn-confirmar": "/checkout", "btn-entrar": "/login",
           "btn-mostrar": "/login", "link-esqueci": "/login",
           "link-criar": "/login", "thumb": "/galeria"}


def page_of(selector: str) -> str:
    raw = selector.lstrip("#")
    for fragment, path in PAGE_OF.items():
        if raw.startswith(fragment) or fragment in raw:
            return path
    return "/login"


def selectors_in_specs():
    """Todos os seletores por id usados na suite, agrupados por pagina."""
    import re
    found = {}
    for spec in SPECS:
        for match in re.finditer(r"""['"](#[a-z0-9\-]+)['"]""", spec.read_text(encoding="utf-8")):
            found.setdefault(match.group(1), str(spec))
    return found


def run_tests(label: str) -> bool:
    print(f"\n>>> executando a suite ({label})")
    proc = subprocess.run(["npx", "playwright", "test", "--reporter=line"],
                          cwd=E2E, capture_output=True, text=True)
    tail = [l for l in proc.stdout.splitlines() if "passed" in l or "failed" in l]
    print("   ", tail[-1].strip() if tail else "sem resumo")
    return proc.returncode == 0


def servidor_no_ar() -> bool:
    import urllib.error
    import urllib.request
    try:
        urllib.request.urlopen(BASE_URL + "/login", timeout=3)
        return True
    except Exception:
        return False


def garantir_servidor():
    """Sobe a aplicacao caso ela ainda nao esteja rodando.

    Devolve o processo iniciado, ou None quando o servidor ja estava no ar
    (nesse caso ele nao deve ser encerrado ao final)."""
    if servidor_no_ar():
        print("aplicacao ja esta rodando em :3000")
        return None
    print("subindo a aplicacao...")
    proc = subprocess.Popen(["npm", "run", "dev"], cwd=WEB,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        time.sleep(1)
        if servidor_no_ar():
            print("aplicacao pronta em :3000")
            return proc
    proc.terminate()
    raise RuntimeError("a aplicacao nao subiu; rode 'make dev' em outro terminal")


def backup_specs() -> None:
    """Guarda os testes originais na primeira execucao, para que a
    demonstracao possa ser repetida quantas vezes for necessario."""
    origem = E2E / "tests"
    destino = E2E / "tests.orig"
    if not destino.exists():
        shutil.copytree(origem, destino)
        print(f"copia dos testes originais salva em {destino.name}/")


def restore_specs() -> None:
    origem = E2E / "tests.orig"
    if origem.exists():
        shutil.rmtree(E2E / "tests")
        shutil.copytree(origem, E2E / "tests")


def main(scenario: str = "c1") -> int:
    backup_specs()
    restore_specs()
    servidor = garantir_servidor()
    subprocess.run(["node", "scripts/apply-variant.mjs", "base", "4"],
                   cwd=WEB, check=True, capture_output=True)
    time.sleep(2)

    targets = selectors_in_specs()
    print(f"suite usa {len(targets)} seletores por id")

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        engine = SelfHealEngine(str(OUT / "knowledge-demo.json"),
                                str(OUT / "report.json"), mode=MODE_AUTOFIX)

        print("\n[1] aprendendo a interface original...")
        by_page = {}
        for selector, spec in targets.items():
            by_page.setdefault(page_of(selector), []).append(selector)
        learned = 0
        for path, selectors in by_page.items():
            page.goto(BASE_URL + path + f"?v={time.time()}", wait_until="networkidle")
            learned += engine.record_page(page, selectors)
        print(f"    {learned} elementos registrados")

        run_tests("interface original")

        print(f"\n[2] aplicando a mudanca de interface ({scenario.upper()})...")
        subprocess.run(["node", "scripts/apply-variant.mjs", scenario, "4"],
                       cwd=WEB, check=True, capture_output=True)
        time.sleep(3)
        run_tests("apos a mudanca, sem self-healing")

        print("\n[3] recuperando os seletores e reescrevendo os testes...")
        healed = 0
        for path, selectors in by_page.items():
            page.goto(BASE_URL + path + f"?v={time.time()}", wait_until="networkidle")
            page.wait_for_selector("main")
            for selector in selectors:
                if page.query_selector(selector) is not None:
                    continue
                record = engine.heal(page, selector, targets[selector])
                if record.healed:
                    healed += 1
                    print(f"    {selector} -> {record.new_selector} "
                          f"(score {record.score:.3f}, linha {record.line})")
                else:
                    print(f"    {selector} -> nao recuperado ({record.status})")
        summary = engine.flush()
        print(f"\n    {healed} seletor(es) corrigido(s) permanentemente no codigo")
        browser.close()

    ok = run_tests("apos o self-healing")
    if servidor is not None:
        servidor.terminate()
    print("\n" + "=" * 62)
    print(f"RESULTADO: suite {'VERDE' if ok else 'ainda com falhas'} apos correcao automatica")
    print(f"taxa de recuperacao: {summary['summary']['recovery_rate']}% | "
          f"tempo medio: {summary['summary']['avg_duration_ms']} ms")
    print("=" * 62)
    print("\nos testes agora contem os seletores corrigidos. para voltar ao")
    print("estado inicial e repetir a demonstracao, rode:  make restaurar")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "c1"))
