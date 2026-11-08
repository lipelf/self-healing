"""Rejeicao aprendida: substitui o par (limiar, margem) por uma confianca.

O criterio atual decide com dois numeros globais, o limiar tau e a margem
delta. Dois numeros nao conseguem expressar uma decisao cuja confiabilidade
depende do contexto: um campo de formulario com pontuacao 0,60 provavelmente
esta certo, uma miniatura com 0,60 e cara ou coroa. Aqui um modelo le varios
sinais, entre eles QUAL propriedade sustenta a escolha, e devolve a
probabilidade de o primeiro colocado estar correto.

A regressao logistica e implementada em Python puro de proposito. O engine e
distribuido como binario e a decisao em tempo de execucao precisa de um
produto escalar e uma sigmoide; carregar scikit-learn, scipy e numpy para isso
multiplicaria o tamanho do pacote por dez e nao mudaria o resultado. O
treinamento roda aqui, offline, e o que viaja para o engine sao os
coeficientes.

    PYTHONPATH=packages/selfheal python3 experiment/rejeicao.py
"""
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DADOS = ROOT / ".selfheal" / "experimento.json"
MODELO = ROOT / ".selfheal" / "rejeicao.json"

LIMIAR_FIXO = 0.50
MARGEM_FIXA = 0.005
PRECISAO_MINIMA = 0.95

TIPOS = {"login": "Autenticação", "ck": "Finalização", "cat": "Catálogo",
         "car": "Carrinho", "thumb": "Miniaturas"}


# -------------------------------------------------------------- dados

def carregar():
    """Linhas quebradas do experimento, com sinais e rotulo."""
    if not DADOS.exists():
        print(f"{DADOS} nao encontrado. Rode antes: make experimento")
        sys.exit(1)
    dados = json.loads(DADOS.read_text(encoding="utf-8"))
    linhas = [r for r in dados["resultados"] if r["broken"] and r.get("sinais")]
    if not linhas:
        print("os resultados nao tem o campo 'sinais'. Reexecute: make experimento")
        sys.exit(1)
    atributos = sorted(linhas[0]["sinais"])
    for i, r in enumerate(linhas):
        r["i"] = i
        r["x"] = [float(r["sinais"][a]) for a in atributos]
        r["y"] = 1 if r["top1_correct"] else 0
        r["tipo"] = re.match(r"[a-z]+", r["key"]).group(0)
    return linhas, atributos


# ------------------------------------------------- regressao logistica

def padronizar(treino):
    """Media e desvio de cada atributo, calculados SO no conjunto de treino.

    Usar o conjunto inteiro aqui vazaria informacao do teste para o treino,
    que e o erro mais comum e mais silencioso neste tipo de avaliacao.
    """
    n = len(treino)
    d = len(treino[0]["x"])
    media = [sum(r["x"][j] for r in treino) / n for j in range(d)]
    desvio = []
    for j in range(d):
        var = sum((r["x"][j] - media[j]) ** 2 for r in treino) / n
        desvio.append(math.sqrt(var) if var > 1e-12 else 1.0)
    return media, desvio


def normalizar(x, media, desvio):
    return [(x[j] - media[j]) / desvio[j] for j in range(len(x))]


def sigmoide(z):
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    e = math.exp(z)
    return e / (1.0 + e)


def treinar(treino, l2=1.0, passos=1200, taxa=1.5):
    """Descida de gradiente em lote cheio, com regularizacao L2."""
    media, desvio = padronizar(treino)
    X = [normalizar(r["x"], media, desvio) for r in treino]
    y = [r["y"] for r in treino]
    n, d = len(X), len(X[0])
    pesos = [0.0] * d
    bias = 0.0

    for _ in range(passos):
        gw = [0.0] * d
        gb = 0.0
        for i in range(n):
            p = sigmoide(sum(pesos[j] * X[i][j] for j in range(d)) + bias)
            erro = p - y[i]
            for j in range(d):
                gw[j] += erro * X[i][j]
            gb += erro
        for j in range(d):
            pesos[j] -= taxa * (gw[j] / n + l2 * pesos[j] / n)
        bias -= taxa * (gb / n)

    perda = 0.0
    for i in range(n):
        p = min(max(sigmoide(sum(pesos[j] * X[i][j] for j in range(d)) + bias), 1e-12), 1 - 1e-12)
        perda -= y[i] * math.log(p) + (1 - y[i]) * math.log(1 - p)
    return {"pesos": pesos, "bias": bias, "media": media, "desvio": desvio,
            "perda": perda / n}


