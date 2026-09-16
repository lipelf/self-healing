"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MENSAGEM_SEM_ENGINE = void 0;
exports.findBundledBinary = findBundledBinary;
exports.findManagedVenv = findManagedVenv;
exports.pythonHasEngine = pythonHasEngine;
exports.findSystemPython = findSystemPython;
exports.resolveEngine = resolveEngine;
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
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
/** Raiz do pacote instalado (…/node_modules/selfheal-playwright). */
function packageRoot() {
    // __dirname aponta para dist/ dentro do pacote.
    return (0, node_path_1.join)(__dirname, '..');
}
function platformKey() {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return `selfheal-engine-${process.platform}-${process.arch}${ext}`;
}
/** 1. Binario standalone embutido: o caminho que dispensa Python. */
function findBundledBinary() {
    const caminho = (0, node_path_1.join)(packageRoot(), 'bin', platformKey());
    return (0, node_fs_1.existsSync)(caminho) ? caminho : null;
}
/** 2. Ambiente virtual criado pelo postinstall do proprio pacote. */
function findManagedVenv() {
    const bin = process.platform === 'win32'
        ? (0, node_path_1.join)('Scripts', 'python.exe')
        : (0, node_path_1.join)('bin', 'python3');
    const caminho = (0, node_path_1.join)(packageRoot(), '.venv', bin);
    return (0, node_fs_1.existsSync)(caminho) ? caminho : null;
}
/** Confere se um interpretador consegue importar o engine. */
function pythonHasEngine(python) {
    try {
        const res = (0, node_child_process_1.spawnSync)(python, ['-c', 'import selfheal'], { stdio: 'ignore', timeout: 15000 });
        return res.status === 0;
    }
    catch {
        return false;
    }
}
/** 3. Python do sistema com o engine ja instalado. */
function findSystemPython() {
    const candidatos = ['python3.13', 'python3', 'python'];
    for (const python of candidatos) {
        if (pythonHasEngine(python))
            return python;
    }
    return null;
}
function resolveEngine(explicitPython) {
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
exports.MENSAGEM_SEM_ENGINE = [
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
