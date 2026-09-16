"""Reescrita permanente do seletor no arquivo de teste.

E o passo que diferencia a ferramenta das abordagens que apenas resolvem a
falha em tempo de execucao: aqui o codigo-fonte do teste e efetivamente
alterado, de modo que o seletor obsoleto nao volte a falhar.
"""
import re
from pathlib import Path
from typing import List, NamedTuple


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