def confianca(modelo, x):
    z = modelo["bias"]
    nx = normalizar(x, modelo["media"], modelo["desvio"])
    for j, w in enumerate(modelo["pesos"]):
        z += w * nx[j]
    return sigmoide(z)


# ------------------------------------------------------------ metricas

def metricas(aceitas, corretas, total):
    return {
        "quebrados": total,
        "corrigidos": aceitas,
        "corretos": corretas,
        "taxa_recuperacao": round(corretas / total * 100, 1) if total else 0.0,
        "precisao": round(corretas / aceitas * 100, 1) if aceitas else 0.0,
    }


def avaliar_modelo(modelo, corte, linhas):
    aceitas = corretas = 0
    for r in linhas:
        if confianca(modelo, r["x"]) >= corte:
            aceitas += 1
            corretas += r["y"]
    return metricas(aceitas, corretas, len(linhas))


def avaliar_fixo(linhas, limiar=LIMIAR_FIXO, margem=MARGEM_FIXA):
    """O criterio atual, nas mesmas linhas, para comparacao justa."""
    aceitas = corretas = 0
    for r in linhas:
        if r["score"] >= limiar and r.get("margin", 1.0) >= margem:
            aceitas += 1
            corretas += r["y"]
    return metricas(aceitas, corretas, len(linhas))


def escolher_corte(modelo, treino, precisao_min=PRECISAO_MINIMA):
    """Menor corte cuja precisao no TREINO atende ao minimo exigido.

    Reproduz o criterio declarado para a margem fixa, maior cobertura entre as
    opcoes que mantem a precisao acima do piso, mas o ponto de operacao e
    escolhido sem olhar o conjunto de teste. Varre as confiancas em ordem
    decrescente acumulando os acertos, de modo que cada corte custa O(1).
    """
    pares = sorted(((confianca(modelo, r["x"]), r["y"]) for r in treino),
                   reverse=True)
    aceitas = corretas = 0
    melhor, melhor_cobertura = 1.01, -1.0
    total = len(treino)
    for conf, y in pares:
        aceitas += 1
        corretas += y
        if corretas / aceitas >= precisao_min:
            cobertura = corretas / total
            if cobertura > melhor_cobertura:
                melhor_cobertura, melhor = cobertura, conf
    return melhor


# ------------------------------------------------- validacao cruzada

def dobras_por_grupo(linhas, campo, k=5):
    """Agrupa por `campo` e distribui os grupos entre k dobras.

    O mesmo elemento aparece oito vezes no experimento, uma por cenario e
    densidade. Uma divisao aleatoria o colocaria no treino e no teste ao
    mesmo tempo, o modelo decoraria aquele elemento e o numero sairia
    inflado. Agrupar impede isso.
    """
    grupos = sorted({r[campo] for r in linhas})
    destino = {g: i % k for i, g in enumerate(grupos)}
    return [[r for r in linhas if destino[r[campo]] == f] for f in range(k)]


def dobras_por_valor(linhas, campo):
    """Uma dobra por valor distinto: deixa um cenario, ou um tipo, de fora."""
    valores = sorted({r[campo] for r in linhas})
    return [(v, [r for r in linhas if r[campo] == v]) for v in valores]


def validar(linhas, dobras, rotulo, precisao_min=PRECISAO_MINIMA):
    """Soma os acertos sobre as dobras de teste, modelo contra criterio fixo."""
    ac_m = co_m = ac_f = co_f = total = 0
    detalhe = []
    for nome, teste in dobras:
        fora = {r["i"] for r in teste}
        treino = [r for r in linhas if r["i"] not in fora]
        if not treino or not teste:
            continue
        modelo = treinar(treino)
        corte = escolher_corte(modelo, treino, precisao_min)
        m = avaliar_modelo(modelo, corte, teste)
        f = avaliar_fixo(teste)
        ac_m += m["corrigidos"]; co_m += m["corretos"]
        ac_f += f["corrigidos"]; co_f += f["corretos"]
        total += len(teste)
        detalhe.append((nome, len(teste), m, f, corte))
    return {"rotulo": rotulo,
            "modelo": metricas(ac_m, co_m, total),
            "fixo": metricas(ac_f, co_f, total),
            "detalhe": detalhe}


