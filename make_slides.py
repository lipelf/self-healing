"""Gera a apresentacao de defesa no padrao UNESC do modelo fornecido."""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import random

W, H = Inches(13.333), Inches(7.5)
PRETO = RGBColor(0x11, 0x18, 0x27)
CINZA = RGBColor(0x6B, 0x72, 0x80)
CINZA_CLARO = RGBColor(0xD1, 0xD5, 0xDB)
BRANCO = RGBColor(0xFF, 0xFF, 0xFF)
AZUL = RGBColor(0x25, 0x63, 0xEB)
VERDE = RGBColor(0x05, 0x96, 0x69)
VERM = RGBColor(0xDC, 0x26, 0x26)
FUNDO = RGBColor(0xF3, 0xF4, 0xF6)

SECOES = ["Introdução", "Objetivos", "Justificativa", "Fundamentação",
          "Trabalhos Correlatos", "Materiais e Métodos", "Ferramenta",
          "Resultados", "Conclusão"]

SIDEBAR_W = Inches(2.45)
prs = Presentation()
prs.slide_width, prs.slide_height = W, H


def fundo_geometrico(slide, semente=1, n=13):
    """Padrao sutil de quadrados, no espirito do modelo institucional."""
    rnd = random.Random(semente)
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    bg.fill.solid(); bg.fill.fore_color.rgb = FUNDO; bg.line.fill.background()
    bg.shadow.inherit = False
    for _ in range(n):
        s = Inches(rnd.uniform(0.5, 1.6))
        x = Inches(rnd.uniform(9.6, 13.1)); y = Inches(rnd.uniform(0, 6.9))
        sq = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, s, s)
        tom = rnd.choice([0xEC, 0xEF, 0xF1])
        sq.fill.solid(); sq.fill.fore_color.rgb = RGBColor(tom, tom, tom + 2)
        sq.line.fill.background(); sq.shadow.inherit = False


def caixa(slide, x, y, w, h, texto, tam=18, cor=PRETO, negrito=False,
          align=PP_ALIGN.LEFT, italico=False, espaco=8):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame; tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    linhas = texto.split("\n") if isinstance(texto, str) else texto
    for i, linha in enumerate(linhas):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = linha; p.alignment = align
        p.space_after = Pt(espaco)
        for r in p.runs:
            r.font.size = Pt(tam); r.font.color.rgb = cor
            r.font.bold = negrito; r.font.italic = italico
            r.font.name = "Verdana"
    return tb


def sidebar(slide, ativa):
    """Menu lateral de navegacao, destacando a secao corrente."""
    borda = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                   Inches(0.22), Inches(0.22),
                                   SIDEBAR_W, H - Inches(0.44))
    borda.fill.solid(); borda.fill.fore_color.rgb = BRANCO
    borda.line.color.rgb = CINZA_CLARO; borda.line.width = Pt(1)
    borda.shadow.inherit = False
    borda.adjustments[0] = 0.06

    y = Inches(0.5)
    for s in SECOES:
        atual = (s == ativa)
        tb = slide.shapes.add_textbox(Inches(0.42), y, SIDEBAR_W - Inches(0.4), Inches(0.62))
        tf = tb.text_frame; tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]; p.text = s
        r = p.runs[0]
        r.font.size = Pt(12.5)
        r.font.bold = atual
        r.font.color.rgb = PRETO if atual else RGBColor(0x9C, 0xA3, 0xAF)
        r.font.name = "Verdana"
        y += Inches(0.78 if len(s) > 18 else 0.62)


def titulo(slide, texto):
    caixa(slide, SIDEBAR_W + Inches(0.6), Inches(0.42),
          W - SIDEBAR_W - Inches(1.1), Inches(1.0), texto.upper(),
          tam=27, negrito=True, align=PP_ALIGN.CENTER)


def novo(secao, tit):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    fundo_geometrico(s, semente=len(prs.slides.__iter__.__self__._sldIdLst) + 7)
    sidebar(s, secao); titulo(s, tit)
    return s


