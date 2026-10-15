#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Acopla o self-healing a um projeto Playwright existente.
 *
 * Registra o reporter, liga o Chromium em janela e troca a origem do import
 * nos arquivos de teste. Depois disso a suite continua sendo executada com
 * `npx playwright test`, exatamente como antes.
 */
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
const engine_resolver_1 = require("./engine-resolver");
const VERDE = '\x1b[32m', AMAR = '\x1b[33m', VERM = '\x1b[31m';
const NEG = '\x1b[1m', CINZA = '\x1b[2m', RESET = '\x1b[0m';
const CONFIGS = ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs'];
const REPORTER = "['selfheal-playwright/dist/reporter']";
const IMPORT_RE = /(import\s*\{[^}]*\}\s*from\s*['"])@playwright\/test(['"])/g;
function acharConfig(dir) {
    return CONFIGS.map((c) => (0, node_path_1.join)(dir, c)).find(node_fs_1.existsSync) || null;
}
/** Procura o projeto de testes na pasta atual ou nas subpastas usuais. */
function acharProjeto(indicado) {
    if (indicado)
        return acharConfig(indicado) ? indicado : null;
    const aqui = process.cwd();
    if (acharConfig(aqui))
        return aqui;
    for (const nome of ['e2e', 'tests', 'test', 'integration']) {
        const cand = (0, node_path_1.join)(aqui, nome);
        if ((0, node_fs_1.existsSync)(cand) && (0, node_fs_1.statSync)(cand).isDirectory() && acharConfig(cand)) {
            return cand;
        }
    }
    return null;
}
/** Registra o reporter e o Chromium com janela, preservando o que ja existe. */
function ajustarConfig(config, headless) {
    let src = (0, node_fs_1.readFileSync)(config, 'utf8');
    const feito = [];
    if (src.includes('selfheal-playwright/dist/reporter')) {
        feito.push('reporter ja estava registrado');
    }
    else if (/reporter\s*:/.test(src)) {
        feito.push(`ATENCAO: ja existe um "reporter" — acrescente ${REPORTER} a lista`);
    }
    else {
        src = src.replace(/defineConfig\(\{/, `defineConfig({\n  reporter: [['list'], ${REPORTER}],`);
        feito.push('reporter registrado');
    }
    const valor = headless ? 'true' : "process.env.HEADLESS === '1'";
    const launch = '\n    launchOptions: { slowMo: Number(process.env.SELFHEAL_SLOWMO ?? 150) },';
    if (/headless\s*:/.test(src)) {
        feito.push('headless ja estava definido — nao foi alterado');
    }
    else if (/\buse\s*:\s*\{/.test(src)) {
        src = src.replace(/\buse\s*:\s*\{/, `use: {\n    headless: ${valor},${launch}`);
        feito.push('Chromium configurado com janela visivel');
    }
    else {
        src = src.replace(/defineConfig\(\{/, `defineConfig({\n  use: {\n    headless: ${valor},${launch}\n  },`);
        feito.push('Chromium configurado com janela visivel');
    }
    (0, node_fs_1.writeFileSync)(config, src, 'utf8');
    return feito;
}
const GITIGNORE = [
    '',
    '# selfheal — a base de conhecimento e entrada, nao saida.',
    '# Sem ela a ferramenta nao tem com o que comparar e nao recupera nada, de',
    '# modo que versiona-la e o que permite o self-healing funcionar em',
    '# integracao continua, onde cada execucao parte de uma maquina limpa.',
    // O prefixo ** e necessario: um padrao com barra no meio fica ancorado na
    // raiz do repositorio e nao cobriria .selfheal/ dentro da pasta de testes.
    '**/.selfheal/*',
    '!**/.selfheal/knowledge.json',
    '',
].join('\n');
/** Garante que a base de conhecimento seja versionada, e o resto ignorado. */
function ajustarGitignore(projeto) {
    // Procura o .gitignore do repositorio, que pode estar acima da pasta de
    // testes quando ela e um subdiretorio do projeto.
    let dir = projeto;
    for (let i = 0; i < 4; i++) {
        const caminho = (0, node_path_1.join)(dir, '.gitignore');
        if ((0, node_fs_1.existsSync)(caminho)) {
            const texto = (0, node_fs_1.readFileSync)(caminho, 'utf8');
            if (texto.includes('!**/.selfheal/knowledge.json')) {
                return 'base de conhecimento ja versionada (.gitignore)';
            }
            if (/^\.selfheal\/?\s*$/m.test(texto)) {
                // Regra existente ignora a base inteira: abre excecao para ela.
                (0, node_fs_1.writeFileSync)(caminho, texto.replace(/^\.selfheal\/?\s*$/m, '**/.selfheal/*\n!**/.selfheal/knowledge.json'), 'utf8');
                return 'base de conhecimento passou a ser versionada (.gitignore)';
            }
            (0, node_fs_1.writeFileSync)(caminho, texto.replace(/\n*$/, '\n') + GITIGNORE, 'utf8');
            return 'base de conhecimento versionada (.gitignore)';
        }
        const pai = (0, node_path_1.dirname)(dir);
        if (pai === dir)
            break;
        dir = pai;
    }
    // Sem .gitignore: cria um, mas apenas onde ha um repositorio. Em um projeto
    // que nao usa git o arquivo seria lixo, e a regra nao teria efeito algum.
    let raiz = projeto;
    for (let i = 0; i < 4; i++) {
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(raiz, '.git'))) {
            (0, node_fs_1.writeFileSync)((0, node_path_1.join)(raiz, '.gitignore'), GITIGNORE.replace(/^\n/, ''), 'utf8');
            return 'base de conhecimento versionada (.gitignore criado)';
        }
        const pai = (0, node_path_1.dirname)(raiz);
        if (pai === raiz)
            break;
        raiz = pai;
    }
    return null;
}
function specsEm(dir, encontrados = []) {
    for (const nome of (0, node_fs_1.readdirSync)(dir)) {
        if (nome === 'node_modules' || nome.startsWith('.'))
            continue;
        const caminho = (0, node_path_1.join)(dir, nome);
        if ((0, node_fs_1.statSync)(caminho).isDirectory())
            specsEm(caminho, encontrados);
        else if (/\.spec\.(ts|js)$/.test(nome))
            encontrados.push(caminho);
    }
    return encontrados;
}
/** Troca a origem do import: e a unica alteracao que os testes sofrem. */
function ajustarSpecs(projeto, config) {
    const m = (0, node_fs_1.readFileSync)(config, 'utf8').match(/testDir\s*:\s*['"]([^'"]+)['"]/);
    const raiz = m ? (0, node_path_1.join)(projeto, m[1]) : projeto;
    if (!(0, node_fs_1.existsSync)(raiz))
        return [];
    const alterados = [];
    for (const spec of specsEm(raiz)) {
        const texto = (0, node_fs_1.readFileSync)(spec, 'utf8');
        const novo = texto.replace(IMPORT_RE, '$1selfheal-playwright$2');
        if (novo !== texto) {
            (0, node_fs_1.writeFileSync)(spec, novo, 'utf8');
            alterados.push(spec);
        }
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
    const config = acharConfig(projeto);
    for (const feito of ajustarConfig(config, headless)) {
        const cor = feito.startsWith('ATENCAO') ? AMAR : VERDE;
        console.log(`  ${cor}${feito}${RESET} ${CINZA}(${config.split('/').pop()})${RESET}`);
    }
    const alterados = ajustarSpecs(projeto, config);
    if (alterados.length) {
        console.log(`  ${VERDE}${alterados.length} arquivo(s) de teste apontando ` +
            `para o adaptador${RESET}`);
    }
    else {
        console.log(`  ${CINZA}nenhum import a ajustar${RESET}`);
    }
    const git = ajustarGitignore(projeto);
    if (git)
        console.log(`  ${VERDE}${git}${RESET}`);
    // Confirma que o engine sera encontrado na hora do teste. Descobrir isso
    // agora e melhor do que descobrir no meio da suite.
    let engine = (0, engine_resolver_1.resolveEngine)();
    if (!engine) {
        // O npm pode ter bloqueado o script de instalacao do pacote (as versoes
        // recentes pedem aprovacao explicita). Como o usuario esta justamente
        // pedindo a configuracao, provisiona-se aqui.
        console.log(`  ${CINZA}engine ainda nao provisionado; preparando...${RESET}`);
        const provisionador = (0, node_path_1.join)(__dirname, '..', 'scripts', 'postinstall.js');
        if ((0, node_fs_1.existsSync)(provisionador)) {
            (0, node_child_process_1.spawnSync)(process.execPath, [provisionador], { stdio: 'inherit' });
            engine = (0, engine_resolver_1.resolveEngine)();
        }
    }
    if (engine) {
        console.log(`  ${VERDE}engine pronto${RESET} ${CINZA}(${engine.origin})${RESET}`);
    }
    else {
        console.log(`  ${AMAR}engine nao localizado${RESET}`);
        console.log(engine_resolver_1.MENSAGEM_SEM_ENGINE);
    }
    console.log(`\n${NEG}pronto.${RESET} execute a suite normalmente:\n`);
    console.log(`    ${NEG}npx playwright test${RESET}\n`);
    console.log(`  o Chromium abre em janela. quando um seletor quebrar, ele e`);
    console.log(`  recuperado, o codigo do teste e corrigido, e o que nao puder`);
    console.log(`  ser corrigido aparece com arquivo e linha.\n`);
}
main();
