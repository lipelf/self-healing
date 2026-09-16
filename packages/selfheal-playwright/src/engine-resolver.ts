/**
 * Descobre como executar o engine de decisao.
 *
 * O engine e escrito em Python, mas quem usa a ferramenta e uma pessoa de QA
 * trabalhando em um projeto Node — nao se pode exigir que ela tenha Python
 * configurado. A resolucao segue, entao, da alternativa que menos exige da
 * maquina para a que mais exige:
 *
 *   1. binario standalone embutido no pacote (nenhum Python envolvido);
 *   2. ambiente virtual provisionado pelo proprio pacote na instalacao;
 *   3. Python do sistema, quando ja tem o engine instalado;
 *   4. nada — e ai a mensagem precisa dizer exatamente o que fazer.
 *
 * A escolha explicita do usuario (SELFHEAL_PYTHON) tem precedencia sobre tudo.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export interface EngineCommand {
  command: string;
  /** Argumentos que antecedem os do subcomando `bridge`. */
  baseArgs: string[];
  /** De onde veio o engine, para diagnostico. */
  origin: string;
}

/** Raiz do pacote instalado (…/node_modules/selfheal-playwright). */
function packageRoot(): string {
  // __dirname aponta para dist/ dentro do pacote.
  return join(__dirname, '..');
}

function platformKey(): string {
  const ext = process.platform === 'win32' ? '.exe' : '';
  return `selfheal-engine-${process.platform}-${process.arch}${ext}`;
}

/** 1. Binario standalone embutido: o caminho que dispensa Python. */
export function findBundledBinary(): string | null {
  const caminho = join(packageRoot(), 'bin', platformKey());
  return existsSync(caminho) ? caminho : null;
}

/** 2. Ambiente virtual criado pelo postinstall do proprio pacote. */
export function findManagedVenv(): string | null {
  const bin = process.platform === 'win32'
    ? join('Scripts', 'python.exe')
    : join('bin', 'python3');
  const caminho = join(packageRoot(), '.venv', bin);
  return existsSync(caminho) ? caminho : null;
}

/** Confere se um interpretador consegue importar o engine. */
export function pythonHasEngine(python: string): boolean {
  try {
    const res = spawnSync(python, ['-c', 'import selfheal'],
                          { stdio: 'ignore', timeout: 15000 });
    return res.status === 0;
  } catch {
    return false;
  }
}

/** 3. Python do sistema com o engine ja instalado. */
export function findSystemPython(): string | null {
  const candidatos = ['python3.13', 'python3', 'python'];
  for (const python of candidatos) {
    if (pythonHasEngine(python)) return python;
  }
  return null;
}

export function resolveEngine(explicitPython?: string): EngineCommand | null {
  // A escolha do usuario vem primeiro: quem aponta um interpretador tem um
  // motivo, e sobrepo-la silenciosamente seria pior do que falhar.
  const escolhido = explicitPython || process.env.SELFHEAL_PYTHON;
  if (escolhido) {
    return { command: escolhido, baseArgs: ['-m', 'selfheal.bridge'],
             origin: `interpretador indicado (${escolhido})` };
  }

  const binario = findBundledBinary();
  if (binario) {
    return { command: binario, baseArgs: ['bridge'],
             origin: 'binario embutido no pacote' };
  }

  const venv = findManagedVenv();
  if (venv) {
    return { command: venv, baseArgs: ['-m', 'selfheal.bridge'],
             origin: 'ambiente provisionado na instalacao' };
  }

  const sistema = findSystemPython();
  if (sistema) {
    return { command: sistema, baseArgs: ['-m', 'selfheal.bridge'],
             origin: `Python do sistema (${sistema})` };
  }

  return null;
}

export const MENSAGEM_SEM_ENGINE = [
  '',
  '[selfheal] o engine de decisao nao foi encontrado.',
  '',
  '  Este pacote tenta, nesta ordem: binario embutido, ambiente proprio',
  '  e Python do sistema. Nenhum deles esta disponivel aqui.',
  '',
  '  Para resolver, escolha uma das opcoes:',
  '    npm rebuild selfheal-playwright     (refaz o ambiente do pacote)',
  '    python3 -m pip install selfheal      (usa o Python do sistema)',
  '    SELFHEAL_PYTHON=/caminho/do/python   (aponta um interpretador)',
  '',
].join('\n');