def bullets(slide, itens, tam=17, topo=1.65, espaco=17):
    x = SIDEBAR_W + Inches(0.75); y = Inches(topo)
    for it in itens:
        marca = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, y + Inches(0.09),
                                       Inches(0.11), Inches(0.11))
        marca.fill.solid(); marca.fill.fore_color.rgb = AZUL
        marca.line.fill.background(); marca.shadow.inherit = False
        tb = caixa(slide, x + Inches(0.28), y, W - SIDEBAR_W - Inches(1.75),
                   Inches(0.5), it, tam=tam)
        linhas = 1 + len(it) // 58
        y += Inches(0.42 * linhas + 0.18)


def imagem(slide, caminho, topo=1.6, altura=4.55, fonte="Fonte: Do autor."):
    from PIL import Image
    iw, ih = Image.open(caminho).size
    alt = Inches(altura); larg = Emu(int(alt * iw / ih))
    max_larg = W - SIDEBAR_W - Inches(1.3)
    if larg > max_larg:
        larg = max_larg; alt = Emu(int(larg * ih / iw))
    cx = SIDEBAR_W + Inches(0.55) + (W - SIDEBAR_W - Inches(1.1) - larg) / 2
    slide.shapes.add_picture(caminho, cx, Inches(topo), larg, alt)
    if fonte:
        caixa(slide, cx, Inches(topo) + alt + Inches(0.08), larg, Inches(0.3),
              fonte, tam=10, cor=CINZA)


def destaque(slide, valor, rotulo, x, y, cor=AZUL, larg=2.7):
    cx = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y,
                                Inches(larg), Inches(1.35))
    cx.fill.solid(); cx.fill.fore_color.rgb = BRANCO
    cx.line.color.rgb = CINZA_CLARO; cx.shadow.inherit = False
    cx.adjustments[0] = 0.08
    caixa(slide, x, y + Inches(0.2), Inches(larg), Inches(0.6), valor,
          tam=30, negrito=True, cor=cor, align=PP_ALIGN.CENTER)
    caixa(slide, x, y + Inches(0.85), Inches(larg), Inches(0.4), rotulo,
          tam=11.5, cor=CINZA, align=PP_ALIGN.CENTER)


def tabela(slide, dados, x, y, larg, alt, tam=13):
    linhas, cols = len(dados), len(dados[0])
    shape = slide.shapes.add_table(linhas, cols, x, y, larg, alt)
    t = shape.table
    for i, linha in enumerate(dados):
        for j, val in enumerate(linha):
            c = t.cell(i, j); c.text = str(val)
            c.vertical_anchor = MSO_ANCHOR.MIDDLE
            c.margin_left = c.margin_right = Inches(0.08)
            for p in c.text_frame.paragraphs:
                p.alignment = PP_ALIGN.CENTER if j > 0 else PP_ALIGN.LEFT
                for r in p.runs:
                    r.font.size = Pt(tam); r.font.name = "Verdana"
                    r.font.bold = (i == 0)
                    r.font.color.rgb = BRANCO if i == 0 else PRETO
            c.fill.solid()
            c.fill.fore_color.rgb = (PRETO if i == 0
                                     else (BRANCO if i % 2 else RGBColor(0xF9,0xFA,0xFB)))
    return t

# =====================================================================
# 1. CAPA
# =====================================================================
s = prs.slides.add_slide(prs.slide_layouts[6])
bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
bg.fill.solid(); bg.fill.fore_color.rgb = RGBColor(0xEC, 0xFD, 0xF5)
bg.line.fill.background(); bg.shadow.inherit = False
rnd = random.Random(3)
for _ in range(18):
    sz = Inches(rnd.uniform(0.6, 2.0))
    sq = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(rnd.uniform(-0.5, 13)),
                            Inches(rnd.uniform(-0.5, 7)), sz, sz)
    g = rnd.choice([0xD1, 0xDC, 0xE4, 0xC8])
    sq.fill.solid(); sq.fill.fore_color.rgb = RGBColor(g, 0xF0, 0xDE)
    sq.line.fill.background(); sq.shadow.inherit = False

