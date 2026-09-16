"""Descritor de elemento: as 11 propriedades comparadas pelo algoritmo Similo."""
from dataclasses import dataclass, asdict, field
from typing import Any, Dict, Optional


PROPERTIES = (
    "visible_text", "neighbor_text", "id", "name",
    "tag", "class_", "xpath", "idxpath",
    "location", "area", "shape",
)

# Pesos: propriedades com carga semantica sao mais estaveis entre versoes.
WEIGHTS: Dict[str, float] = {
    "visible_text": 1.5,
    "neighbor_text": 1.5,
    "id": 1.5,
    "name": 1.5,
    "tag": 0.5,
    "class_": 0.5,
    "xpath": 0.5,
    "idxpath": 0.5,
    "location": 0.5,
    "area": 0.5,
    "shape": 0.5,
}


@dataclass
class ElementDescriptor:
    """Fotografia de um elemento da pagina em um dado momento."""

    tag: str = ""
    id: str = ""
    name: str = ""
    class_: str = ""
    visible_text: str = ""
    neighbor_text: str = ""
    xpath: str = ""
    idxpath: str = ""
    x: float = 0.0
    y: float = 0.0
    width: float = 0.0
    height: float = 0.0
    viewport_width: float = 1280.0
    viewport_height: float = 720.0
    selector: str = ""
    meta: Dict[str, Any] = field(default_factory=dict)

    # -- propriedades derivadas -------------------------------------------
    @property
    def location(self):
        return (self.x, self.y)

    @property
    def area(self) -> float:
        return self.width * self.height

    @property
    def shape(self) -> float:
        """Proporcao largura/altura. 0 quando indefinida."""
        return (self.width / self.height) if self.height else 0.0

    def get(self, prop: str):
        if prop in ("location", "area", "shape"):
            return getattr(self, prop)
        return getattr(self, prop, "")

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ElementDescriptor":
        allowed = {k: v for k, v in data.items() if k in cls.__dataclass_fields__}
        return cls(**allowed)

    def __repr__(self) -> str:  # pragma: no cover - conveniencia
        label = self.visible_text or self.id or self.name or self.tag
        return f"<Element {self.tag} '{label[:30]}' selector={self.selector!r}>"
