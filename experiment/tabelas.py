"""Gera as tabelas e o grafico do artigo a partir de .selfheal/experimento.json.

Transcrever numero a numero de um JSON para o LaTeX e onde os erros de
digitacao aparecem — e onde ninguem os procura depois. Este script emite os
blocos prontos para colar, de modo que o texto e o experimento nao possam
divergir silenciosamente.

    PYTHONPATH=packages/selfheal python3 experiment/tabelas.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DADOS = ROOT / ".selfheal" / "experimento.json"

ROTULOS = {"c1": "C1", "c2": "C2", "c3": "C3", "c4": "C4"}


def br(valor, casas=1, sufixo="\\%"):
    """Numero no formato brasileiro, com virgula decimal."""
    return f"{valor:.{casas}f}".replace(".", "{,}") + sufixo


def tabela_calibracao(dados: dict) -> str:
    linhas = []
    for r in dados.get("calibracao_margem", []):
        margem = r["margem"]
        rotulo = "0 (Similo original)" if margem == 0 else br(margem, 3, "")
        linhas.append(
            f"    {rotulo:<19}& {br(r['taxa_recuperacao'])} & "
            f"{br(r['precisao'])} & {r['incorretos']} \\\\")
    return """\\begin{table}[H]
\\begin{center}
\\caption{Efeito da margem de ambiguidade sobre recuperação e precisão}
\\vspace{-0.2cm}
    \\begin{center}
    \\label{tab:calibracao}
    \\begin{tabular}{c c c c}
    \\hline
    \\textbf{Margem $\\delta$} & \\textbf{Recuperação} & \\textbf{Precisão} & \\textbf{Correções incorretas} \\\\
    \\hline
""" + "\n".join(linhas) + """
    \\hline
    \\end{tabular}
  \\end{center}
\\end{center}
\\vspace{-0.2cm}
\\hspace{1cm}\\footnotesize Fonte: Elaborado pelo autor.
\\end{table}"""


def tabela_cenarios(dados: dict) -> str:
    linhas = []
    for chave, rotulo in ROTULOS.items():
        m = dados["por_cenario"].get(chave)
        if not m:
            continue
        linhas.append(
            f"    {rotulo:<7}& {m['quebrados']} & {m['corrigidos']} & "
            f"{m['corretos']} & {br(m['taxa_recuperacao'])} & {br(m['precisao'])} \\\\")
    g = dados["global"]
    global_ = (f"    Global & {g['quebrados']} & {g['corrigidos']} & "
               f"{g['corretos']} & {br(g['taxa_recuperacao'])} & {br(g['precisao'])} \\\\")
    return """\\begin{table}[H]
\\begin{center}
\\caption{Resultados detalhados do experimento por cenário}
\\vspace{-0.2cm}
    \\begin{center}
    \\label{tab:resultados}
    \\begin{tabular}{c c c c c c}
    \\hline
    \\textbf{Cenário} & \\textbf{Quebrados} & \\textbf{Corrigidos} & \\textbf{Corretos} & \\textbf{Recuperação} & \\textbf{Precisão} \\\\
    \\hline
""" + "\n".join(linhas) + """
    \\hline
""" + global_ + """
    \\hline
    \\end{tabular}
  \\end{center}
\\end{center}
\\vspace{-0.2cm}
\\hspace{1cm}\\footnotesize Fonte: Elaborado pelo autor.
\\end{table}"""


def coordenadas(dados: dict) -> str:
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
    return (f"\\addplot+[fill=gray!55, draw=black] coordinates {{\n  "
            + " ".join(rec) + "};\n\\addlegendentry{Taxa de recuperação}\n"
            f"\\addplot+[fill=gray!20, draw=black] coordinates {{\n  "
            + " ".join(pre) + "};\n\\addlegendentry{Precisão}")


def texto_corrido(dados: dict) -> str:
    """Os numeros que aparecem no corpo do texto, para conferencia."""
    g = dados["global"]
    sem = next((r for r in dados.get("calibracao_margem", []) if r["margem"] == 0), None)
    adotado = next((r for r in dados.get("calibracao_margem", [])
                    if abs(r["margem"] - dados.get("margin", 0.005)) < 1e-9), None)
    linhas = [
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
                      f"recuperacao {m['taxa_recuperacao']}%  precisao {m['precisao']}%")
    return "\n".join(linhas)


def main() -> int:
    if not DADOS.exists():
        print(f"{DADOS} nao encontrado. Rode antes: python3 experiment/harness.py")
        return 1
    dados = json.loads(DADOS.read_text(encoding="utf-8"))

    print("=" * 74)
    print("  NUMEROS DO TEXTO CORRIDO")
    print("=" * 74)
    print(texto_corrido(dados))
    print()
    print("=" * 74)
    print("  TABELA — EFEITO DA MARGEM  (substitui tab:calibracao)")
    print("=" * 74)
    print(tabela_calibracao(dados))
    print()
    print("=" * 74)
    print("  TABELA — POR CENARIO  (substitui tab:resultados)")
    print("=" * 74)
    print(tabela_cenarios(dados))
    print()
    print("=" * 74)
    print("  GRAFICO — coordenadas  (substitui os dois \\addplot de fig:recuperacao)")
    print("=" * 74)
    print(coordenadas(dados))
    return 0


if __name__ == "__main__":
    sys.exit(main())