faixa = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(1.85), W, Inches(3.75))
faixa.fill.solid(); faixa.fill.fore_color.rgb = BRANCO
faixa.line.fill.background(); faixa.shadow.inherit = False
faixa.fill.transparency = 0.12

caixa(s, Inches(0.9), Inches(0.45), Inches(6), Inches(0.5),
      "UNIVERSIDADE DO EXTREMO SUL CATARINENSE", tam=13, negrito=True, cor=VERDE)
caixa(s, Inches(0.9), Inches(0.85), Inches(6), Inches(0.4),
      "Curso de Ciência da Computação", tam=12.5, cor=CINZA)

caixa(s, Inches(0.9), Inches(2.15), Inches(11.5), Inches(2.4),
      "USO DE TÉCNICAS DE MACHINE LEARNING NA\n"
      "ADAPTAÇÃO AUTOMÁTICA DE TESTES AUTOMATIZADOS\n"
      "PARA SISTEMAS WEB E DESENVOLVIMENTO DE UM\n"
      "PROTÓTIPO DE SELF-HEALING",
      tam=23, negrito=True, espaco=4)

linha = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.95), Inches(4.5),
                           Inches(2.2), Inches(0.05))
linha.fill.solid(); linha.fill.fore_color.rgb = VERDE
linha.line.fill.background(); linha.shadow.inherit = False

caixa(s, Inches(0.95), Inches(4.75), Inches(8), Inches(1.3),
      "Luiz Fellipe Rocha dos Santos\n"
      "Luiz Ricardo Fiera, Orientador",
      tam=16, espaco=6)
caixa(s, Inches(0.95), Inches(6.55), Inches(8), Inches(0.4),
      "Criciúma, 2026", tam=13, cor=CINZA)

# =====================================================================
# 2. INTRODUÇÃO
# =====================================================================
s = novo("Introdução", "Introdução")
bullets(s, [
    "Aplicações web são o principal meio de acesso a serviços digitais;",
    "Testes end-to-end simulam o fluxo real do usuário e são padrão nos pipelines;",
    "Eles dependem de seletores que apontam para elementos específicos da página;",
    "Toda mudança de interface quebra esses seletores — sem que exista defeito real;",
    "Equipes gastam de 22% a 28% da capacidade corrigindo testes obsoletos.",
])
caixa(s, SIDEBAR_W + Inches(0.75), Inches(5.7), Inches(9.4), Inches(0.5),
      "(DACHEPELLY, 2025; RICCIO et al., 2020)", tam=12, cor=CINZA, italico=True)

# =====================================================================
# 3. PROBLEMA
# =====================================================================
s = novo("Introdução", "O Problema")
caixa(s, SIDEBAR_W + Inches(0.75), Inches(1.6), Inches(9.4), Inches(0.6),
      "Um botão renomeado quebra o teste, mesmo sem regressão no sistema:",
      tam=16)
cod = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, SIDEBAR_W + Inches(0.75),
                         Inches(2.35), Inches(9.4), Inches(1.75))
cod.fill.solid(); cod.fill.fore_color.rgb = RGBColor(0x1F, 0x29, 0x37)
cod.line.fill.background(); cod.shadow.inherit = False
caixa(s, SIDEBAR_W + Inches(1.05), Inches(2.6), Inches(8.8), Inches(1.4),
      'await page.click("#btn-entrar");        // v1  → teste verde\n'
      'await page.click("#btn-entrar");        // v2  → ELEMENTO NÃO ENCONTRADO\n'
      '                                        //      o id virou "e1vm4v1"',
      tam=13.5, cor=RGBColor(0xE5, 0xE7, 0xEB), espaco=4)
bullets(s, [
    "A correção é manual, repetitiva e não agrega valor ao produto;",
    "Equipes chegam a desativar testes de interface para escapar do retrabalho;",
    "O custo não é só de horas: corrói a própria cobertura de testes.",
], topo=4.45)

# =====================================================================
# 4. OBJETIVO GERAL
# =====================================================================
s = novo("Objetivos", "Objetivo Geral")
cx = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, SIDEBAR_W + Inches(0.75),
                        Inches(2.3), Inches(9.4), Inches(2.2))
