"""Geracao das figuras do trabalho.

Produz dois conjuntos de imagens:

  shots/codigo/    trechos do codigo que implementam a decisao e a correcao
  shots/variantes/ a mesma regiao da interface sob cada cenario de mudanca

As figuras do codigo sao renderizadas em HTML e capturadas pelo proprio
Chromium, de modo que possam ser regeradas a qualquer momento a partir do
codigo-fonte atual — uma captura feita a mao envelhece silenciosamente.
"""
import html
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
SHOTS = ROOT / "shots"
BASE_URL = "http://127.0.0.1:3000"

# Trecho: (arquivo, rotulo, legenda, primeira linha, ultima linha)
TRECHOS = [
    ("packages/selfheal/selfheal/descriptor.py",
     "descriptor.py — as 11 propriedades comparadas e seus pesos",
     "Cada elemento e descrito por 11 propriedades. Os pesos sao fixos, "
     "definidos a priori (nao aprendidos): as propriedades com carga "
     "semantica pesam 3x mais que as estruturais.",
     7, 26),
    ("packages/selfheal/selfheal/similo.py",
     "similo.py — pontuacao de similaridade ponderada",
     "S(c,t) = soma(w_j * sim_j) / soma(w_j). E a funcao que decide o quanto "
     "um candidato se parece com o elemento que sumiu.",
     79, 89),
    ("packages/selfheal/selfheal/similo.py",
     "similo.py — limiar e rejeicao por ambiguidade",
     "A extensao proposta sobre o Similo: quando o 1o e o 2o colocado "
     "praticamente empatam, a ferramenta se abstem em vez de arriscar.",
     107, 133),
    ("packages/selfheal/selfheal/bridge.py",
     "bridge.py — a decisao durante a execucao da suite",
     "O Playwright ja tem a pagina aberta; cabe ao Python apenas escolher "
     "qual candidato corresponde ao seletor que falhou.",
     58, 100),
    ("packages/selfheal/selfheal/rewriter.py",
     "rewriter.py — a correcao permanente no arquivo de teste",
     "O passo que diferencia a ferramenta: o .spec.ts e efetivamente "
     "alterado, preservando o tipo de aspas usado no arquivo.",
     37, 66),
    ("packages/selfheal-playwright/src/fixture.ts",
     "fixture.ts (e2e) — interceptacao da falha do seletor",
     "No lado do Playwright: a acao falha, a falha e interceptada antes de "
     "derrubar o teste, e o elemento e recuperado em tempo real.",
     157, 188),
    ("packages/selfheal-playwright/src/reporter.ts",
     "reporter.ts (e2e) — o que nao foi corrigido, e onde",
     "Quando a ferramenta se abstem, ela localiza o seletor no codigo e "
     "informa arquivo, linha e o motivo da abstencao.",
     85, 107),
]

PALAVRAS_PY = r"\b(def|class|return|if|not|and|or|for|in|import|from|None|True|False|raise|try|except|with|as|lambda|elif|else)\b"
PALAVRAS_TS = r"\b(const|let|function|return|if|else|for|of|await|async|new|try|catch|throw|import|from|export|interface|type|null|true|false)\b"

CSS = """
* { box-sizing: border-box; }
body { margin: 0; background: #0f1117; font-family: -apple-system, 'Segoe UI', sans-serif; }
.card { width: 1100px; padding: 34px 38px; }
.rotulo { color: #e6edf3; font-size: 21px; font-weight: 650; margin: 0 0 6px; }
.legenda { color: #8b95a5; font-size: 14.5px; line-height: 1.55; margin: 0 0 22px;
           max-width: 850px; }
pre { margin: 0; background: #161b22; border: 1px solid #262d38; border-radius: 10px;
      padding: 22px 24px; overflow: hidden; }
code { font-family: 'SF Mono', Menlo, monospace; font-size: 13.5px; line-height: 1.72;
       color: #c9d1d9; white-space: pre; display: block; }
.ln { color: #4a5261; margin-right: 18px; user-select: none; display: inline-block;
      width: 30px; text-align: right; }
.kw { color: #ff7b72; } .st { color: #a5d6ff; } .cm { color: #6a7480; font-style: italic; }
.fn { color: #d2a8ff; } .nm { color: #79c0ff; }
.rodape { color: #4a5261; font-size: 12.5px; margin-top: 14px; }
"""


