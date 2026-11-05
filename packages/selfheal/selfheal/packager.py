"""Geracao dos artefatos distribuiveis.

Este modulo e a etapa de empacotamento do projeto — executada por quem
desenvolve a ferramenta, nao por quem a usa. Ele produz um pacote npm que
carrega o engine dentro de si, de modo que a instalacao do lado de quem
escreve testes seja apenas:

    npm i -D selfheal-playwright
    npx selfheal init

O engine viaja de duas formas complementares, porque nenhuma delas cobre
todos os casos sozinha:

  * um binario standalone da plataforma atual, que dispensa Python por
    completo, mas so serve para o sistema em que foi compilado;
  * o wheel Python, que serve a qualquer plataforma, mas depende de um
    interpretador disponivel na maquina para ser provisionado.

Na execucao, `engine-resolver.ts` tenta o binario primeiro e recorre ao wheel
em seguida, o que faz as duas formas se complementarem.
"""
import platform
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import List, Optional

ADAPTER = "selfheal-playwright"


class BuildError(RuntimeError):
    """Falha de empacotamento com explicacao pronta para o terminal."""


def find_repo() -> Path:
    """Raiz do repositorio, a partir da localizacao deste modulo."""
    aqui = Path(__file__).resolve()
    for pai in aqui.parents:
        if (pai / "packages" / ADAPTER).is_dir():
            return pai
    raise BuildError(
        "o empacotamento so roda a partir do repositorio do projeto.\n"
        "       (a instalacao publicada nao carrega o codigo do adaptador)")


def _run(cmd: List[str], cwd: Path, etapa: str) -> str:
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if proc.returncode != 0:
        detalhe = (proc.stderr or proc.stdout).strip()[:800]
        raise BuildError(f"{etapa} falhou:\n{detalhe}")
    return proc.stdout.strip()


def binary_name() -> str:
    """Nome do binario para esta plataforma, no formato que o resolver espera."""
    sistema = {"Darwin": "darwin", "Linux": "linux", "Windows": "win32"}.get(
        platform.system(), platform.system().lower())
    arch = {"x86_64": "x64", "AMD64": "x64", "arm64": "arm64",
            "aarch64": "arm64"}.get(platform.machine(), platform.machine())
    ext = ".exe" if sistema == "win32" else ""
    return f"selfheal-engine-{sistema}-{arch}{ext}"


def compile_adapter(repo: Path) -> None:
    if shutil.which("npm") is None:
        raise BuildError("npm nao encontrado no PATH. Instale o Node.js 18+.")
    pasta = repo / "packages" / ADAPTER
    _run(["npm", "install", "--silent"], pasta, "npm install do adaptador")
    _run(["npx", "tsc"], pasta, "compilacao TypeScript")


def build_wheel(repo: Path, saida: Path) -> Path:
    """Gera o wheel e o sdist do engine."""
    engine = repo / "packages" / "selfheal"
    shutil.rmtree(engine / "build", ignore_errors=True)
    _run([sys.executable, "-m", "pip", "install", "--quiet", "--upgrade", "build"],
         repo, "instalacao do modulo build")
    _run([sys.executable, "-m", "build", "--outdir", str(saida)],
         engine, "geracao do wheel")
    wheels = sorted(saida.glob("selfheal-*.whl"))
    if not wheels:
        raise BuildError("o wheel nao foi gerado")
    return wheels[-1]


def build_binary(repo: Path) -> Optional[Path]:
    """Compila o engine num executavel standalone, se o PyInstaller existir.

    O binario embarca apenas o caminho da decisao: o Playwright fica de fora
    porque quem controla o navegador, em producao, e a propria suite de testes.
    """
    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        return None

    destino = repo / "packages" / ADAPTER / "bin"
    destino.mkdir(parents=True, exist_ok=True)
    nome = binary_name()

    with tempfile.TemporaryDirectory() as tmp:
        entrada = Path(tmp) / "entrypoint.py"
        entrada.write_text(
            "import sys\n"
            "from selfheal.cli import main\n"
            "sys.exit(main())\n", encoding="utf-8")
        _run([sys.executable, "-m", "PyInstaller", "--onefile", "--clean",
              "--name", nome.removesuffix(".exe"),
              "--distpath", str(destino),
              "--workpath", str(Path(tmp) / "work"),
              "--specpath", str(tmp),
              "--hidden-import", "selfheal.bridge",
              "--hidden-import", "selfheal.similo",
              "--hidden-import", "selfheal.installer",
              "--exclude-module", "playwright",
              "--exclude-module", "bs4",
              "--log-level", "WARN",
              str(entrada)],
             repo / "packages" / "selfheal", "compilacao do binario")

    binario = destino / nome
    if not binario.exists():
        return None
    binario.chmod(0o755)
    return binario


def embed_engine(repo: Path, wheel: Path) -> None:
    """Coloca o wheel dentro do pacote npm, para o postinstall usar."""
    destino = repo / "packages" / ADAPTER / "engine"
    shutil.rmtree(destino, ignore_errors=True)
    destino.mkdir(parents=True, exist_ok=True)
    shutil.copy2(wheel, destino / wheel.name)


def pack_adapter(repo: Path, saida: Path) -> Path:
    """Empacota o adaptador ja com o engine dentro."""
    pasta = repo / "packages" / ADAPTER
    for antigo in pasta.glob(f"{ADAPTER}-*.tgz"):
        antigo.unlink()
    nome = _run(["npm", "pack", "--silent"], pasta, "npm pack").splitlines()[-1]
    tgz = pasta / nome

    embutido = repo / "packages" / "selfheal" / "selfheal" / "adapter"
    shutil.rmtree(embutido, ignore_errors=True)
    embutido.mkdir(parents=True, exist_ok=True)
    shutil.copy2(tgz, embutido / tgz.name)

    saida.mkdir(parents=True, exist_ok=True)
    final = saida / tgz.name
    shutil.copy2(tgz, final)
    return final


def build(com_binario: bool = True, saida: str = "dist") -> dict:
    repo = find_repo()
    destino = (repo / saida).resolve()
    destino.mkdir(parents=True, exist_ok=True)
    resultado = {"repo": str(repo), "saida": str(destino)}

    print("  compilando o adaptador Playwright...")
    compile_adapter(repo)

    print("  gerando o wheel do engine...")
    wheel = build_wheel(repo, destino)
    resultado["wheel"] = str(wheel)

    print("  embutindo o engine no pacote npm...")
    embed_engine(repo, wheel)

    if com_binario:
        print(f"  compilando o binario standalone ({binary_name()})...")
        binario = build_binary(repo)
        resultado["binario"] = str(binario) if binario else None
        if binario is None:
            print("    PyInstaller ausente — o pacote sai sem binario.")
            print("    instale com: pip install pyinstaller")
    else:
        resultado["binario"] = None

    print("  empacotando...")
    resultado["pacote"] = str(pack_adapter(repo, destino))
    return resultado
