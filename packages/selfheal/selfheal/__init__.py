"""selfheal - recuperacao automatica de seletores em testes web.

Implementa o algoritmo de similaridade ponderada Similo e aplica a correcao
permanentemente no arquivo de teste.
"""
from .descriptor import ElementDescriptor, WEIGHTS, PROPERTIES
from .knowledge import KnowledgeBase
from .report import Report, HealRecord
from .rewriter import build_selector, rewrite_selector, find_occurrences
from .confianca import Confianca
from .similo import (similarity, locate, rank_candidates, breakdown,
                     text_similarity, ambiguity_margin, sinais_de_decisao)

MODE_SUGGEST = "suggest"
MODE_AUTOFIX = "auto-fix"


def __getattr__(name):
    """Carrega o orquestrador apenas quando ele e realmente usado.

    `SelfHealEngine` depende do Playwright para ler o DOM, mas a ponte que
    roda durante a suite so precisa decidir qual elemento corresponde ao que
    sumiu. Adiar este import mantem o caminho da decisao leve — e o que
    permite distribuir o engine como um binario pequeno e sem navegador.
    """
    if name == "SelfHealEngine":
        from .engine import SelfHealEngine
        return SelfHealEngine
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__version__ = "0.1.0"
__all__ = [
    "ElementDescriptor", "WEIGHTS", "PROPERTIES",
    "SelfHealEngine", "MODE_AUTOFIX", "MODE_SUGGEST",
    "KnowledgeBase", "Report", "HealRecord",
    "build_selector", "rewrite_selector", "find_occurrences",
    "similarity", "locate", "rank_candidates", "breakdown", "text_similarity",
    "ambiguity_margin", "sinais_de_decisao", "Confianca",
]