cx.fill.solid(); cx.fill.fore_color.rgb = BRANCO
cx.line.color.rgb = VERDE; cx.line.width = Pt(2); cx.shadow.inherit = False
caixa(s, SIDEBAR_W + Inches(1.15), Inches(2.75), Inches(8.6), Inches(1.6),
      "Investigar a aplicação de técnicas de machine learning na adaptação "
      "automática de testes automatizados em sistemas web, propondo e avaliando "
      "um protótipo baseado no algoritmo de similaridade Similo.",
      tam=19)

# =====================================================================
# 5. OBJETIVOS ESPECÍFICOS
# =====================================================================
s = novo("Objetivos", "Objetivos Específicos")
bullets(s, [
    "a) analisar as limitações dos testes automatizados frente a mudanças de interface;",
    "b) identificar técnicas de machine learning aplicáveis à adaptação de testes;",
    "c) implementar a rejeição por ambiguidade como extensão do algoritmo;",
    "d) propor um protótipo capaz de corrigir permanentemente o código do teste;",
    "e) avaliar a ferramenta por experimento controlado, medindo a taxa de recuperação.",
], tam=16.5)

# =====================================================================
# 6. JUSTIFICATIVA
# =====================================================================
s = novo("Justificativa", "Justificativa")
bullets(s, [
    "Vivência profissional do autor em garantia de qualidade;",
    "Bastava o dev trocar um id ou classe para o roteiro quebrar;",
    "Cada seletor tinha de ser reencontrado manualmente, um a um;",
    "Ferramentas abertas recuperam o teste só em tempo de execução;",
    "Soluções permanentes são comerciais, fechadas e não auditáveis.",
], tam=16.5)

# =====================================================================
# 7. FUNDAMENTAÇÃO — SELF-HEALING
# =====================================================================
s = novo("Fundamentação", "Self-Healing de Testes")
bullets(s, [
    "O teste detecta que o seletor falhou e aciona a recuperação sozinho;",
    "Em vez de uma regra fixa, o elemento é reconhecido por múltiplos atributos;",
    "Texto visível, atributos HTML, posição na tela e hierarquia no DOM;",
    "As propriedades são combinadas em uma pontuação ponderada de similaridade.",
], tam=16.5)
caixa(s, SIDEBAR_W + Inches(0.75), Inches(4.75), Inches(9.4), Inches(0.5),
      "(STOCCO et al., 2023; KLUGE; STOCCO, 2025)", tam=12, cor=CINZA, italico=True)

# =====================================================================
# 8. TRABALHOS CORRELATOS
# =====================================================================
s = novo("Trabalhos Correlatos", "Trabalhos Correlatos")
tabela(s, [
    ["Trabalho", "Abordagem", "Limitação"],
    ["Santos et al. (2025)", "Revisão de ML em teste", "Foco na criação do teste"],
    ["Júnior e Neves (2025)", "GenIA-E2ETest (LLM)", "Localizadores frágeis"],
    ["Camargo (2024)", "Mapeamento de testes web", "Só 16% usam IA"],
    ["Kluge e Stocco (2025)", "Similo / VON Similo", "Não corrige o código"],
    ["Joseph et al. (2025)", "LLM + Selenium", "Custo e dependência externa"],
    ["Ibañez Neto et al. (2026)", "Mabl (comercial)", "Caixa-preta, sem auditoria"],
], SIDEBAR_W + Inches(0.7), Inches(1.65), Inches(9.5), Inches(3.6), tam=13)
caixa(s, SIDEBAR_W + Inches(0.75), Inches(5.5), Inches(9.4), Inches(0.9),
      "Lacuna: nenhuma ferramenta aberta combina relocalização por similaridade "
      "com correção permanente do código do teste.", tam=15, negrito=True, cor=VERM)

# =====================================================================
# 9. MATERIAIS E MÉTODOS
# =====================================================================
s = novo("Materiais e Métodos", "Materiais e Métodos")
bullets(s, [
    "Pesquisa aplicada e exploratória, de abordagem quantitativa;",
    "Etapa 1 — revisão bibliográfica e escolha fundamentada do algoritmo;",
    "Etapa 2 — desenvolvimento do protótipo (engine, suíte E2E e painel);",
    "Etapa 3 — calibração do limiar e da margem de ambiguidade;",
    "Etapa 4 — experimento controlado com quatro cenários de mudança.",
], tam=16.5)

