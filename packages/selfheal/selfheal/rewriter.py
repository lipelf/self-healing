"""Reescrita permanente do seletor no arquivo de teste.

E o passo que diferencia a ferramenta das abordagens que apenas resolvem a
falha em tempo de execucao: aqui o codigo-fonte do teste e efetivamente
alterado, de modo que o seletor obsoleto nao volte a falhar.
"""
import re
from pathlib import Path
from typing import Dict, Iterable, List, NamedTuple, Optional, Tuple


class Rewrite(NamedTuple):
    file: str
    line: int
    old_selector: str
    new_selector: str
    old_line_text: str
    new_line_text: str


def _escape(selector: str) -> str:
    return re.escape(selector)


def find_occurrences(path: str, selector: str) -> List[int]:
    """Linhas (1-indexadas) do arquivo em que o seletor literal aparece."""
    text = Path(path).read_text(encoding="utf-8")
    pattern = re.compile(
        r"""(['"`])""" + _escape(selector) + r"""\1"""
    )
    return [
        i for i, line in enumerate(text.splitlines(), 1)
        if pattern.search(line)
    ]


def rewrite_selector(path: str, old_selector: str, new_selector: str,
                     dry_run: bool = False) -> List[Rewrite]:
    """Substitui o seletor preservando o tipo de aspas usado no arquivo."""
    file_path = Path(path)
    lines = file_path.read_text(encoding="utf-8").splitlines(keepends=True)
    pattern = re.compile(
        r"""(?P<q>['"`])(?P<sel>""" + _escape(old_selector) + r""")(?P=q)"""
    )

    changes: List[Rewrite] = []
    for index, line in enumerate(lines):
        if not pattern.search(line):
            continue
        new_line = pattern.sub(
            lambda m: f"{m.group('q')}{new_selector}{m.group('q')}", line
        )
        changes.append(Rewrite(
            file=str(file_path),
            line=index + 1,
            old_selector=old_selector,
            new_selector=new_selector,
            old_line_text=line.rstrip("\n"),
            new_line_text=new_line.rstrip("\n"),
        ))
        lines[index] = new_line

    if changes and not dry_run:
        file_path.write_text("".join(lines), encoding="utf-8")
    return changes


def build_selector(descriptor) -> str:
    """Deriva um seletor estavel para o elemento recuperado.

    A ordem reflete a estabilidade observada: identificador, atributo name,
    atributo de teste e, por ultimo, um seletor textual.
    """
    if descriptor.id:
        return f"#{descriptor.id}"
    test_id = (descriptor.meta or {}).get("data-testid")
    if test_id:
        return f"[data-testid=\"{test_id}\"]"
    if descriptor.name:
        return f"[name=\"{descriptor.name}\"]"
    if descriptor.visible_text:
        return f"text={descriptor.visible_text.strip()}"
    if descriptor.class_:
        first = descriptor.class_.split()[0]
        return f"{descriptor.tag}.{first}"
    return descriptor.tag


FONTES = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")
IGNORADAS = {"node_modules", "dist", "build", ".git", ".next",
             "coverage", "test-results", "playwright-report", ".selfheal",
             ".venv", "venv", "__pycache__"}

SUFIXOS_DE_BACKUP = (".orig", ".bak", ".backup", ".old")


def _e_backup(parte: str) -> bool:
    return parte.endswith(SUFIXOS_DE_BACKUP) or parte in {"backup", "backups"}


def arquivos_de_codigo(raiz: str) -> Iterable[Path]:
    """Arquivos-fonte do projeto, pulando diretorios gerados ou de terceiros."""
    base = Path(raiz)
    for caminho in base.rglob("*"):
        if caminho.suffix not in FONTES or not caminho.is_file():
            continue
        if any(parte in IGNORADAS or _e_backup(parte) for parte in caminho.parts):
            continue
        yield caminho


def localizar_no_projeto(raiz: str, selector: str,
                         preferido: Optional[str] = None
                         ) -> List[Tuple[str, int]]:
    """Onde o seletor literal aparece no projeto, como pares arquivo e linha.

    O arquivo indicado pelo teste vem primeiro quando tambem contem o seletor,
    para que o caso comum continue sendo resolvido sem varredura desnecessaria.
    """
    achados: List[Tuple[str, int]] = []
    if preferido:
        try:
            achados = [(preferido, n) for n in find_occurrences(preferido, selector)]
        except OSError:
            achados = []
    if achados:
        return achados

    for caminho in arquivos_de_codigo(raiz):
        if preferido and str(caminho) == str(preferido):
            continue
        try:
            for n in find_occurrences(str(caminho), selector):
                achados.append((str(caminho), n))
        except (OSError, UnicodeDecodeError):
            continue
    return achados


