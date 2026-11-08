"""Rejeicao aprendida: estima a probabilidade de o primeiro colocado estar certo.

Alternativa ao par (limiar, margem). Dois numeros globais nao conseguem
expressar uma decisao cuja confiabilidade depende do contexto, e e isso que o
modelo acrescenta: alem das pontuacoes e da distancia entre os colocados, ele
le quais propriedades sustentam a escolha.

Em tempo de execucao isto e um produto escalar seguido de uma sigmoide, em
Python puro. O treinamento acontece fora, em experiment/rejeicao.py, e o que
chega aqui sao os coeficientes. Nao ha dependencia de bibliotecas numericas,
que multiplicariam por dez o tamanho do binario distribuido sem mudar o
resultado de dez multiplicacoes.

A margem fixa continua sendo o padrao da ferramenta. O modelo supera a margem
onde existem dados rotulados representativos e fica atras dela onde nao
existem, e um projeto recem-instalado esta sempre no segundo caso.
"""
import json
import math
from pathlib import Path
from typing import Dict, Optional


class Confianca:
    """Modelo linear de confianca carregado de um arquivo JSON."""

    def __init__(self, atributos, pesos, bias, media, desvio, corte):
        self.atributos = list(atributos)
        self.pesos = list(pesos)
        self.bias = float(bias)
        self.media = list(media)
        self.desvio = list(desvio)
        self.corte = float(corte)

    @classmethod
    def carregar(cls, caminho: str) -> Optional["Confianca"]:
        """Devolve None quando o arquivo nao existe ou esta ilegivel.

        A ausencia do modelo nao e erro: significa apenas que a ferramenta
        opera com a margem fixa, que e o padrao.
        """
        p = Path(caminho)
        if not p.exists():
            return None
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
            return cls(d["atributos"], d["pesos"], d["bias"],
                       d["media"], d["desvio"], d["corte"])
        except (OSError, ValueError, KeyError):
            return None

    def probabilidade(self, sinais: Dict[str, float]) -> float:
        z = self.bias
        for j, nome in enumerate(self.atributos):
            desvio = self.desvio[j] or 1.0
            z += self.pesos[j] * ((float(sinais.get(nome, 0.0)) - self.media[j]) / desvio)
        if z >= 0:
            return 1.0 / (1.0 + math.exp(-z))
        e = math.exp(z)
        return e / (1.0 + e)

    def aceita(self, sinais: Dict[str, float]) -> bool:
        if not sinais:
            return False
        return self.probabilidade(sinais) >= self.corte
