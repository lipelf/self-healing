"""Ponte entre a suite de testes e o engine de self-healing.

Diferente do modo experimental, aqui quem controla o navegador e a propria
suite de testes: o Playwright ja tem a pagina aberta quando o seletor falha.
Cabe ao Python apenas a decisao — qual elemento corresponde ao que sumiu.

Protocolo: uma requisicao JSON por linha na entrada padrao, uma resposta JSON
por linha na saida padrao. O processo permanece vivo durante toda a execucao
da suite, evitando o custo de inicializacao a cada correcao.

    {"id": 1, "cmd": "remember", "selector": "#btn", "descriptor": {...}}
    {"id": 2, "cmd": "heal", "selector": "#btn", "candidates": [{...}]}
    {"id": 3, "cmd": "apply", "fixes": [{"file": "...", "old": "...", "new": "..."}]}
"""
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

from .descriptor import ElementDescriptor, WEIGHTS
from .knowledge import KnowledgeBase
from .rewriter import (build_selector, find_occurrences, rewrite_selector,
                       localizar_no_projeto, reescrever_no_projeto,
                       partes_da_chave, localizar_semantico,
                       reescrever_semantico)
from .similo import breakdown, rank_candidates

DEFAULT_THRESHOLD = 0.50
DEFAULT_MARGIN = 0.005