def reescrever_no_projeto(raiz: str, antigo: str, novo: str,
                          preferido: Optional[str] = None,
                          dry_run: bool = False) -> List[Rewrite]:
    """Aplica a substituicao em todos os arquivos do projeto que a contenham."""
    alterados: List[Rewrite] = []
    vistos = set()
    for arquivo, _linha in localizar_no_projeto(raiz, antigo, preferido):
        if arquivo in vistos:
            continue
        vistos.add(arquivo)
        alterados.extend(rewrite_selector(arquivo, antigo, novo, dry_run=dry_run))
    return alterados


CHAVE_SEMANTICA = re.compile(r"^(getBy[A-Za-z]+)=(.*)$", re.S)


def partes_da_chave(chave: str):
    """Devolve (metodo, papel, texto) ou None quando nao e chave semantica."""
    m = CHAVE_SEMANTICA.match(chave)
    if not m:
        return None
    metodo, resto = m.group(1), m.group(2)
    if metodo == "getByRole":
        papel, _, nome = resto.partition("|")
        return metodo, papel, (nome or None)
    return metodo, None, resto


def _padrao_da_chamada(metodo: str, papel, texto):
    """Expressao que casa a chamada e isola o argumento textual a trocar."""
    if metodo == "getByRole":
        if texto is None:
            return None
        return re.compile(
            r"(getByRole\s*\(\s*(['\"`])" + re.escape(papel) + r"\2\s*,[^)]*?name\s*:\s*)"
            r"(['\"`])" + re.escape(texto) + r"\3")
    return re.compile(
        r"(" + re.escape(metodo) + r"\s*\(\s*)(['\"`])" + re.escape(texto) + r"\2")


def reescrever_semantico(path: str, chave: str, novo_texto: str,
                         dry_run: bool = False) -> List[Rewrite]:
    """Troca o argumento textual de uma chamada getBy* no arquivo."""
    partes = partes_da_chave(chave)
    if not partes:
        return []
    metodo, papel, texto = partes
    padrao = _padrao_da_chamada(metodo, papel, texto)
    if padrao is None:
        return []

    arquivo = Path(path)
    linhas = arquivo.read_text(encoding="utf-8").splitlines(keepends=True)
    mudancas: List[Rewrite] = []
    for i, linha in enumerate(linhas):
        if not padrao.search(linha):
            continue
        nova = padrao.sub(lambda m: f"{m.group(1)}{m.group(m.lastindex)}"
                                    f"{novo_texto}{m.group(m.lastindex)}", linha)
        mudancas.append(Rewrite(file=str(arquivo), line=i + 1,
                                old_selector=chave, new_selector=novo_texto,
                                old_line_text=linha.rstrip("\n"),
                                new_line_text=nova.rstrip("\n")))
        linhas[i] = nova

    if mudancas and not dry_run:
        arquivo.write_text("".join(linhas), encoding="utf-8")
    return mudancas


def localizar_semantico(raiz: str, chave: str,
                        preferido: Optional[str] = None) -> List[Tuple[str, int]]:
    """Onde a chamada getBy* correspondente a chave aparece no projeto."""
    partes = partes_da_chave(chave)
    if not partes:
        return []
    metodo, papel, texto = partes
    padrao = _padrao_da_chamada(metodo, papel, texto)
    if padrao is None:
        return []

    candidatos = ([Path(preferido)] if preferido else []) + \
                 [c for c in arquivos_de_codigo(raiz)
                  if not preferido or str(c) != str(preferido)]
    achados: List[Tuple[str, int]] = []
    for caminho in candidatos:
        try:
            texto_arquivo = Path(caminho).read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for n, linha in enumerate(texto_arquivo.splitlines(), 1):
            if padrao.search(linha):
                achados.append((str(caminho), n))
        if achados and preferido and str(caminho) == str(preferido):
            return achados
    return achados
