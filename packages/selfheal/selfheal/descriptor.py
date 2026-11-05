"""Descritor de elemento: as propriedades comparadas pelo algoritmo Similo.

O conjunto foi enxugado em relacao ao Similo original: ficaram as quatro
propriedades de carga semantica e duas estruturais. As geometricas
(location, area, shape), a tag e o idxpath foram retiradas por serem
instaveis entre versoes e redundantes com o xpath.
"""
from dataclasses import dataclass, asdict, field
from typing import Any, Dict, Optional


PROPERTIES = (
    "visible_text", "neighbor_text", "id", "name",
    "class_", "xpath",
)

WEIGHTS: Dict[str, float] = {
    "visible_text": 1.5,
    "neighbor_text": 1.5,
    "id": 1.5,
    "name": 1.5,
    "class_": 0.5,
    "xpath": 0.5,
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


# Vetor de onze propriedades do Similo original. Nao e usado pelo engine:
# existe para que a comparacao 11 x 6 relatada no TCC seja reexecutavel
# (experiment/harness.py original).
PESOS_SIMILO_ORIGINAL: Dict[str, float] = {
    "visible_text": 1.5, "neighbor_text": 1.5, "id": 1.5, "name": 1.5,
    "tag": 0.5, "class_": 0.5, "xpath": 0.5, "idxpath": 0.5,
    "location": 0.5, "area": 0.5, "shape": 0.5,
}
