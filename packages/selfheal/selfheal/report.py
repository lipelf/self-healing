"""Relatorio JSON consumido pelo painel de revisao."""
import json
from dataclasses import dataclass, asdict, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class HealRecord:
    old_selector: str
    new_selector: Optional[str]
    score: float
    healed: bool
    mode: str
    file: Optional[str] = None
    line: Optional[int] = None
    breakdown: Dict[str, float] = field(default_factory=dict)
    element: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"
    duration_ms: float = 0.0
    rewrite_ms: float = 0.0


class Report:
    def __init__(self, path: str = ".selfheal/report.json"):
        self.path = Path(path)
        self.records: List[HealRecord] = []
        self.started_at = datetime.now().isoformat(timespec="seconds")

    def add(self, record: HealRecord) -> None:
        self.records.append(record)

    @property
    def total(self) -> int:
        return len(self.records)

    @property
    def healed(self) -> int:
        return sum(1 for r in self.records if r.healed)

    @property
    def recovery_rate(self) -> float:
        return (self.healed / self.total * 100) if self.total else 0.0

    @property
    def total_duration_ms(self) -> float:
        return sum(r.duration_ms for r in self.records)

    @property
    def total_rewrite_ms(self) -> float:
        """Tempo gasto reescrevendo o codigo, somado sobre as correcoes."""
        return sum(r.rewrite_ms for r in self.records)

    def summary(self) -> Dict[str, Any]:
        return {
            "started_at": self.started_at,
            "total_broken": self.total,
            "total_healed": self.healed,
            "recovery_rate": round(self.recovery_rate, 2),
            "total_duration_ms": round(self.total_duration_ms, 1),
            "avg_duration_ms": round(
                self.total_duration_ms / self.total, 1) if self.total else 0.0,
            "total_rewrite_ms": round(self.total_rewrite_ms, 1),
            "rewrite_share_pct": round(
                100 * self.total_rewrite_ms
                / (self.total_duration_ms + self.total_rewrite_ms), 1)
            if (self.total_duration_ms + self.total_rewrite_ms) else 0.0,
        }

    def save(self) -> Dict[str, Any]:
        payload = {"summary": self.summary(),
                   "records": [asdict(r) for r in self.records]}
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(payload, indent=2, ensure_ascii=False),
                             encoding="utf-8")
        return payload