def realcar(linha: str, python: bool) -> str:
    """Realce sintatico simples, suficiente para figura de trabalho."""
    escapada = html.escape(linha)
    # Comentario e string primeiro: o que esta dentro deles nao e palavra-chave.
    if python and re.match(r"\s*#", escapada):
        return f'<span class="cm">{escapada}</span>'
    if not python and re.match(r"\s*(//|\*|/\*)", escapada):
        return f'<span class="cm">{escapada}</span>'

    partes = re.split(r'("""[^"]*"""|&quot;[^&]*&quot;|&#x27;[^&]*&#x27;)', escapada)
    saida = []
    for i, parte in enumerate(partes):
        if i % 2:
            classe = "cm" if parte.startswith('"""') else "st"
            saida.append(f'<span class="{classe}">{parte}</span>')
            continue
        parte = re.sub(PALAVRAS_PY if python else PALAVRAS_TS,
                       r'<span class="kw">\1</span>', parte)
        parte = re.sub(r"\b(def|function)</span> (\w+)",
                       r'\1</span> <span class="fn">\2</span>', parte)
        saida.append(parte)
    return "".join(saida)


def figura_codigo(arquivo: str, rotulo: str, legenda: str,
                  ini: int, fim: int) -> str:
    caminho = ROOT / arquivo
    linhas = caminho.read_text(encoding="utf-8").splitlines()[ini - 1:fim]
    python = arquivo.endswith(".py")
    corpo = "".join(
        f'<span class="ln">{ini + i}</span>{realcar(l, python)}\n'
        for i, l in enumerate(linhas))
    return f"""<style>{CSS}</style>
<div class="card">
  <p class="rotulo">{html.escape(rotulo)}</p>
  <p class="legenda">{html.escape(legenda)}</p>
  <pre><code>{corpo}</code></pre>
  <p class="rodape">{html.escape(arquivo)} — linhas {ini}-{fim}</p>
</div>"""


def capturar_codigo(page) -> int:
    destino = SHOTS / "codigo"
    destino.mkdir(parents=True, exist_ok=True)
    for indice, (arquivo, rotulo, legenda, ini, fim) in enumerate(TRECHOS, 1):
        page.set_content(figura_codigo(arquivo, rotulo, legenda, ini, fim))
        nome = f"{indice:02d}-{Path(arquivo).stem}-{ini}.png"
        page.locator(".card").screenshot(path=str(destino / nome))
        print(f"    {nome}")
    return len(TRECHOS)


# -- variantes da interface -----------------------------------------------

REGIOES = {"login": ("/login", "main")}
CENARIOS = ["base", "c1", "c2", "c3", "c4"]
DESCRICAO = {
    "base": "interface original",
    "c1": "id renomeado",
    "c2": "+ classes CSS e reposicionamento",
    "c3": "+ atributo name",
    "c4": "+ reestruturacao e reordenacao",
}


def aplicar(cenario: str) -> None:
    subprocess.run(["node", "scripts/apply-variant.mjs", cenario, "4"],
                   cwd=WEB, check=True, capture_output=True)


def atributos(page) -> list:
    """id e class dos campos da regiao, para a figura comparativa."""
    return page.eval_on_selector_all(
        "main input, main button, main a",
        """els => els.slice(0, 6).map(e => ({
             tag: e.tagName.toLowerCase(),
             id: e.id || '-',
             cls: (e.getAttribute('class') || '-').slice(0, 46),
             txt: (e.textContent || e.placeholder || '').trim().slice(0, 22),
           }))""")


