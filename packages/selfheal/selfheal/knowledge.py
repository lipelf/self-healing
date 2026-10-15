"""Base de conhecimento local: guarda os descritores da ultima execucao boa.

A base e escrita por varios processos ao mesmo tempo. O Playwright executa a
suite em paralelo por padrao, e cada worker roda o seu proprio engine, cada um
com a sua copia em memoria: um worker aprendeu os seletores do login, outro os
do carrinho. Sobrescrever o arquivo com a copia local, como uma gravacao
ingenua faria, descartaria em silencio o que os demais aprenderam.

Por isso a gravacao e feita sob trava exclusiva e em tres passos: rele o que
esta em disco, funde com o que esta em memoria e substitui o arquivo de forma
atomica. A fusao preserva o que outro processo gravou e, ao mesmo tempo, honra
as remocoes feitas nesta sessao.
"""
import json
import os
import tempfile
import time
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set

from .descriptor import ElementDescriptor

# Tempo maximo de espera pela trava. Passado esse limite, considera-se que o
# dono anterior morreu sem liberar e a trava e tomada: perder a sincronizacao
# e menos grave do que travar a suite de testes de alguem.
LOCK_TIMEOUT_S = 10.0
LOCK_STALE_S = 30.0


class _FileLock:
    """Trava entre processos baseada em criacao exclusiva de arquivo.

    Nao depende de fcntl nem de msvcrt, o que mantem o mesmo comportamento em
    Linux, macOS e Windows — e em sistemas de arquivos de rede, onde o
    travamento por descritor costuma ser pouco confiavel.
    """

    def __init__(self, alvo: Path):
        self.lock_path = alvo.with_suffix(alvo.suffix + ".lock")
        self.fd: Optional[int] = None

    def __enter__(self) -> "_FileLock":
        limite = time.monotonic() + LOCK_TIMEOUT_S
        while True:
            try:
                self.fd = os.open(str(self.lock_path),
                                  os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(self.fd, str(os.getpid()).encode())
                return self
            except FileExistsError:
                if self._abandonada() or time.monotonic() > limite:
                    # Trava orfa ou espera esgotada: assume o controle.
                    try:
                        self.lock_path.unlink()
                    except OSError:
                        pass
                    continue
                time.sleep(0.02)
            except OSError:
                # Sem permissao de escrita: segue sem trava, pois falhar aqui
                # abortaria a suite por causa de um detalhe de infraestrutura.
                return self

    def _abandonada(self) -> bool:
        try:
            return (time.time() - self.lock_path.stat().st_mtime) > LOCK_STALE_S
        except OSError:
            return False

    def __exit__(self, *_) -> None:
        if self.fd is not None:
            try:
                os.close(self.fd)
            except OSError:
                pass
        try:
            self.lock_path.unlink()
        except OSError:
            pass


class KnowledgeBase:
    """Persiste descritores em JSON, indexados pelo seletor do teste."""

    def __init__(self, path: str = ".selfheal/knowledge.json"):
        self.path = Path(path)
        self._data: Dict[str, dict] = {}
        # Seletores removidos nesta sessao. Sem esse registro, a fusao
        # ressuscitaria um seletor que acabou de ser corrigido, pois ele ainda
        # consta do arquivo gravado por outro worker.
        self._removidos: Set[str] = set()
        self.load()

    def load(self) -> None:
        self._data = self._ler_disco()

    def _ler_disco(self) -> Dict[str, dict]:
        """Conteudo atual do arquivo, ou vazio se ele ainda nao existe.

        Um arquivo truncado por uma gravacao interrompida nao pode derrubar a
        suite: nesse caso a base e tratada como vazia e sera reconstruida.
        """
        if not self.path.exists():
            return {}
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}

    def save(self) -> None:
        """Funde com o disco e substitui o arquivo atomicamente."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with _FileLock(self.path):
            fundido = self._ler_disco()
            for selector in self._removidos:
                fundido.pop(selector, None)
            # O que esta em memoria e mais recente para os seletores que esta
            # sessao viu; o que so existe em disco veio de outro worker e e
            # preservado.
            fundido.update(self._data)

            destino = self.path.parent
            with tempfile.NamedTemporaryFile(
                    "w", encoding="utf-8", dir=destino, delete=False,
                    prefix=".knowledge-", suffix=".tmp") as tmp:
                json.dump(fundido, tmp, indent=2, ensure_ascii=False)
                tmp.flush()
                os.fsync(tmp.fileno())
                temporario = tmp.name
            # os.replace e atomico: um leitor concorrente ve o arquivo antigo
            # ou o novo, nunca um arquivo pela metade.
            os.replace(temporario, self.path)

            self._data = fundido
            self._removidos.clear()

    # -- operacoes ---------------------------------------------------------
    def record(self, selector: str, descriptor: ElementDescriptor) -> None:
        """Registra o elemento localizado com sucesso sob aquele seletor."""
        descriptor.selector = selector
        self._data[selector] = descriptor.to_dict()

    def record_many(self, descriptors: Iterable[ElementDescriptor]) -> None:
        for d in descriptors:
            if d.selector:
                self.record(d.selector, d)

    def get(self, selector: str) -> Optional[ElementDescriptor]:
        raw = self._data.get(selector)
        return ElementDescriptor.from_dict(raw) if raw else None

    def rename(self, old_selector: str, new_selector: str,
               descriptor: ElementDescriptor) -> None:
        """Move o registro apos uma correcao aplicada no codigo."""
        self._data.pop(old_selector, None)
        self._removidos.add(old_selector)
        self.record(new_selector, descriptor)

    def selectors(self) -> List[str]:
        return list(self._data)

    def __len__(self) -> int:
        return len(self._data)

    def __contains__(self, selector: str) -> bool:
        return selector in self._data
