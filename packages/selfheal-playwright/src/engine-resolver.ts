import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export interface EngineCommand {
  command: string;
  baseArgs: string[];
  origin: string;
}

function packageRoot(): string {
  return join(__dirname, '..');
}

function platformKey(): string {
  const ext = process.platform === 'win32' ? '.exe' : '';
  return `selfheal-engine-${process.platform}-${process.arch}${ext}`;
}

export function findBundledBinary(): string | null {
  const caminho = join(packageRoot(), 'bin', platformKey());
  return existsSync(caminho) ? caminho : null;
}

export function findManagedVenv(): string | null {
  const bin = process.platform === 'win32'
    ? join('Scripts', 'python.exe')
    : join('bin', 'python3');
  const caminho = join(packageRoot(), '.venv', bin);
  return existsSync(caminho) ? caminho : null;
}

export function pythonHasEngine(python: string): boolean {
  try {
    const res = spawnSync(python, ['-c', 'import selfheal'],
                          { stdio: 'ignore', timeout: 15000 });
    return res.status === 0;
  } catch {
    return false;
  }
}

export function findSystemPython(): string | null {
  const candidatos = ['python3.13', 'python3', 'python'];
  for (const python of candidatos) {
    if (pythonHasEngine(python)) return python;
  }
  return null;
}

export function resolveEngine(explicitPython?: string): EngineCommand | null {
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
