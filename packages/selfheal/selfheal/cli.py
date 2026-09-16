"""Interface de linha de comando do selfheal."""
import argparse
import csv
import json
import sys
from pathlib import Path

from .knowledge import KnowledgeBase
from .rewriter import rewrite_selector

GREEN, YELLOW, RED = "\033[32m", "\033[33m", "\033[31m"
DIM, BOLD, RESET = "\033[2m", "\033[1m", "\033[0m"


def _load(path: str) -> dict:
    file = Path(path)
    if not file.exists():
        print(f"{RED}relatorio nao encontrado: {path}{RESET}")
        sys.exit(1)
    return json.loads(file.read_text(encoding="utf-8"))


def cmd_report(args) -> None:
    data = _load(args.report)
    s = data["summary"]
    print(f"\n{'='*66}\n  RELATORIO DE SELF-HEALING\n{'='*66}")
    print(f"  Seletores quebrados : {s['total_broken']}")
    print(f"  Recuperados         : {s['total_healed']}")
    print(f"  Taxa de recuperacao : {s['recovery_rate']}%")
    print(f"  Tempo medio         : {s['avg_duration_ms']} ms/correcao")
    print(f"{'='*66}\n")
    for r in data["records"]:
        mark = f"{GREEN}OK {RESET}" if r["healed"] else f"{RED}FALHA{RESET}"
        print(f"  [{mark}] {r['old_selector']}")
        if r["healed"]:
            print(f"        -> {GREEN}{r['new_selector']}{RESET} "
                  f"(score {r['score']:.3f}, {r['status']})")
            if r.get("file"):
                print(f"        {DIM}{r['file']}:{r['line']}{RESET}")
        else:
            print(f"        {YELLOW}sem correcao ({r['status']}, "
                  f"melhor score {r['score']:.3f}){RESET}")
            # Onde corrigir a mao: sem isto, resta procurar o seletor na suite.
            if r.get("file"):
                local = f"{r['file']}:{r['line']}" if r.get("line") else r["file"]
                print(f"        {DIM}corrija em {local}{RESET}")
    print()


def cmd_apply(args) -> None:
    """Aplica no codigo as correcoes aceitas no painel (modo sugestao)."""
    data = _load(args.report)
    applied = 0
    for r in data["records"]:
        if r["healed"] and r["status"] == "accepted" and r.get("file"):
            rewrite_selector(r["file"], r["old_selector"], r["new_selector"])
            r["status"] = "applied"
            applied += 1
            print(f"  {GREEN}aplicado{RESET} {r['old_selector']} -> {r['new_selector']}")
    Path(args.report).write_text(json.dumps(data, indent=2, ensure_ascii=False),
                                 encoding="utf-8")
    print(f"\n{applied} correcao(oes) aplicada(s).\n")


def cmd_bridge(args) -> None:
    from .bridge import main as bridge_main
    bridge_main(["--knowledge", args.knowledge,
                 "--threshold", str(args.threshold),
                 "--margin", str(args.margin)])


def cmd_knowledge(args) -> None:
    kb = KnowledgeBase(args.knowledge)
    print(f"\n  Base de conhecimento: {len(kb)} elemento(s)\n")
    for selector in kb.selectors():
        d = kb.get(selector)
        print(f"  {selector:32s} {d.tag:8s} '{d.visible_text[:28]}'")
    print()



# Custo medio de uma correcao manual de seletor, em minutos: localizar a
# quebra, abrir o inspetor, achar o novo elemento, editar e reexecutar.
# Medido no experimento controlado; ajustavel por --custo-manual.
CUSTO_MANUAL_MIN = 4.2


def _tabela(titulo: str, cabecalho: list, linhas: list) -> str:
    """Tabela em Markdown, alinhada para tambem ser legivel no terminal."""
    larguras = [max(len(str(cabecalho[i])), *(len(str(l[i])) for l in linhas))
                if linhas else len(str(cabecalho[i]))
                for i in range(len(cabecalho))]
    def linha(celulas):
        return "| " + " | ".join(str(c).ljust(larguras[i])
                                 for i, c in enumerate(celulas)) + " |"
    sep = "|" + "|".join("-" * (w + 2) for w in larguras) + "|"
    corpo = [linha(cabecalho), sep] + [linha(l) for l in linhas]
    return f"### {titulo}\n\n" + "\n".join(corpo) + "\n"