# =====================================================================
# 10. FERRAMENTAS UTILIZADAS
# =====================================================================
s = novo("Materiais e Métodos", "Tecnologias Utilizadas")
tabela(s, [
    ["Componente", "Tecnologia", "Função"],
    ["Engine", "Python 3.11", "Algoritmo Similo e reescrita do código"],
    ["Extração do DOM", "Playwright + Chromium", "Atributos e geometria dos elementos"],
    ["Aplicação alvo", "Next.js 14 + React 18", "Site de demonstração controlado"],
    ["Suíte de testes", "TypeScript + Playwright", "Testes end-to-end"],
    ["Painel de revisão", "React / Next.js", "Aceite ou rejeição das correções"],
    ["Distribuição", "Pacote pip", "Instalável no projeto do usuário"],
], SIDEBAR_W + Inches(0.7), Inches(1.7), Inches(9.5), Inches(3.6), tam=13)

# =====================================================================
# 11. ALGORITMO SIMILO
# =====================================================================
s = novo("Materiais e Métodos", "Algoritmo Similo")
caixa(s, SIDEBAR_W + Inches(0.75), Inches(1.55), Inches(9.4), Inches(0.5),
      "Pontuação de similaridade entre o elemento buscado e cada candidato:", tam=15.5)
eq = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, SIDEBAR_W + Inches(2.1),
                        Inches(2.1), Inches(6.6), Inches(1.0))
eq.fill.solid(); eq.fill.fore_color.rgb = BRANCO
eq.line.color.rgb = CINZA_CLARO; eq.shadow.inherit = False
caixa(s, SIDEBAR_W + Inches(2.1), Inches(2.38), Inches(6.6), Inches(0.6),
      "S(c, t)  =  Σ ( wj × simj(cj, tj) )  ⁄  Σ wj",
      tam=21, negrito=True, align=PP_ALIGN.CENTER)
tabela(s, [
    ["Peso 1,5 — âncoras semânticas", "Peso 0,5 — âncoras estruturais"],
    ["texto visível", "tag HTML"],
    ["texto dos vizinhos", "classes CSS"],
    ["atributo id", "xpath e idxpath"],
    ["atributo name", "posição, área e proporção"],
], SIDEBAR_W + Inches(0.9), Inches(3.45), Inches(9.1), Inches(2.2), tam=13.5)
caixa(s, SIDEBAR_W + Inches(0.75), Inches(5.85), Inches(9.4), Inches(0.5),
      "Adaptado de Kluge e Stocco (2025).", tam=11.5, cor=CINZA)

# =====================================================================
# 12. ARQUITETURA
# =====================================================================
s = novo("Ferramenta", "Arquitetura da Ferramenta")


def bloco(slide, x, y, w, h, titulo_txt, sub, cor=AZUL):
    b = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    b.fill.solid(); b.fill.fore_color.rgb = BRANCO
    b.line.color.rgb = cor; b.line.width = Pt(1.75); b.shadow.inherit = False
    caixa(slide, x, y + Inches(0.16), w, Inches(0.4), titulo_txt,
          tam=13.5, negrito=True, align=PP_ALIGN.CENTER)
    caixa(slide, x, y + Inches(0.56), w, Inches(0.35), sub,
          tam=10.5, cor=CINZA, align=PP_ALIGN.CENTER, italico=True)
    return b


def seta(slide, x1, y1, x2, y2):
    c = slide.shapes.add_connector(2, x1, y1, x2, y2)
    c.line.color.rgb = CINZA; c.line.width = Pt(1.75)


