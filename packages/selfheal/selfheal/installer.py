"""Acoplamento do engine a um projeto Playwright existente.

O engine de decisao e Python, mas quem executa os testes e o Playwright, em
Node. Em vez de exigir que o usuario instale as duas metades por conta
propria, o adaptador npm viaja dentro do pacote Python e este modulo o
instala no projeto de testes, registra o reporter e ajusta a configuracao.

Do ponto de vista de quem usa, existe um unico instalador:

    python3 -m pip install selfheal
    selfheal init ./e2e
"""
import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional

ADAPTER_NAME = "selfheal-playwright"
CONFIG_NAMES = ("playwright.config.ts", "playwright.config.js",
                "playwright.config.mjs")
REPORTER_ENTRY = "['selfheal-playwright/dist/reporter']"


class InitError(RuntimeError):
    """Falha de acoplamento com uma explicacao ja pronta para o usuario."""


def find_project(start: Optional[str] = None) -> Path:
    """Localiza a pasta do projeto Playwright.

    Procura na pasta indicada, depois em subpastas de nome convencional. A
    busca e rasa de proposito: adivinhar demais leva a configurar o projeto
    errado sem que o usuario perceba.
    """
    if start:
        base = Path(start).expanduser().resolve()
        if not base.is_dir():
            raise InitError(f"pasta nao encontrada: {base}")
        if _config_in(base):
            return base
        raise InitError(
            f"nenhum playwright.config encontrado em {base}\n"
            f"       aponte a pasta que contem o arquivo: selfheal init ./e2e")

    aqui = Path.cwd()
    if _config_in(aqui):
        return aqui
    for nome in ("e2e", "tests", "test", "integration"):
        candidato = aqui / nome
        if candidato.is_dir() and _config_in(candidato):
            return candidato
    raise InitError(
        "nenhum projeto Playwright encontrado aqui.\n"
        "       execute na pasta do projeto de testes, ou indique-a:\n"
        "         selfheal init ./e2e")


def _config_in(folder: Path) -> Optional[Path]:
    for nome in CONFIG_NAMES:
        caminho = folder / nome
        if caminho.exists():
            return caminho
    return None


def find_adapter() -> Optional[Path]:
    """O pacote npm do adaptador, empacotado junto do engine.

    Em uma instalacao normal ele vem dentro do pacote Python. Rodando a
    partir do repositorio, usa-se o .tgz gerado pelo build.
    """
    embutido = Path(__file__).parent / "adapter"
    if embutido.is_dir():
        pacotes = sorted(embutido.glob(f"{ADAPTER_NAME}-*.tgz"))
        if pacotes:
            return pacotes[-1]

    repo = Path(__file__).resolve().parents[3] / "packages" / ADAPTER_NAME
    if repo.is_dir():
        pacotes = sorted(repo.glob(f"{ADAPTER_NAME}-*.tgz"))
        if pacotes:
            return pacotes[-1]
    return None


def install_adapter(project: Path, adapter: Optional[Path]) -> str:
    """Instala o adaptador no projeto de testes."""
    if shutil.which("npm") is None:
        raise InitError("npm nao encontrado no PATH. Instale o Node.js 18+.")

    origem = str(adapter) if adapter else ADAPTER_NAME
    proc = subprocess.run(["npm", "install", "--save-dev", origem],
                          cwd=project, capture_output=True, text=True)
    if proc.returncode != 0:
        raise InitError(
            f"npm install falhou em {project}:\n{proc.stderr.strip()[:500]}")
    return origem


def patch_config(config: Path, headless: bool = False,
                 slow_mo: int = 150) -> List[str]:
    """Registra o reporter e liga o Chromium com janela.

    Devolve a lista do que foi alterado. Quando alguma parte ja existe, ela e
    preservada: reescrever a configuracao de outra pessoa causa mais dano do
    que o ajuste automatico economiza.
    """
    src = config.read_text(encoding="utf-8")
    mudancas: List[str] = []

    if "selfheal-playwright/dist/reporter" in src:
        mudancas.append("reporter ja estava registrado")
    elif re.search(r"reporter\s*:", src):
        mudancas.append(
            f"ATENCAO: ja existe um 'reporter'. Acrescente a entrada "
            f"{REPORTER_ENTRY} a lista manualmente")
    else:
        src = re.sub(r"defineConfig\(\{",
                     "defineConfig({\n  reporter: [['list'], "
                     f"{REPORTER_ENTRY}],", src, count=1)
        mudancas.append("reporter registrado")

    valor = "process.env.HEADLESS === '1'" if not headless else "true"
    if re.search(r"headless\s*:", src):
        mudancas.append("headless ja estava definido — nao foi alterado")
    elif re.search(r"\buse\s*:\s*\{", src):
        src = re.sub(r"\buse\s*:\s*\{",
                     "use: {\n    headless: " + valor + ","
                     f"\n    launchOptions: {{ slowMo: Number(process.env.SELFHEAL_SLOWMO ?? {slow_mo}) }},",
                     src, count=1)
        mudancas.append("Chromium configurado com janela visivel")
    else:
        src = re.sub(r"defineConfig\(\{",
                     "defineConfig({\n  use: {\n    headless: " + valor + ","
                     f"\n    launchOptions: {{ slowMo: Number(process.env.SELFHEAL_SLOWMO ?? {slow_mo}) }},\n  }},",
                     src, count=1)
        mudancas.append("Chromium configurado com janela visivel")

    config.write_text(src, encoding="utf-8")
    return mudancas


IMPORT_PATTERN = re.compile(
    r"""(import\s*\{[^}]*\}\s*from\s*['"])@playwright/test(['"])""")


def patch_specs(project: Path, test_dir: str = "") -> List[Path]:
    """Troca a origem do import nos arquivos de teste.

    E a unica alteracao que os testes sofrem: tudo o mais continua igual,
    porque o adaptador reexporta `test` e `expect` do proprio Playwright.
    """
    raiz = project / test_dir if test_dir else project
    alterados: List[Path] = []
    for spec in sorted(raiz.rglob("*.spec.ts")) + sorted(raiz.rglob("*.spec.js")):
        if "node_modules" in spec.parts:
            continue
        texto = spec.read_text(encoding="utf-8")
        novo = IMPORT_PATTERN.sub(r"\1selfheal-playwright\2", texto)
        if novo != texto:
            spec.write_text(novo, encoding="utf-8")
            alterados.append(spec)
    return alterados


def detect_test_dir(config: Path) -> str:
    match = re.search(r"""testDir\s*:\s*['"]([^'"]+)['"]""",
                      config.read_text(encoding="utf-8"))
    return match.group(1).lstrip("./") if match else ""