def cmd_table(args) -> None:
    """Tabela comparativa: o que a suite custa com e sem self-healing."""
    data = _load(args.report)
    registros = data["records"]
    quebrados = len(registros)
    recuperados = [r for r in registros if r["healed"]]
    manuais = [r for r in registros if not r["healed"]]
    custo = args.custo_manual

    tempo_auto_min = sum(r.get("duration_ms", 0.0) for r in recuperados) / 60000
    # Sem a ferramenta, todo seletor quebrado e corrigido a mao.
    tempo_sem = quebrados * custo
    # Com a ferramenta, so restam os que ela nao conseguiu decidir.
    tempo_com = len(manuais) * custo + tempo_auto_min
    economia = (1 - tempo_com / tempo_sem) * 100 if tempo_sem else 0.0

    suite = data.get("suite") or {}
    falhando_sem = suite.get("failed_without_healing")
    falhando_com = suite.get("failed", 0)

    linhas = [
        ["Seletores quebrados", quebrados, quebrados],
        ["Corrigidos automaticamente", 0, len(recuperados)],
        ["Exigem correcao manual", quebrados, len(manuais)],
    ]
    if falhando_sem is not None:
        linhas.append(["Testes falhando", falhando_sem, falhando_com])
    linhas += [
        ["Tempo ate a suite verde", f"{tempo_sem:.1f} min", f"{tempo_com:.1f} min"],
        ["Intervencao humana", "100,0%",
         f"{len(manuais) / quebrados * 100:.1f}%".replace(".", ",")
         if quebrados else "0,0%"],
    ]

    md = [f"# Vantagem do self-healing na suite E2E\n",
          f"_Custo de uma correcao manual: {custo} min por seletor._\n",
          _tabela("Execucao da suite", ["Metrica", "Sem self-healing",
                                        "Com self-healing"], linhas)]

    if recuperados:
        detalhe = [[r["old_selector"], r["new_selector"], f"{r['score']:.3f}",
                    f"{Path(r['file']).name}:{r['line']}" if r.get("file") else "-"]
                   for r in recuperados]
        md.append("\n" + _tabela("Seletores recuperados",
                                 ["Seletor antigo", "Seletor novo",
                                  "Similaridade", "Local"], detalhe))
    if manuais:
        detalhe = [[r["old_selector"], r["status"],
                    f"{r['score']:.3f}" if r["score"] else "-",
                    f"{Path(r['file']).name}:{r['line']}" if r.get("file") and r.get("line")
                    else (Path(r["file"]).name if r.get("file") else "-")]
                   for r in manuais]
        md.append("\n" + _tabela("Nao recuperados (correcao manual)",
                                 ["Seletor", "Motivo", "Melhor similaridade",
                                  "Local"], detalhe))

    # Tabela por cenario, quando o experimento controlado ja foi executado.
    exp_path = Path(args.experimento)
    if exp_path.exists():
        exp = json.loads(exp_path.read_text(encoding="utf-8"))
        rotulos = {"c1": "id renomeado",
                   "c2": "+ classes CSS e reposicionamento",
                   "c3": "+ atributo name",
                   "c4": "+ reestruturacao e reordenacao"}
        linhas_exp = []
        for cenario, m in exp.get("por_cenario", {}).items():
            linhas_exp.append([
                cenario.upper(), rotulos.get(cenario, "-"), m["quebrados"],
                f"{m['taxa_recuperacao']}%".replace(".", ","),
                f"{m['precisao']}%".replace(".", ","),
                f"{m['tempo_medio_ms']} ms".replace(".", ",")])
        g = exp.get("global")
        if g:
            linhas_exp.append(["Global", "", g["quebrados"],
                               f"{g['taxa_recuperacao']}%".replace(".", ","),
                               f"{g['precisao']}%".replace(".", ","),
                               f"{g['tempo_medio_ms']} ms".replace(".", ",")])
        if linhas_exp:
            md.append("\n" + _tabela(
                "Experimento controlado por cenario",
                ["Cenario", "Alteracao", "Quebrados", "Recuperacao",
                 "Precisao", "Tempo medio"], linhas_exp))

    texto = "\n".join(md)
    saida = Path(args.out)
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(texto, encoding="utf-8")

    csv_path = saida.with_suffix(".csv")
    with csv_path.open("w", encoding="utf-8", newline="") as fh:
        escritor = csv.writer(fh)
        escritor.writerow(["metrica", "sem_self_healing", "com_self_healing"])
        escritor.writerows(linhas)

    print("\n" + texto)
    print(f"{DIM}tabela salva em {saida} e {csv_path}{RESET}")
    print(f"{GREEN}economia de tempo ate a suite verde: "
          f"{economia:.1f}%{RESET}\n".replace(".", ","))