class Bridge:
    def __init__(self, knowledge_path: str = ".selfheal/knowledge.json",
                 threshold: float = DEFAULT_THRESHOLD,
                 margin: float = DEFAULT_MARGIN):
        self.kb = KnowledgeBase(knowledge_path)
        self.threshold = threshold
        self.margin = margin
        self.fixes: List[Dict[str, Any]] = []

    # -- aprender ----------------------------------------------------------
    def cmd_remember(self, req: Dict[str, Any]) -> Dict[str, Any]:
        """Guarda o descritor de um elemento localizado com sucesso."""
        descriptor = ElementDescriptor.from_dict(req["descriptor"])
        self.kb.record(req["selector"], descriptor)
        return {"ok": True, "stored": len(self.kb)}

    def cmd_remember_many(self, req: Dict[str, Any]) -> Dict[str, Any]:
        for item in req.get("items", []):
            self.kb.record(item["selector"],
                           ElementDescriptor.from_dict(item["descriptor"]))
        self.kb.save()
        return {"ok": True, "stored": len(self.kb)}

    def cmd_save(self, req: Dict[str, Any]) -> Dict[str, Any]:
        self.kb.save()
        return {"ok": True, "stored": len(self.kb)}

    # -- recuperar ---------------------------------------------------------
    def cmd_heal(self, req: Dict[str, Any]) -> Dict[str, Any]:
        """Escolhe, entre os candidatos enviados, o substituto do seletor."""
        started = time.perf_counter()
        selector = req["selector"]
        target = self.kb.get(selector)
        if target is None:
            return {"ok": True, "healed": False, "reason": "sem-conhecimento",
                    "selector": selector}

        candidates = [ElementDescriptor.from_dict(c) for c in req.get("candidates", [])]
        if not candidates:
            return {"ok": True, "healed": False, "reason": "sem-candidatos",
                    "selector": selector}

        ranked = rank_candidates(target, candidates, WEIGHTS)
        best, score = ranked[0]
        runner_up = ranked[1][1] if len(ranked) > 1 else 0.0
        margin = score - runner_up
        threshold = req.get("threshold", self.threshold)
        min_margin = req.get("margin", self.margin)

        elapsed = (time.perf_counter() - started) * 1000

        if score < threshold:
            return {"ok": True, "healed": False, "reason": "abaixo-do-limiar",
                    "selector": selector, "score": round(score, 4),
                    "duration_ms": round(elapsed, 2)}
        if margin < min_margin:
            return {"ok": True, "healed": False, "reason": "ambiguo",
                    "selector": selector, "score": round(score, 4),
                    "margin": round(margin, 4), "duration_ms": round(elapsed, 2)}

        novo = build_selector(best)
        return {
            "ok": True, "healed": True,
            "selector": selector, "new_selector": novo,
            "score": round(score, 4), "margin": round(margin, 4),
            "breakdown": breakdown(target, best, WEIGHTS),
            "element": {"tag": best.tag, "id": best.id, "name": best.name,
                        "text": best.visible_text, "class": best.class_},
            "duration_ms": round(elapsed, 2),
        }

    # -- corrigir o codigo -------------------------------------------------
    def cmd_apply(self, req: Dict[str, Any]) -> Dict[str, Any]:
        """Reescreve os seletores nos arquivos de teste."""
        applied = []
        raiz = req.get("root") or os.getcwd()
        for fix in req.get("fixes", []):
            arquivo, antigo, novo = fix["file"], fix["old"], fix["new"]
            # O seletor pode nao morar no .spec.ts: Page Objects e modulos de
            # constantes sao praxe. A varredura do projeto so acontece quando
            # ele nao esta no arquivo de teste, mantendo barato o caso comum.
            # Chaves de localizador semantico (getByRole e afins) nao sao
            # seletores CSS: a correcao troca o texto do argumento na chamada,
            # e nao uma string de seletor.
            semantico = partes_da_chave(antigo) is not None
            if semantico:
                texto_novo = fix.get("text")
                if not texto_novo:
                    applied.append({"file": arquivo, "old": antigo,
                                    "applied": False, "reason": "sem-texto-novo"})
                    continue
                ocorrencias = localizar_semantico(raiz, antigo, preferido=arquivo)
            else:
                ocorrencias = localizar_no_projeto(raiz, antigo, preferido=arquivo)

            if not ocorrencias:
                applied.append({"file": arquivo, "old": antigo,
                                "applied": False, "reason": "nao-encontrado"})
                continue

            if semantico:
                alterados = []
                for caminho in sorted({a for a, _ in ocorrencias}):
                    alterados.extend(
                        reescrever_semantico(caminho, antigo, fix["text"]))
            else:
                alterados = reescrever_no_projeto(raiz, antigo, novo,
                                                  preferido=arquivo)
            descriptor = self.kb.get(antigo)
            if descriptor is not None:
                self.kb.rename(antigo, novo, descriptor)
            arquivo_real, linha = ocorrencias[0]
            applied.append({"file": arquivo_real, "old": antigo, "new": novo,
                            "line": linha, "applied": True,
                            "arquivos": sorted({a.file for a in alterados})})
        self.kb.save()
        return {"ok": True, "applied": applied}

    # -- localizar no codigo -----------------------------------------------
    def cmd_locate(self, req: Dict[str, Any]) -> Dict[str, Any]:
        """Em que arquivo e linha cada seletor aparece na suite.

        Usado para os seletores que a ferramenta nao conseguiu recuperar: ela
        nao corrige, mas aponta exatamente onde a correcao manual e feita.
        """
        localizados = []
        raiz = req.get("root") or os.getcwd()
        for item in req.get("items", []):
            arquivo, seletor = item.get("file"), item["selector"]
            ocorrencias = localizar_no_projeto(raiz, seletor, preferido=arquivo)
            # Quando o seletor mora fora do .spec.ts, aponta-se o arquivo real,
            # para que a correcao manual nao comece por uma caca ao seletor.
            arquivo_real = ocorrencias[0][0] if ocorrencias else arquivo
            localizados.append({"file": arquivo_real, "selector": seletor,
                                "lines": [n for _a, n in ocorrencias],
                                "ocorrencias": [{"file": a, "line": n}
                                                for a, n in ocorrencias]})
        return {"ok": True, "located": localizados}

    # -- relatorio ---------------------------------------------------------
    def cmd_report(self, req: Dict[str, Any]) -> Dict[str, Any]:
        """Consolida a execucao da suite em .selfheal/report.json.

        E este arquivo que alimenta `selfheal report`, `selfheal table` e o
        painel de revisao. Sem ele, o que acontece durante a suite se perde
        quando o processo termina.
        """
        from .report import HealRecord, Report

        relatorio = Report(req.get("path", ".selfheal/report.json"))

        # Uma mudanca de interface costuma levar mais de uma execucao para ser
        # absorvida: um seletor so quebra depois que o anterior volta a
        # funcionar. Por isso o relatorio acumula as execucoes em vez de
        # sobrescrever — o que interessa e a campanha de correcao inteira, e
        # nao a ultima rodada. Para comecar do zero, apague o arquivo.
        vistos = set()
        anterior: Dict[str, Any] = {}
        acumular = relatorio.path.exists() and not req.get("reset")
        if acumular:
            try:
                anterior = json.loads(relatorio.path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                anterior = {}
            for registro in anterior.get("records", []):
                chave = (registro.get("file"), registro.get("old_selector"))
                if chave in vistos:
                    continue
                vistos.add(chave)
                relatorio.add(HealRecord(**registro))
        for fix in req.get("fixes", []):
            if (fix.get("file"), fix["old"]) in vistos:
                continue
            vistos.add((fix.get("file"), fix["old"]))
            aplicado = bool(fix.get("applied"))
            relatorio.add(HealRecord(
                old_selector=fix["old"], new_selector=fix.get("new"),
                score=float(fix.get("score") or 0.0), healed=True,
                mode="autofix" if aplicado else "sugestao",
                file=fix.get("file"), line=fix.get("line"),
                breakdown=fix.get("breakdown") or {},
                element=fix.get("element") or {},
                status="applied" if aplicado else "pending",
                duration_ms=float(fix.get("duration_ms") or 0.0)))
        for miss in req.get("misses", []):
            if (miss.get("file"), miss["old"]) in vistos:
                continue
            vistos.add((miss.get("file"), miss["old"]))
            relatorio.add(HealRecord(
                old_selector=miss["old"], new_selector=None,
                score=float(miss.get("score") or 0.0), healed=False,
                mode="manual", file=miss.get("file"), line=miss.get("line"),
                status=miss.get("reason") or "nao-recuperado"))

        payload = relatorio.save()
        suite = req.get("suite")
        if suite and relatorio.records:
            # Sem self-healing, todo seletor quebrado da campanha exigiria
            # correcao manual — inclusive os que so apareceram em rodadas
            # posteriores.
            previa = (anterior.get("suite") or {}) if acumular else {}
            suite = dict(suite)
            suite["execucoes"] = previa.get("execucoes", 0) + 1
            # Quantos testes falhariam sem a ferramenta: o pior momento da
            # campanha, nao o da ultima rodada — quando a suite ja esta verde
            # justamente porque as correcoes foram aplicadas.
            suite["failed_without_healing"] = max(
                suite.get("failed_without_healing", 0),
                previa.get("failed_without_healing", 0))
        if suite:
            # Resultado da suite (testes que passaram/falharam) fica junto do
            # relatorio: e o que permite comparar com e sem self-healing.
            dados = json.loads(Path(relatorio.path).read_text(encoding="utf-8"))
            dados["suite"] = suite
            Path(relatorio.path).write_text(
                json.dumps(dados, indent=2, ensure_ascii=False), encoding="utf-8")
        return {"ok": True, "path": str(relatorio.path),
                "summary": payload["summary"]}

    def cmd_ping(self, req: Dict[str, Any]) -> Dict[str, Any]:
        return {"ok": True, "pong": True, "knowledge": len(self.kb),
                "threshold": self.threshold, "margin": self.margin}


def main(argv=None) -> int:
    import argparse
    parser = argparse.ArgumentParser(prog="selfheal bridge")
    parser.add_argument("--knowledge", default=".selfheal/knowledge.json")
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    parser.add_argument("--margin", type=float, default=DEFAULT_MARGIN)
    args = parser.parse_args(argv)

    bridge = Bridge(args.knowledge, args.threshold, args.margin)
    handlers = {name[4:]: getattr(bridge, name)
                for name in dir(bridge) if name.startswith("cmd_")}

    for linha in sys.stdin:
        linha = linha.strip()
        if not linha:
            continue
        try:
            req = json.loads(linha)
            handler = handlers.get(req.get("cmd"))
            if handler is None:
                resp = {"ok": False, "error": f"comando desconhecido: {req.get('cmd')}"}
            else:
                resp = handler(req)
            resp["id"] = req.get("id")
        except Exception as exc:  # devolve o erro em vez de derrubar a suite
            resp = {"ok": False, "error": str(exc), "id": None}
        sys.stdout.write(json.dumps(resp, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
