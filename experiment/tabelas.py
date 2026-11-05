"""Gera as tabelas e o grafico do artigo a partir de .selfheal/experimento.json.

Transcrever numero a numero de um JSON para o LaTeX e onde os erros de
digitacao aparecem — e onde ninguem os procura depois. Este script emite os
blocos prontos para colar, de modo que o texto e o experimento nao possam
divergir silenciosamente.

    PYTHONPATH=packages/selfheal python3 experiment/tabelas.py
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from harness import summarize

ROOT = Path(__file__).resolve().parents[1]
DADOS = ROOT / ".selfheal" / "experimento.json"

ROTULOS = {"c1": "C1", "c2": "C2", "c3": "C3", "c4": "C4"}

TIPOS = (
    ("login", "Autenticação"),
    ("ck", "Finalização de pedido"),
    ("cat", "Catálogo de produtos"),
    ("car", "Carrinho"),
    ("thumb", "Miniaturas"),
)


def br(valor, casas=1, sufixo="\\%"):
    """Numero no formato brasileiro, com virgula decimal."""
    return f"{valor:.{casas}f}".replace(".", "{,}") + sufixo


def moldura(colunas, cabecalho, corpo, legenda, rotulo,
            fonte="Elaborado pelo autor"):
    """Float no formato adotado no TCC.

    A tabela e medida em um \\savebox e a legenda e a fonte ficam dentro de uma
    minipage dessa mesma largura, de modo que ambas se alinhem a borda esquerda
    do elemento, e nao a margem da pagina.
    """
    return (
        "\\begin{table}[htbp]\n"
        "\\centering\n"
        "\\savebox{\\caixafig}{%\n"
        "\\renewcommand{\\baselinestretch}{1}\\small\n"
        f"\\begin{{tabular}}{{{colunas}}}\n"
        "    \\hline\n"
        f"    {cabecalho} \\\\\n"
        "    \\hline\n"
        f"{corpo}\n"
        "    \\hline\n"
        "    \\end{tabular}}%\n"
        "\\begin{minipage}{\\wd\\caixafig}\n"
        f"  \\caption{{{legenda}}}\n"
        f"  \\label{{{rotulo}}}\n"
        "  \\vspace{-0.25cm}\n"
        "\n"
        "  \\usebox{\\caixafig}\\\\[3pt]\n"
        "  {\\renewcommand{\\baselinestretch}{1}\\footnotesize Fonte: "
        f"{fonte}.}}\n"
        "\\end{minipage}\n"
        "\\end{table}"
    )


def tabela_calibracao(dados):
    linhas = []
    for r in dados.get("calibracao_margem", []):
        margem = r["margem"]
        rotulo = "0 (sem rejeição)" if margem == 0 else br(margem, 3, "")
        linhas.append(
            f"    {rotulo:<19}& {br(r['taxa_recuperacao'])} & "
            f"{br(r['precisao'])} & {r['incorretos']} \\\\")
    return moldura(
        "c c c c",
        "\\textbf{Margem $\\delta$} & \\textbf{Recuperação} & "
        "\\textbf{Precisão} & \\textbf{Correções incorretas}",
        "\n".join(linhas),
        "Efeito da margem de ambiguidade sobre recuperação e precisão",
        "tab:calibracao")


def tabela_cenarios(dados):
    linhas = []
    for chave, rotulo in ROTULOS.items():
        m = dados["por_cenario"].get(chave)
        if not m:
            continue
        linhas.append(
            f"    {rotulo:<7}& {m['quebrados']} & {m['corrigidos']} & "
            f"{m['corretos']} & {br(m['taxa_recuperacao'])} & "
            f"{br(m['precisao'])} \\\\")
    g = dados["global"]
    linhas.append("    \\hline")
    linhas.append(
        f"    Global & {g['quebrados']} & {g['corrigidos']} & "
        f"{g['corretos']} & {br(g['taxa_recuperacao'])} & "
        f"{br(g['precisao'])} \\\\")
    return moldura(
        "c c c c c c",
        "\\textbf{Cenário} & \\textbf{Quebr.} & \\textbf{Corrig.} & "
        "\\textbf{Corretos} & \\textbf{Recup.} & \\textbf{Precisão}",
        "\n".join(linhas),
        "Resultados detalhados do experimento por cenário",
        "tab:resultados")


def tabela_tipos(dados):
    """Os mesmos casos reagrupados pela natureza do elemento procurado."""
    limiar = dados.get("threshold", 0.50)
    margem = dados.get("margin", 0.005)
    linhas = []
    for prefixo, rotulo in TIPOS:
        casos = [r for r in dados["resultados"]
                 if re.match(r"[a-z]+", r["key"]).group(0) == prefixo]
        m = summarize(casos, limiar, margem)
        if not m["quebrados"]:
            continue
        linhas.append(
            f"    {rotulo:<21} & {m['quebrados']} & {m['corrigidos']} & "
            f"{m['corretos']} & {br(m['taxa_recuperacao'])} & "
            f"{br(m['precisao'])} \\\\")
    return moldura(
        "l c c c c c",
        "\\textbf{Tipo de elemento} & \\textbf{Quebr.} & \\textbf{Corrig.} & "
        "\\textbf{Corretos} & \\textbf{Recup.} & \\textbf{Precisão}",
        "\n".join(linhas),
        "Desempenho por tipo de elemento, somados os quatro cenários",
        "tab:tipos")


def coordenadas(dados):
    """As duas linhas de coordenadas do grafico de barras."""
    rec, pre = [], []
    for chave, rotulo in ROTULOS.items():
        m = dados["por_cenario"].get(chave)
        if not m:
            continue
        rec.append(f"({rotulo},{m['taxa_recuperacao']})")
        pre.append(f"({rotulo},{m['precisao']})")
    g = dados["global"]
    rec.append(f"(Global,{g['taxa_recuperacao']})")
    pre.append(f"(Global,{g['precisao']})")
    return ("\\addplot+[fill=gray!55, draw=black] coordinates {\n  "
            + " ".join(rec) + "};\n\\addlegendentry{Taxa de recuperação}\n"
            "\\addplot+[fill=gray!20, draw=black] coordinates {\n  "
            + " ".join(pre) + "};\n\\addlegendentry{Precisão}")


def texto_corrido(dados):
    """Os numeros que aparecem no corpo do texto, para conferencia."""
    g = dados["global"]
    sem = next((r for r in dados.get("calibracao_margem", [])
                if r["margem"] == 0), None)
    adotado = next((r for r in dados.get("calibracao_margem", [])
                    if abs(r["margem"] - dados.get("margin", 0.005)) < 1e-9), None)
    props = dados.get("propriedades")
    linhas = [
        f"propriedades comparadas .... {len(props) if props else 'nao registrado'}",
        f"limiar adotado ............. {dados.get('threshold')}",
        f"margem adotada ............. {dados.get('margin')}",
        f"quebrados .................. {g['quebrados']}",
        f"corrigidos (aplicadas) ..... {g['corrigidos']}",
        f"corretos ................... {g['corretos']}",
        f"taxa de recuperacao ........ {g['taxa_recuperacao']}%",
        f"precisao ................... {g['precisao']}%",
        f"tempo medio ................ {g['tempo_medio_ms']} ms",
        f"nao recuperados ............ {g['nao_recuperados']}",
    ]
    if sem and adotado:
        linhas += [
            "",
            "efeito da rejeicao por ambiguidade:",
            f"  sem margem  -> recuperacao {sem['taxa_recuperacao']}%  "
            f"precisao {sem['precisao']}%  incorretas {sem['incorretos']}",
            f"  com margem  -> recuperacao {adotado['taxa_recuperacao']}%  "
            f"precisao {adotado['precisao']}%  incorretas {adotado['incorretos']}",
            f"  custo em recuperacao ..... "
            f"{sem['taxa_recuperacao'] - adotado['taxa_recuperacao']:.1f} pontos",
            f"  ganho em precisao ........ "
            f"{adotado['precisao'] - sem['precisao']:.1f} pontos",
            f"  incorretas eliminadas .... {sem['incorretos'] - adotado['incorretos']}",
        ]
    for densidade, m in dados.get("por_densidade", {}).items():
        linhas.append(f"densidade {densidade:>2} ............... "
                      f"recuperacao {m['taxa_recuperacao']}%  "
                      f"precisao {m['precisao']}%")
    return "\n".join(linhas)


SECOES = (
    ("NUMEROS DO TEXTO CORRIDO", texto_corrido),
    ("TABELA — EFEITO DA MARGEM  (substitui tab:calibracao)", tabela_calibracao),
    ("TABELA — POR CENARIO  (substitui tab:resultados)", tabela_cenarios),
    ("TABELA — POR TIPO DE ELEMENTO  (substitui tab:tipos)", tabela_tipos),
    ("GRAFICO — coordenadas para um \\addplot, se o grafico for incluido", coordenadas),
)


def main():
    if not DADOS.exists():
        print(f"{DADOS} nao encontrado. Rode antes: make experimento")
        return 1
    dados = json.loads(DADOS.read_text(encoding="utf-8"))
    for titulo, funcao in SECOES:
        print("=" * 74)
        print(f"  {titulo}")
        print("=" * 74)
        print(funcao(dados))
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