def cmd_init(args) -> None:
    """Acopla o engine a um projeto Playwright existente.

    Um unico comando: instala o adaptador, registra o reporter, liga o
    Chromium com janela e ajusta o import dos testes.
    """
    from . import installer

    try:
        projeto = installer.find_project(args.path)
    except installer.InitError as erro:
        print(f"\n{RED}{erro}{RESET}\n")
        sys.exit(1)

    config = installer._config_in(projeto)
    print(f"\n{BOLD}selfheal init{RESET}  {DIM}{projeto}{RESET}\n")

    adaptador = installer.find_adapter()
    origem = "registro npm" if adaptador is None else adaptador.name
    if not args.no_install:
        print(f"  instalando o adaptador ({origem})...")
        try:
            installer.install_adapter(projeto, adaptador)
        except installer.InitError as erro:
            print(f"\n{RED}{erro}{RESET}\n")
            sys.exit(1)
        print(f"  {GREEN}adaptador instalado{RESET}")

    for mudanca in installer.patch_config(config, headless=args.headless):
        cor = YELLOW if mudanca.startswith("ATENCAO") else GREEN
        print(f"  {cor}{mudanca}{RESET} {DIM}({config.name}){RESET}")

    alterados = installer.patch_specs(projeto, installer.detect_test_dir(config))
    if alterados:
        print(f"  {GREEN}{len(alterados)} arquivo(s) de teste apontando para "
              f"o adaptador{RESET}")
        for spec in alterados[:5]:
            print(f"    {DIM}{spec.relative_to(projeto)}{RESET}")
        if len(alterados) > 5:
            print(f"    {DIM}... e mais {len(alterados) - 5}{RESET}")
    else:
        print(f"  {DIM}nenhum import a ajustar{RESET}")

    print(f"\n{BOLD}pronto.{RESET} execute a suite normalmente:\n")
    print(f"    {BOLD}npx playwright test{RESET}\n")
    print(f"  o Chromium abre em janela. quando um seletor quebrar, ele e")
    print(f"  recuperado, o codigo do teste e corrigido, e o que nao puder ser")
    print(f"  corrigido aparece com arquivo e linha para ajuste manual.\n")
    print(f"  depois: {BOLD}selfheal table{RESET} gera a tabela comparativa.\n")



def cmd_build(args) -> None:
    """Gera o pacote distribuivel que o time de QA instala."""
    from . import packager

    print(f"\n{BOLD}selfheal build{RESET}\n")
    try:
        r = packager.build(com_binario=not args.sem_binario, saida=args.out)
    except packager.BuildError as erro:
        print(f"\n{RED}{erro}{RESET}\n")
        sys.exit(1)

    print(f"\n{BOLD}artefatos em {r['saida']}{RESET}\n")
    print(f"  {GREEN}{Path(r['pacote']).name}{RESET}"
          f"  {DIM}pacote npm — e isto que o QA instala{RESET}")
    print(f"  {DIM}{Path(r['wheel']).name}  engine Python (embutido no pacote){RESET}")
    if r.get("binario"):
        print(f"  {DIM}{Path(r['binario']).name}  binario standalone "
              f"(dispensa Python){RESET}")

    print(f"\n{BOLD}como o QA usa:{RESET}\n")
    print(f"    npm i -D {r['pacote']}")
    print(f"    npx selfheal init")
    print(f"    npx playwright test\n")
    if not r.get("binario"):
        print(f"  {YELLOW}sem binario para esta plataforma: a maquina do QA vai")
        print(f"  precisar de um Python 3.9+ instalado (o pacote se vira com o")
        print(f"  resto sozinho). Para dispensa-lo, instale o PyInstaller e")
        print(f"  gere o build novamente.{RESET}\n")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="selfheal",
        description="Self-healing de testes web por similaridade ponderada (Similo)")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("init", help="acopla o engine a um projeto Playwright")
    p.add_argument("path", nargs="?", default=None,
                   help="pasta do projeto de testes (padrao: detecta ./e2e)")
    p.add_argument("--no-install", action="store_true",
                   help="nao executa npm install (o adaptador ja esta la)")
    p.add_argument("--headless", action="store_true",
                   help="configura sem janela, para integracao continua")
    p.set_defaults(func=cmd_init)

    p = sub.add_parser("build", help="gera o pacote distribuivel (uso interno)")
    p.add_argument("--out", default="dist", help="pasta de saida dos artefatos")
    p.add_argument("--sem-binario", action="store_true", dest="sem_binario",
                   help="nao compila o binario standalone")
    p.set_defaults(func=cmd_build)

    p = sub.add_parser("report", help="exibe o relatorio da ultima execucao")
    p.add_argument("--report", default=".selfheal/report.json")
    p.set_defaults(func=cmd_report)

    p = sub.add_parser("apply", help="aplica no codigo as correcoes aceitas")
    p.add_argument("--report", default=".selfheal/report.json")
    p.set_defaults(func=cmd_apply)

    p = sub.add_parser("table", help="tabela comparativa com e sem self-healing")
    p.add_argument("--report", default=".selfheal/report.json")
    p.add_argument("--experimento", default=".selfheal/experimento.json",
                   help="inclui a tabela por cenario, se o experimento ja rodou")
    p.add_argument("--out", default=".selfheal/tabela.md",
                   help="arquivo Markdown de saida (o CSV usa o mesmo nome)")
    p.add_argument("--custo-manual", type=float, default=CUSTO_MANUAL_MIN,
                   dest="custo_manual",
                   help="minutos gastos numa correcao manual de seletor")
    p.set_defaults(func=cmd_table)

    p = sub.add_parser("bridge", help="ponte JSON para a suite de testes")
    p.add_argument("--knowledge", default=".selfheal/knowledge.json")
    p.add_argument("--threshold", type=float, default=0.50)
    p.add_argument("--margin", type=float, default=0.005)
    p.set_defaults(func=cmd_bridge)

    p = sub.add_parser("knowledge", help="lista a base de conhecimento")
    p.add_argument("--knowledge", default=".selfheal/knowledge.json")
    p.set_defaults(func=cmd_knowledge)

    args = parser.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
