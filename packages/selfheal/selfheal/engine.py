"""Orquestracao do self-healing: grava, recupera e corrige."""
import time
from typing import Dict, List, Optional, Tuple

from .descriptor import ElementDescriptor, WEIGHTS
from .extractor import collect_from_page
from .knowledge import KnowledgeBase
from .report import HealRecord, Report
from .rewriter import build_selector, find_occurrences, rewrite_selector
from .similo import breakdown, locate

MODE_SUGGEST = "suggest"
MODE_AUTOFIX = "auto-fix"


class SelfHealEngine:
    """Camada que intercepta falhas de localizacao e aciona o Similo."""

    def __init__(self, knowledge_path: str = ".selfheal/knowledge.json",
                 report_path: str = ".selfheal/report.json",
                 threshold: float = 0.50,
                 margin: float = 0.005,
                 mode: str = MODE_AUTOFIX,
                 weights: Optional[Dict[str, float]] = None):
        self.kb = KnowledgeBase(knowledge_path)
        self.report = Report(report_path)
        self.threshold = threshold
        self.margin = margin
        self.mode = mode
        self.weights = weights or WEIGHTS

    def record_page(self, page, selectors: List[str]) -> int:
        """Registra os descritores dos seletores que ainda funcionam."""
        candidates = collect_from_page(page)
        stored = 0
        for selector in selectors:
            descriptor = self._match_selector(page, selector, candidates)
            if descriptor is not None:
                self.kb.record(selector, descriptor)
                stored += 1
        self.kb.save()
        return stored

    def _match_selector(self, page, selector: str,
                        candidates: List[ElementDescriptor]
                        ) -> Optional[ElementDescriptor]:
        handle = page.query_selector(selector)
        if handle is None:
            return None
        box = handle.bounding_box() or {}
        for candidate in candidates:
            if (abs(candidate.x - box.get("x", -999)) < 1.5
                    and abs(candidate.y - box.get("y", -999)) < 1.5):
                return candidate
        return None

    def heal(self, page, broken_selector: str,
             test_file: Optional[str] = None) -> HealRecord:
        """Tenta reposicionar o elemento e, no modo auto-fix, corrige o codigo."""
        started = time.perf_counter()
        target = self.kb.get(broken_selector)

        if target is None:
            record = HealRecord(
                old_selector=broken_selector, new_selector=None, score=0.0,
                healed=False, mode=self.mode, status="no-knowledge",
                duration_ms=(time.perf_counter() - started) * 1000)
            self.report.add(record)
            return record

        candidates = collect_from_page(page)
        best, score = locate(target, candidates, self.threshold,
                             self.weights, self.margin)

        if best is None:
            record = HealRecord(
                old_selector=broken_selector, new_selector=None,
                score=round(score, 4), healed=False, mode=self.mode,
                status="ambiguo-ou-abaixo-do-limiar",
                duration_ms=(time.perf_counter() - started) * 1000)
            self.report.add(record)
            return record

        new_selector = build_selector(best)
        detail = breakdown(target, best, self.weights)

        file_ref, line_ref, status = None, None, "pending"
        if test_file:
            occurrences = find_occurrences(test_file, broken_selector)
            line_ref = occurrences[0] if occurrences else None
            file_ref = test_file
            if self.mode == MODE_AUTOFIX and occurrences:
                rewrite_selector(test_file, broken_selector, new_selector)
                self.kb.rename(broken_selector, new_selector, best)
                self.kb.save()
                status = "applied"

        record = HealRecord(
            old_selector=broken_selector, new_selector=new_selector,
            score=round(score, 4), healed=True, mode=self.mode,
            file=file_ref, line=line_ref, breakdown=detail,
            element={"tag": best.tag, "id": best.id,
                     "visible_text": best.visible_text, "class": best.class_,
                     "name": best.name, "xpath": best.xpath},
            status=status,
            duration_ms=(time.perf_counter() - started) * 1000)
        self.report.add(record)
        return record

    def locate_or_heal(self, page, selector: str,
                       test_file: Optional[str] = None) -> Tuple[str, Optional[HealRecord]]:
        """Devolve um seletor utilizavel, recuperando-o se necessario."""
        if page.query_selector(selector) is not None:
            return selector, None
        record = self.heal(page, selector, test_file)
        return (record.new_selector or selector), record

    def flush(self) -> dict:
        self.kb.save()
        return self.report.save()
