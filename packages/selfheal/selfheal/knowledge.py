"""Base de conhecimento local: guarda os descritores da ultima execucao boa."""
import json
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from .descriptor import ElementDescriptor


class KnowledgeBase:
    """Persiste descritores em JSON, indexados pelo seletor do teste."""

    def __init__(self, path: str = ".selfheal/knowledge.json"):
        self.path = Path(path)
        self._data: Dict[str, dict] = {}
        self.load()

    def load(self) -> None:
        if self.path.exists():
            self._data = json.loads(self.path.read_text(encoding="utf-8"))
        else:
            self._data = {}

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(self._data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    # -- operacoes ---------------------------------------------------------
    def record(self, selector: str, descriptor: ElementDescriptor) -> None:
        """Registra o elemento localizado com sucesso sob aquele seletor."""
        descriptor.selector = selector
        self._data[selector] = descriptor.to_dict()

    def record_many(self, descriptors: Iterable[ElementDescriptor]) -> None:
        for d in descriptors:
            if d.selector:
                self.record(d.selector, d)

    def get(self, selector: str) -> Optional[ElementDescriptor]:
        raw = self._data.get(selector)
        return ElementDescriptor.from_dict(raw) if raw else None

    def rename(self, old_selector: str, new_selector: str,
               descriptor: ElementDescriptor) -> None:
        """Move o registro apos uma correcao aplicada no codigo."""
        self._data.pop(old_selector, None)
        self.record(new_selector, descriptor)

    def selectors(self) -> List[str]:
        return list(self._data)

    def __len__(self) -> int:
        return len(self._data)

    def __contains__(self, selector: str) -> bool:
        return selector in self._data