BW, BH = Inches(2.55), Inches(1.0)
col1 = SIDEBAR_W + Inches(0.75); col2 = col1 + Inches(3.35); col3 = col2 + Inches(3.35)
bloco(s, col1, Inches(1.75), BW, BH, "Suíte E2E", "TypeScript + Playwright")
bloco(s, col2, Inches(1.75), BW, BH, "Captura do DOM", "Playwright + Chromium")
bloco(s, col3, Inches(1.75), BW, BH, "Candidatos", "elementos interativos")
bloco(s, col1, Inches(3.3), BW, BH, "Engine", "Python — Similo", VERDE)
bloco(s, col2, Inches(3.3), BW, BH, "Pontuação", "11 atributos ponderados", VERDE)
bloco(s, col3, Inches(3.3), BW, BH, "Rejeição", "margem de ambiguidade", VERDE)
bloco(s, col1, Inches(4.85), BW, BH, "Reescrita", "arquivo .spec.ts", VERM)
bloco(s, col2, Inches(4.85), BW, BH, "Relatório", "JSON", VERM)
bloco(s, col3, Inches(4.85), BW, BH, "Painel", "aceitar / rejeitar", VERM)
for c in (col1, col2, col3):
    seta(s, c + BW / 2, Inches(2.75), c + BW / 2, Inches(3.3))
    seta(s, c + BW / 2, Inches(4.3), c + BW / 2, Inches(4.85))
caixa(s, SIDEBAR_W + Inches(0.75), Inches(6.15), Inches(9.4), Inches(0.5),
      "A correção é gravada no arquivo de teste: o seletor obsoleto não volta a falhar.",
      tam=14, negrito=True, align=PP_ALIGN.CENTER)

# =====================================================================
# 13. APLICAÇÃO DE DEMONSTRAÇÃO
# =====================================================================
s = novo("Ferramenta", "Aplicação de Demonstração")
caixa(s, SIDEBAR_W + Inches(0.75), Inches(1.5), Inches(9.4), Inches(0.5),
      "Loja em Next.js com 44 elementos interativos e 5 fluxos.", tam=15.5)
imagem(s, "shots/catalogo.png", topo=2.05, altura=4.3)

# =====================================================================
# 14. CENÁRIOS DE MUDANÇA
# =====================================================================
s = novo("Materiais e Métodos", "Cenários de Mudança")
tabela(s, [
    ["Cenário", "Alteração aplicada", "Âncoras destruídas"],
    ["C1", "Renomeação do id (hash opaco)", "id"],
    ["C2", "C1 + classes CSS + reposicionamento", "id, classe, posição"],
    ["C3", "C2 + atributo name", "id, classe, posição, name"],
    ["C4", "C3 + reestruturação e reordenação", "todas, exceto o texto"],
], SIDEBAR_W + Inches(0.7), Inches(1.7), Inches(9.5), Inches(2.5), tam=13.5)
bullets(s, [
    "Mutações geradas por script: reprodutíveis e com gabarito prévio;",
    "512 seletores invalidados, em duas densidades de página (44 e 84 elementos);",
    "Identificadores opacos reproduzem o que CSS Modules gera a cada build.",
], topo=4.5, tam=15.5)

# =====================================================================
# 15. DEMONSTRAÇÃO — O CICLO COMPLETO
# =====================================================================
s = novo("Ferramenta", "Demonstração: o Ciclo Completo")
passos = [
    ("1", "Suíte executa na interface original", "5 testes passando", VERDE),
    ("2", "Mudança de interface é aplicada", "5 testes falhando", VERM),
    ("3", "Engine recupera e reescreve o código", "24 seletores corrigidos", AZUL),
    ("4", "Suíte executa novamente", "5 testes passando", VERDE),
]
y = Inches(1.75)
for num, desc, res, cor in passos:
    circ = s.shapes.add_shape(MSO_SHAPE.OVAL, SIDEBAR_W + Inches(0.8), y,
                              Inches(0.62), Inches(0.62))
    circ.fill.solid(); circ.fill.fore_color.rgb = cor
    circ.line.fill.background(); circ.shadow.inherit = False
    caixa(s, SIDEBAR_W + Inches(0.8), y + Inches(0.13), Inches(0.62), Inches(0.4),
          num, tam=17, negrito=True, cor=BRANCO, align=PP_ALIGN.CENTER)
    caixa(s, SIDEBAR_W + Inches(1.65), y + Inches(0.02), Inches(5.3), Inches(0.5),
          desc, tam=16)
    tag = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                             SIDEBAR_W + Inches(7.1), y + Inches(0.02),
                             Inches(2.9), Inches(0.55))
    tag.fill.solid(); tag.fill.fore_color.rgb = BRANCO
    tag.line.color.rgb = cor; tag.shadow.inherit = False
    caixa(s, SIDEBAR_W + Inches(7.1), y + Inches(0.16), Inches(2.9), Inches(0.4),
          res, tam=13, negrito=True, cor=cor, align=PP_ALIGN.CENTER)
    y += Inches(1.02)
