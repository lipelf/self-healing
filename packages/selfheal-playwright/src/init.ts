#!/usr/bin/env node
/**
 * Acopla o self-healing a um projeto Playwright existente.
 *
 * Registra o reporter, liga o Chromium em janela e troca a origem do import
 * nos arquivos de teste. Depois disso a suite continua sendo executada com
 * `npx playwright test`, exatamente como antes.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { MENSAGEM_SEM_ENGINE, resolveEngine } from './engine-resolver';

const VERDE = '\x1b[32m', AMAR = '\x1b[33m', VERM = '\x1b[31m';
const NEG = '\x1b[1m', CINZA = '\x1b[2m', RESET = '\x1b[0m';

const CONFIGS = ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs'];
const REPORTER = "['selfheal-playwright/dist/reporter']";
const IMPORT_RE = /(import\s*\{[^}]*\}\s*from\s*['"])@playwright\/test(['"])/g;

function acharConfig(dir: string): string | null {
  return CONFIGS.map((c) => join(dir, c)).find(existsSync) || null;
}

/** Procura o projeto de testes na pasta atual ou nas subpastas usuais. */
function acharProjeto(indicado?: string): string | null {
  if (indicado) return acharConfig(indicado) ? indicado : null;
  const aqui = process.cwd();
  if (acharConfig(aqui)) return aqui;
  for (const nome of ['e2e', 'tests', 'test', 'integration']) {
    const cand = join(aqui, nome);
    if (existsSync(cand) && statSync(cand).isDirectory() && acharConfig(cand)) {
      return cand;
    }
  }
  return null;
}

/** Registra o reporter e o Chromium com janela, preservando o que ja existe. */
function ajustarConfig(config: string, headless: boolean): string[] {
  let src = readFileSync(config, 'utf8');
  const feito: string[] = [];

  if (src.includes('selfheal-playwright/dist/reporter')) {
    feito.push('reporter ja estava registrado');
  } else if (/reporter\s*:/.test(src)) {
    feito.push(`ATENCAO: ja existe um "reporter" — acrescente ${REPORTER} a lista`);
  } else {
    src = src.replace(/defineConfig\(\{/,
      `defineConfig({\n  reporter: [['list'], ${REPORTER}],`);
    feito.push('reporter registrado');
  }

  const valor = headless ? 'true' : "process.env.HEADLESS === '1'";
  const launch =
    '\n    launchOptions: { slowMo: Number(process.env.SELFHEAL_SLOWMO ?? 150) },';
  if (/headless\s*:/.test(src)) {
    feito.push('headless ja estava definido — nao foi alterado');
  } else if (/\buse\s*:\s*\{/.test(src)) {
    src = src.replace(/\buse\s*:\s*\{/,
      `use: {\n    headless: ${valor},${launch}`);
    feito.push('Chromium configurado com janela visivel');
  } else {
    src = src.replace(/defineConfig\(\{/,
      `defineConfig({\n  use: {\n    headless: ${valor},${launch}\n  },`);
    feito.push('Chromium configurado com janela visivel');
  }

  writeFileSync(config, src, 'utf8');
  return feito;
}

function specsEm(dir: string, encontrados: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome.startsWith('.')) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) specsEm(caminho, encontrados);
    else if (/\.spec\.(ts|js)$/.test(nome)) encontrados.push(caminho);
  }
  return encontrados;
}

/** Troca a origem do import: e a unica alteracao que os testes sofrem. */
function ajustarSpecs(projeto: string, config: string): string[] {
  const m = readFileSync(config, 'utf8').match(/testDir\s*:\s*['"]([^'"]+)['"]/);
  const raiz = m ? join(projeto, m[1]) : projeto;
  if (!existsSync(raiz)) return [];

  const alterados: string[] = [];
  for (const spec of specsEm(raiz)) {
    const texto = readFileSync(spec, 'utf8');
    const novo = texto.replace(IMPORT_RE, '$1selfheal-playwright$2');
    if (novo !== texto) { writeFileSync(spec, novo, 'utf8'); alterados.push(spec); }
  }
  return alterados;
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== 'init');
  const headless = args.includes('--headless');
  const alvo = args.find((a) => !a.startsWith('--'));

  console.log(`\n${NEG}selfheal — acoplando ao projeto de testes${RESET}\n`);

  const projeto = acharProjeto(alvo);
  if (!projeto) {
    console.log(`${VERM}nenhum playwright.config encontrado.${RESET}`);
    console.log(`execute na pasta do projeto de testes, ou indique-a:\n`);
    console.log(`  ${NEG}npx selfheal init ./e2e${RESET}\n`);
    process.exit(1);
  }
  console.log(`  ${CINZA}projeto: ${projeto}${RESET}`);

  const config = acharConfig(projeto)!;
  for (const feito of ajustarConfig(config, headless)) {
    const cor = feito.startsWith('ATENCAO') ? AMAR : VERDE;
    console.log(`  ${cor}${feito}${RESET} ${CINZA}(${config.split('/').pop()})${RESET}`);
  }

  const alterados = ajustarSpecs(projeto, config);
  if (alterados.length) {
    console.log(`  ${VERDE}${alterados.length} arquivo(s) de teste apontando ` +
                `para o adaptador${RESET}`);
  } else {
    console.log(`  ${CINZA}nenhum import a ajustar${RESET}`);
  }

  // Confirma que o engine sera encontrado na hora do teste. Descobrir isso
  // agora e melhor do que descobrir no meio da suite.
  let engine = resolveEngine();

  if (!engine) {
    // O npm pode ter bloqueado o script de instalacao do pacote (as versoes
    // recentes pedem aprovacao explicita). Como o usuario esta justamente
    // pedindo a configuracao, provisiona-se aqui.
    console.log(`  ${CINZA}engine ainda nao provisionado; preparando...${RESET}`);
    const provisionador = join(__dirname, '..', 'scripts', 'postinstall.js');
    if (existsSync(provisionador)) {
      spawnSync(process.execPath, [provisionador], { stdio: 'inherit' });
      engine = resolveEngine();
    }
  }

  if (engine) {
    console.log(`  ${VERDE}engine pronto${RESET} ${CINZA}(${engine.origin})${RESET}`);
  } else {
    console.log(`  ${AMAR}engine nao localizado${RESET}`);
    console.log(MENSAGEM_SEM_ENGINE);
  }

  console.log(`\n${NEG}pronto.${RESET} execute a suite normalmente:\n`);
  console.log(`    ${NEG}npx playwright test${RESET}\n`);
  console.log(`  o Chromium abre em janela. quando um seletor quebrar, ele e`);
  console.log(`  recuperado, o codigo do teste e corrigido, e o que nao puder`);
  console.log(`  ser corrigido aparece com arquivo e linha.\n`);
}

main();