def capturar_variantes(page) -> dict:
    destino = SHOTS / "variantes"
    destino.mkdir(parents=True, exist_ok=True)
    coletado = {}
    for cenario in CENARIOS:
        aplicar(cenario)
        time.sleep(2.5)
        caminho, alvo = REGIOES["login"]
        page.goto(f"{BASE_URL}{caminho}?v={time.time()}", wait_until="networkidle")
        page.wait_for_selector(alvo, timeout=30000)
        nome = f"login-{cenario}.png"
        page.locator(alvo).screenshot(path=str(destino / nome))
        coletado[cenario] = atributos(page)
        print(f"    {nome}  ({DESCRICAO[cenario]})")
    return coletado


def figura_comparativa(coletado: dict) -> str:
    """Tabela: o mesmo campo, com identificadores diferentes a cada cenario."""
    linhas = []
    for cenario in CENARIOS:
        itens = coletado.get(cenario, [])
        for i, el in enumerate(itens):
            rotulo = (f'<td class="cen" rowspan="{len(itens)}">'
                      f'{cenario.upper()}<br><span>{DESCRICAO[cenario]}</span></td>'
                      if i == 0 else "")
            linhas.append(
                f'<tr>{rotulo}<td class="tg">{el["tag"]}</td>'
                f'<td class="tx">{html.escape(el["txt"])}</td>'
                f'<td class="id">{html.escape(el["id"])}</td>'
                f'<td class="cl">{html.escape(el["cls"])}</td></tr>')
    return f"""<style>{CSS}
table {{ border-collapse: collapse; width: 100%; }}
th {{ color: #8b95a5; font-size: 12px; text-transform: uppercase;
      letter-spacing: .06em; text-align: left; padding: 0 12px 10px; font-weight: 600; }}
td {{ padding: 7px 12px; font-family: 'SF Mono', Menlo, monospace; font-size: 12.5px;
      border-top: 1px solid #222934; color: #c9d1d9; vertical-align: top; }}
.cen {{ color: #e6edf3; font-family: -apple-system, sans-serif; font-weight: 650;
        font-size: 14px; border-top: 1px solid #39404d; padding-top: 12px; }}
.cen span {{ color: #6a7480; font-weight: 400; font-size: 12px; }}
.tg {{ color: #ff7b72; }} .tx {{ color: #8b95a5; }}
.id {{ color: #79c0ff; }} .cl {{ color: #a5d6ff; }}
</style>
<div class="card">
  <p class="rotulo">A mesma tela de login sob cada cenario de mudanca</p>
  <p class="legenda">O elemento continua sendo o mesmo para quem usa a
  aplicacao, mas o identificador que o teste usava deixa de existir. E esta
  troca que quebra a suite — e que a ferramenta precisa desfazer.</p>
  <table>
    <tr><th>Cenario</th><th>Tag</th><th>Conteudo</th><th>id</th><th>class</th></tr>
    {''.join(linhas)}
  </table>
</div>"""


def servidor_no_ar() -> bool:
    try:
        urllib.request.urlopen(BASE_URL + "/login", timeout=3)
        return True
    except Exception:
        return False


def main() -> int:
    if not servidor_no_ar():
        print("a aplicacao nao esta no ar. rode 'npm run dev' em web/ e repita.")
        return 1

    with sync_playwright() as pw:
        navegador = pw.chromium.launch()
        page = navegador.new_page(viewport={"width": 1200, "height": 900},
                                  device_scale_factor=2)
        print("\n  figuras do codigo:")
        total = capturar_codigo(page)

        print("\n  figuras da interface:")
        coletado = capturar_variantes(page)

        page.set_content(figura_comparativa(coletado))
        comparativa = SHOTS / "variantes" / "00-comparativo-identificadores.png"
        page.locator(".card").screenshot(path=str(comparativa))
        print(f"    {comparativa.name}")

        aplicar("base")
        navegador.close()

    print(f"\n  {total} figura(s) de codigo em shots/codigo/")
    print(f"  {len(CENARIOS) + 1} figura(s) de interface em shots/variantes/\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