caixa(s, SIDEBAR_W + Inches(0.8), Inches(6.0), Inches(9.3), Inches(0.6),
      "Tempo total do reparo: 0,4 segundo para os 24 seletores.",
      tam=15, negrito=True, align=PP_ALIGN.CENTER)

# =====================================================================
# 16. PAINEL DE REVISÃO
# =====================================================================
s = novo("Ferramenta", "Painel de Revisão")
caixa(s, SIDEBAR_W + Inches(0.75), Inches(1.48), Inches(9.4), Inches(0.5),
      "Cada correção mostra a pontuação e a contribuição de cada propriedade.",
      tam=15)
imagem(s, "shots/dashboard.png", topo=2.0, altura=4.35)

# =====================================================================
# 17. RESULTADOS — CALIBRAÇÃO
# =====================================================================
s = novo("Resultados", "Calibração do Limiar")
imagem(s, "charts/calibracao.png", topo=1.6, altura=4.2)
caixa(s, SIDEBAR_W + Inches(0.75), Inches(6.05), Inches(9.4), Inches(0.6),
      "Limiar sozinho não resolve: baixá-lo eleva a recuperação, mas derruba a precisão.",
      tam=14.5, negrito=True, align=PP_ALIGN.CENTER)

# =====================================================================
# 18. RESULTADOS — POR CENÁRIO
# =====================================================================
s = novo("Resultados", "Recuperação por Cenário")
imagem(s, "charts/cenarios.png", topo=1.55, altura=4.15)
caixa(s, SIDEBAR_W + Inches(0.75), Inches(6.0), Inches(9.4), Inches(0.7),
      "A recuperação é robusta enquanto sobrevive uma âncora semântica; "
      "degrada quando todas desaparecem.", tam=14.5, negrito=True,
      align=PP_ALIGN.CENTER)

# =====================================================================
# 19. RESULTADOS — CONTRIBUIÇÃO
# =====================================================================
s = novo("Resultados", "Extensão Proposta")
caixa(s, SIDEBAR_W + Inches(0.75), Inches(1.5), Inches(9.4), Inches(0.55),
      "Quando o 1º e o 2º colocado empatam, não há evidência para escolher: "
      "a ferramenta se abstém.", tam=15)
imagem(s, "charts/contribuicao.png", topo=2.1, altura=3.55)
caixa(s, SIDEBAR_W + Inches(0.75), Inches(6.0), Inches(9.4), Inches(0.6),
      "Correções incorretas caem de 69 para 19 — redução de 72%.",
      tam=15.5, negrito=True, cor=VERDE, align=PP_ALIGN.CENTER)

# =====================================================================
# 20. RESULTADOS — NÚMEROS GERAIS
# =====================================================================
s = novo("Resultados", "Resultados Gerais")
x0 = SIDEBAR_W + Inches(0.75)
destaque(s, "77,1%", "Taxa de recuperação", x0, Inches(1.8), AZUL, 2.2)
destaque(s, "95,4%", "Precisão", x0 + Inches(2.4), Inches(1.8), VERDE, 2.2)
destaque(s, "27 ms", "Por recuperação", x0 + Inches(4.8), Inches(1.8), AZUL, 2.2)
destaque(s, "512", "Seletores testados", x0 + Inches(7.2), Inches(1.8), CINZA, 2.2)
tabela(s, [
    ["Cenário", "Quebrados", "Corrigidos", "Corretos", "Recuperação", "Precisão"],
    ["C1", "128", "112", "112", "87,5%", "100,0%"],
    ["C2", "128", "112", "112", "87,5%", "100,0%"],
    ["C3", "128", "103", "99", "77,3%", "96,1%"],
    ["C4", "128", "87", "72", "56,2%", "82,8%"],
    ["Global", "512", "414", "395", "77,1%", "95,4%"],
], x0 - Inches(0.05), Inches(3.5), Inches(9.5), Inches(2.5), tam=13)