def imprimir(res, detalhado=False):
    m, f = res["modelo"], res["fixo"]
    print(f"\n  {res['rotulo']}")
    print(f"  {'':22} {'recup.':>8} {'precisao':>9} {'aplicadas':>10} {'corretas':>9}")
    for nome, rotulo in (("fixo", "tau=0,50 delta=0,005"), ("modelo", "rejeicao aprendida")):
        d = res[nome]
        print(f"  {rotulo:22} {d['taxa_recuperacao']:7.1f}% {d['precisao']:8.1f}% "
              f"{d['corrigidos']:10d} {d['corretos']:9d}")
    dr = m["taxa_recuperacao"] - f["taxa_recuperacao"]
    dp = m["precisao"] - f["precisao"]
    print(f"  {'diferenca':22} {dr:+7.1f}  {dp:+8.1f}")
    if detalhado:
        print(f"  {'':22} {'casos':>6}  {'modelo':>16}  {'fixo':>16}")
        for nome, n, md, fx, corte in res["detalhe"]:
            print(f"  {str(nome):22} {n:6d}  "
                  f"{md['taxa_recuperacao']:6.1f}% / {md['precisao']:6.1f}%  "
                  f"{fx['taxa_recuperacao']:6.1f}% / {fx['precisao']:6.1f}%")


def curva(linhas, modelo):
    """Precisao contra cobertura, para o texto do artigo."""
    print("\n  curva de precisao contra cobertura (modelo treinado em tudo)")
    print(f"  {'corte':>7} {'recup.':>8} {'precisao':>9} {'aplicadas':>10}")
    for corte in (0.50, 0.60, 0.70, 0.80, 0.85, 0.90, 0.95, 0.98):
        m = avaliar_modelo(modelo, corte, linhas)
        print(f"  {corte:7.2f} {m['taxa_recuperacao']:7.1f}% "
              f"{m['precisao']:8.1f}% {m['corrigidos']:10d}")


def main():
    piso = float(sys.argv[1]) if len(sys.argv) > 1 else PRECISAO_MINIMA
    linhas, atributos = carregar()
    positivas = sum(r["y"] for r in linhas)
    print("=" * 74)
    print("  REJEICAO APRENDIDA")
    print("=" * 74)
    print(f"  casos quebrados ....... {len(linhas)}")
    print(f"  primeiro correto ...... {positivas}")
    print(f"  primeiro incorreto .... {len(linhas) - positivas}")
    print(f"  atributos ............. {len(atributos)}")

    print(f"  piso de precisao ...... {piso:.3f}")

    imprimir(validar(linhas, [(f"dobra {i+1}", d) for i, d in
                              enumerate(dobras_por_grupo(linhas, "key"))],
                     "validacao cruzada agrupada por elemento (5 dobras)", piso))
    imprimir(validar(linhas, dobras_por_valor(linhas, "scenario"),
                     "deixando um cenario de fora", piso), detalhado=True)
    imprimir(validar(linhas, dobras_por_valor(linhas, "tipo"),
                     "deixando um tipo de elemento de fora", piso), detalhado=True)

    final = treinar(linhas)
    corte = escolher_corte(final, linhas, piso)
    curva(linhas, final)

    print("\n  coeficientes (atributos padronizados, maior modulo primeiro)")
    ordem = sorted(zip(atributos, final["pesos"]), key=lambda p: -abs(p[1]))
    for nome, peso in ordem:
        print(f"  {nome:22} {peso:+8.3f}")
    print(f"  {'(intercepto)':22} {final['bias']:+8.3f}")
    print(f"\n  perda logaritmica no treino: {final['perda']:.4f}")

    MODELO.parent.mkdir(exist_ok=True)
    MODELO.write_text(json.dumps({
        "atributos": atributos, "pesos": final["pesos"], "bias": final["bias"],
        "media": final["media"], "desvio": final["desvio"],
        "corte": corte, "precisao_minima": piso,
        "casos": len(linhas), "positivas": positivas,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  modelo salvo em {MODELO.relative_to(ROOT)} (corte {corte:.4f})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
