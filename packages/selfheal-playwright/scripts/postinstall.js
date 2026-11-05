#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

const RAIZ = join(__dirname, '..');
const VERDE = '\x1b[32m', AMAR = '\x1b[33m', CINZA = '\x1b[2m', RESET = '\x1b[0m';

function log(msg) { console.log(`${CINZA}[selfheal]${RESET} ${msg}`); }

function binarioDaPlataforma() {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const nome = `selfheal-engine-${process.platform}-${process.arch}${ext}`;
  const caminho = join(RAIZ, 'bin', nome);
  return existsSync(caminho) ? caminho : null;
}

function wheelEmbutido() {
  const pasta = join(RAIZ, 'engine');
  if (!existsSync(pasta)) return null;
  const arquivos = readdirSync(pasta)
    .filter((f) => f.endsWith('.whl') || f.endsWith('.tar.gz'));
  return arquivos.length ? join(pasta, arquivos.sort().pop()) : null;
}

function achaPython() {
  for (const candidato of ['python3.13', 'python3.12', 'python3', 'python']) {
    const res = spawnSync(candidato, ['--version'], { stdio: 'ignore' });
    if (res.status === 0) return candidato;
  }
  return null;
}

function main() {
  if (existsSync(join(RAIZ, 'src')) && !existsSync(join(RAIZ, 'engine'))) return;

  if (binarioDaPlataforma()) {
    log(`${VERDE}engine embutido para ${process.platform}-${process.arch}.${RESET}`);
    return;
  }

  const wheel = wheelEmbutido();
  if (!wheel) {
    log(`${AMAR}sem engine embutido para esta plataforma.${RESET}`);
    log('sera usado o Python do sistema, se tiver o engine instalado.');
    return;
  }

  const python = achaPython();
  if (!python) {
    log(`${AMAR}Python nao encontrado; o engine nao pode ser provisionado.${RESET}`);
    log('instale o Python 3.9+ ou use um pacote com binario embutido.');
    return;
  }

  const venv = join(RAIZ, '.venv');
  log(`provisionando o engine em ${CINZA}.venv${RESET} com ${python}...`);

  let res = spawnSync(python, ['-m', 'venv', venv], { stdio: 'ignore' });
  if (res.status !== 0) {
    log(`${AMAR}nao foi possivel criar o ambiente virtual.${RESET}`);
    return;
  }

  const pip = process.platform === 'win32'
    ? join(venv, 'Scripts', 'python.exe')
    : join(venv, 'bin', 'python3');

  res = spawnSync(pip, ['-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', wheel],
                  { stdio: 'inherit' });
  if (res.status !== 0) {
    log(`${AMAR}a instalacao do engine falhou.${RESET}`);
    return;
  }

  log(`${VERDE}engine provisionado — nenhuma configuracao adicional e necessaria.${RESET}`);
}

try {
  main();
} catch (err) {
  log(`${AMAR}provisionamento ignorado: ${err.message}${RESET}`);
}