# =====================================================================
# 21. RESULTADOS — TEMPO
# =====================================================================
s = novo("Resultados", "Tempo de Manutenção")
imagem(s, "charts/tempo.png", topo=1.7, altura=3.1)
bullets(s, [
    "Correção manual dos 512 seletores: cerca de 36 horas de trabalho;",
    "Ferramenta: 14 segundos de processamento;",
    "Sobre os não recuperados o esforço manual permanece.",
], topo=5.15, tam=15.5)

# =====================================================================
# 22. DISCUSSÃO
# =====================================================================
s = novo("Resultados", "Discussão")
bullets(s, [
    "Teto de 86,5% de acerto no top-1, coerente com Kluge e Stocco (2025);",
    "Falsos positivos concentram-se em elementos sem âncora semântica;",
    "É o mesmo padrão que os autores relatam no VON Similo;",
    "A rejeição por ambiguidade ataca exatamente esse ponto;",
    "Correção permanente custou menos de 8% do tempo de processamento.",
], tam=16)

# =====================================================================
# 23. LIMITAÇÕES
# =====================================================================
s = novo("Conclusão", "Limitações")
bullets(s, [
    "Aplicação de demonstração: DOM mais raso que o de sistemas reais;",
    "Levantamento com três empresas — não sustenta generalização estatística;",
    "Suporte restrito a TypeScript com Playwright;",
    "Exige ao menos uma execução bem-sucedida para aprender o elemento;",
    "Elementos sem texto nem rótulo permanecem o pior caso.",
], tam=16)

# =====================================================================
# 24. CONCLUSÃO
# =====================================================================
s = novo("Conclusão", "Conclusão")
bullets(s, [
    "A hipótese se confirma: a similaridade recupera testes de forma confiável;",
    "Confiável enquanto sobrevive ao menos uma âncora semântica do elemento;",
    "A contribuição não é a taxa, é a correção permanente do código do teste;",
    "Capacidade ausente nas ferramentas abertas e fechada nas comerciais;",
    "A rejeição por ambiguidade reduziu em 72% as correções incorretas.",
], tam=16)

# =====================================================================
# 25. TRABALHOS FUTUROS
# =====================================================================
s = novo("Conclusão", "Trabalhos Futuros")
bullets(s, [
    "Incorporar a árvore de acessibilidade do DOM como âncora de alto peso;",
    "Avaliar a ferramenta em aplicações de produção;",
    "Usar o contexto de navegação para desambiguar elementos idênticos;",
    "Estender a reescrita para Selenium com C# e Cypress.",
], tam=16.5)

# =====================================================================
# 26. ENCERRAMENTO
# =====================================================================
s = prs.slides.add_slide(prs.slide_layouts[6])
fundo_geometrico(s, semente=99)
caixa(s, Inches(1.2), Inches(2.6), Inches(11), Inches(1.0),
      "OBRIGADO", tam=44, negrito=True, align=PP_ALIGN.CENTER)
caixa(s, Inches(1.2), Inches(3.8), Inches(11), Inches(0.6),
      "Perguntas?", tam=22, cor=CINZA, align=PP_ALIGN.CENTER)
caixa(s, Inches(1.2), Inches(5.2), Inches(11), Inches(0.9),
      "Luiz Fellipe Rocha dos Santos\nluizfrs2004@unesc.net",
      tam=14, cor=CINZA, align=PP_ALIGN.CENTER, espaco=4)

prs.save("Apresentacao_TCC_Luiz_Fellipe.pptx")
print(f"apresentacao gerada com {len(prs.slides.__iter__.__self__._sldIdLst)} slides")
