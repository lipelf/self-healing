"""Implementacao do algoritmo de similaridade ponderada Similo.

Referencia: KLUGE, A.; STOCCO, A. Web element relocalization in evolving
web applications: a comparative analysis and extension study. 2025.
"""
from math import hypot
from typing import Dict, List, Optional, Tuple

from .descriptor import ElementDescriptor, WEIGHTS

TEXT_PROPERTIES = (
    "visible_text", "neighbor_text", "id", "name",
    "tag", "class_", "xpath", "idxpath",
)


def levenshtein(a: str, b: str) -> int:
    """Distancia de edicao classica, com matriz em duas linhas."""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        current = [i]
        for j, cb in enumerate(b, 1):
            current.append(min(
                previous[j] + 1,          # remocao
                current[j - 1] + 1,       # insercao
                previous[j - 1] + (ca != cb),  # substituicao
            ))
        previous = current
    return previous[-1]


def text_similarity(a: str, b: str) -> float:
    """Levenshtein normalizada no intervalo [0, 1]."""
    a = (a or "").strip().lower()
    b = (b or "").strip().lower()
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    longest = max(len(a), len(b))
    return 1.0 - (levenshtein(a, b) / longest)


def location_similarity(target: ElementDescriptor, candidate: ElementDescriptor) -> float:
    """Distancia euclidiana normalizada pela diagonal da janela."""
    diagonal = hypot(target.viewport_width or 1280.0, target.viewport_height or 720.0)
    distance = hypot(candidate.x - target.x, candidate.y - target.y)
    return max(0.0, 1.0 - (distance / diagonal)) if diagonal else 0.0


def ratio_similarity(a: float, b: float) -> float:
    """Razao entre o menor e o maior valor; usada para area e proporcao."""
    if a <= 0 and b <= 0:
        return 1.0
    if a <= 0 or b <= 0:
        return 0.0
    return min(a, b) / max(a, b)


def property_similarity(prop: str, target: ElementDescriptor,
                        candidate: ElementDescriptor) -> float:
    if prop in TEXT_PROPERTIES:
        return text_similarity(target.get(prop), candidate.get(prop))
    if prop == "location":
        return location_similarity(target, candidate)
    if prop == "area":
        return ratio_similarity(target.area, candidate.area)
    if prop == "shape":
        return ratio_similarity(target.shape, candidate.shape)
    raise ValueError(f"propriedade desconhecida: {prop}")


def similarity(target: ElementDescriptor, candidate: ElementDescriptor,
               weights: Optional[Dict[str, float]] = None) -> float:
    """Pontuacao S(c,t) = sum(w_j * sim_j) / sum(w_j)."""
    weights = weights or WEIGHTS
    total = 0.0
    accumulated = 0.0
    for prop, weight in weights.items():
        accumulated += weight * property_similarity(prop, target, candidate)
        total += weight
    return accumulated / total if total else 0.0


def breakdown(target: ElementDescriptor, candidate: ElementDescriptor,
              weights: Optional[Dict[str, float]] = None) -> Dict[str, float]:
    """Contribuicao individual de cada propriedade, util para auditoria."""
    weights = weights or WEIGHTS
    return {p: round(property_similarity(p, target, candidate), 4) for p in weights}


def rank_candidates(target: ElementDescriptor, candidates: List[ElementDescriptor],
                    weights: Optional[Dict[str, float]] = None
                    ) -> List[Tuple[ElementDescriptor, float]]:
    """Candidatos ordenados da maior para a menor pontuacao."""
    scored = [(c, similarity(target, c, weights)) for c in candidates]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored


def locate(target: ElementDescriptor, candidates: List[ElementDescriptor],
           threshold: float = 0.50, weights: Optional[Dict[str, float]] = None,
           margin: float = 0.005
           ) -> Tuple[Optional[ElementDescriptor], float]:
    """Melhor candidato, aplicando limiar e rejeicao por ambiguidade.

    Alem de exigir pontuacao minima, exige que o primeiro colocado se separe
    do segundo por pelo menos `margin`. Quando dois candidatos praticamente
    empatam, nao existe evidencia para escolher entre eles, e devolver nenhum
    e preferivel a devolver o errado: uma correcao incorreta troca um teste
    que falha de forma visivel por um teste que passa validando o elemento
    errado, mascarando defeitos reais.

    Essa rejeicao e a extensao proposta sobre o Similo original e responde
    diretamente aos falsos positivos relatados por Kluge e Stocco (2025).
    """
    if not candidates:
        return None, 0.0
    ranked = rank_candidates(target, candidates, weights)
    best, score = ranked[0]
    runner_up = ranked[1][1] if len(ranked) > 1 else 0.0
    if score < threshold:
        return None, score
    if (score - runner_up) < margin:
        return None, score
    return best, score


def ambiguity_margin(target: ElementDescriptor,
                     candidates: List[ElementDescriptor],
                     weights: Optional[Dict[str, float]] = None) -> float:
    """Distancia entre o primeiro e o segundo colocado."""
    ranked = rank_candidates(target, candidates, weights)
    if len(ranked) < 2:
        return 1.0
    return ranked[0][1] - ranked[1][1]
