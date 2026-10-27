"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = exports.test = void 0;
/**
 * Fixture que envolve a `page` do Playwright.
 *
 * A ideia central: o teste continua sendo escrito exatamente como antes.
 * Quando uma acao falha porque o seletor nao encontrou o elemento, este
 * envoltorio intercepta a falha antes que ela derrube o teste, pergunta ao
 * engine qual e o elemento correspondente na pagina atual e registra a
 * correcao para que o codigo do teste seja reescrito ao final da execucao.
 */
const test_1 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_1.expect; } });
const collector_1 = require("./collector");
const bridge_client_1 = require("./bridge-client");
const store_1 = require("./store");
// Metodos de `page` cujo primeiro argumento e um seletor.
const SELECTOR_METHODS = [
    'click', 'fill', 'type', 'press', 'check', 'uncheck', 'hover',
    'selectOption', 'focus', 'tap', 'dblclick', 'setInputFiles',
    'textContent', 'inputValue', 'getAttribute', 'isVisible', 'isEnabled',
    'isChecked', 'waitForSelector',
];
// Acoes chamadas sobre um Locator, e nao sobre a page. Sao estas que precisam
// ser envolvidas quando o teste usa localizadores semanticos.
const LOCATOR_METHODS = [
    'click', 'fill', 'type', 'press', 'check', 'uncheck', 'hover',
    'selectOption', 'focus', 'tap', 'dblclick', 'setInputFiles',
    'textContent', 'inputValue', 'getAttribute', 'isVisible', 'isEnabled',
    'isChecked',
];
/**
 * Chave canonica para um localizador semantico.
 *
 * O Locator devolvido pelo Playwright e usado tal e qual, preservando a
 * semantica de correspondencia do framework. Esta chave serve apenas para
 * indexar a base de conhecimento e para reencontrar a chamada no codigo-fonte
 * na hora da reescrita. Quando os argumentos nao sao textos simples, por
 * exemplo expressoes regulares, devolve-se null e o localizador segue sem
 * acompanhamento, em vez de se registrar uma chave ambigua.
 */
const CHAVE_GETBY = {
    getByTestId: (a) => (typeof a[0] === 'string' ? `getByTestId=${a[0]}` : null),
    getByText: (a) => (typeof a[0] === 'string' ? `getByText=${a[0]}` : null),
    getByLabel: (a) => (typeof a[0] === 'string' ? `getByLabel=${a[0]}` : null),
    getByPlaceholder: (a) => (typeof a[0] === 'string' ? `getByPlaceholder=${a[0]}` : null),
    getByAltText: (a) => (typeof a[0] === 'string' ? `getByAltText=${a[0]}` : null),
    getByTitle: (a) => (typeof a[0] === 'string' ? `getByTitle=${a[0]}` : null),
    getByRole: (a) => {
        if (typeof a[0] !== 'string')
            return null;
        const nome = a[1]?.name;
        if (nome === undefined)
            return `getByRole=${a[0]}`;
        return typeof nome === 'string' ? `getByRole=${a[0]}|${nome}` : null;
    },
};
/**
 * Acrescenta um limite de espera a chamada, sem sobrescrever o que o usuario
 * tenha definido explicitamente.
 */
function withTimeout(args, timeout) {
    const copia = [...args];
    const ultimo = copia[copia.length - 1];
    const ehOpcoes = ultimo && typeof ultimo === 'object' && !Array.isArray(ultimo);
    if (ehOpcoes) {
        if (ultimo.timeout === undefined) {
            copia[copia.length - 1] = { ...ultimo, timeout };
        }
        return copia;
    }
    copia.push({ timeout });
    return copia;
}
function isNotFound(err) {
    const msg = String(err?.message || '');
    return /Timeout.*exceeded|waiting for locator|strict mode violation|no element|not found|failed to find element|element\(s\) not found/i
        .test(msg);
}
exports.test = test_1.test.extend({
    // autoRetry ligado: apos recuperar o seletor a acao prossegue, de modo que
    // uma unica execucao corrija todos os seletores quebrados do teste. Com ele
    // desligado, o teste para na primeira falha e so o primeiro e corrigido.
    selfheal: [{ enabled: true, autoRetry: true, healTimeout: 2000 }, { option: true }],
    page: async ({ page, selfheal }, use, testInfo) => {
        if (selfheal?.enabled === false) {
            await use(page);
            return;
        }
        const bridge = (0, bridge_client_1.getBridge)(selfheal);
        const healed = new Map(); // seletor antigo -> novo
        const learning = []; // aprendizados em voo
        const seen = new Set(); // seletores usados no teste
        const testFile = testInfo.file;
        const testName = testInfo.title;
        /** Aprende o elemento sempre que ele e encontrado com sucesso. */
        const learn = (selector) => {
            const task = (async () => {
                try {
                    const d = await (0, collector_1.describeSelector)(page, selector);
                    if (d)
                        await bridge.remember(selector, d);
                    else if (process.env.SELFHEAL_DEBUG) {
                        console.error(`[selfheal] nao descreveu ${selector}`);
                    }
                }
                catch (e) {
                    if (process.env.SELFHEAL_DEBUG) {
                        console.error(`[selfheal] erro ao aprender ${selector}: ${e}`);
                    }
                }
            })();
            learning.push(task);
            return task;
        };
        /** Aprende a partir de um Locator, para os localizadores semanticos. */
        const learnLocator = (chave, locator) => {
            const task = (async () => {
                try {
                    const d = await (0, collector_1.describeLocator)(page, locator);
                    if (d)
                        await bridge.remember(chave, d);
                }
                catch { /* elemento ausente agora: nada a memorizar */ }
            })();
            learning.push(task);
            return task;
        };
        /**
         * Envolve um Locator semantico para que a falha de uma acao dispare a
         * recuperacao. O Locator original e preservado: so quando ele falha por
         * nao encontrar o elemento e que se tenta o substituto.
         */
        const wrapLocator = (locator, chave) => new Proxy(locator, {
            get(alvo, prop, receptor) {
                const original = Reflect.get(alvo, prop, receptor);
                if (typeof original !== 'function')
                    return original;
                if (!LOCATOR_METHODS.includes(prop))
                    return original.bind(alvo);
                return async (...args) => {
                    try {
                        const r = await original.apply(alvo, withTimeout(args, limite));
                        learnLocator(chave, alvo);
                        return r;
                    }
                    catch (err) {
                        if (!isNotFound(err))
                            throw err;
                        const novo = await recover(chave);
                        if (!novo)
                            return original.apply(alvo, args);
                        if (selfheal?.autoRetry) {
                            const substituto = page.locator(novo);
                            const r = await substituto[prop](...args);
                            seen.add(novo);
                            learn(novo);
                            return r;
                        }
                        throw err;
                    }
                };
            },
        });
        /** Tenta descobrir o substituto de um seletor que falhou. */
        const recover = async (selector) => {
            if (healed.has(selector))
                return healed.get(selector);
            let candidates = [];
            try {
                candidates = await (0, collector_1.collectCandidates)(page);
            }
            catch {
                return null;
            }
            const res = await bridge.heal(selector, candidates);
            if (!res?.healed || !res.new_selector) {
                (0, store_1.recordMiss)({ file: testFile, old: selector, test: testName,
                    reason: res?.reason || 'desconhecido', score: res?.score });
                return null;
            }
            healed.set(selector, res.new_selector);
            (0, store_1.recordFix)({
                file: testFile, old: selector, new: res.new_selector,
                score: res.score, margin: res.margin, test: testName,
                element: res.element, breakdown: res.breakdown,
                duration_ms: res.duration_ms,
            });
            console.log(`  [selfheal] ${selector} -> ${res.new_selector} ` +
                `(similaridade ${res.score.toFixed(3)})`);
            return res.new_selector;
        };
        const limite = selfheal?.healTimeout ?? 2000;
        const proxy = new Proxy(page, {
            get(target, prop, receiver) {
                const original = Reflect.get(target, prop, receiver);
                // Localizadores semanticos (getByRole, getByTestId e afins). O Locator
                // do Playwright e devolvido intacto, apenas envolvido, de modo que a
                // semantica de correspondencia do framework nao seja alterada.
                if (CHAVE_GETBY[prop] && typeof original === 'function') {
                    return (...args) => {
                        const chave = CHAVE_GETBY[prop](args);
                        if (!chave)
                            return original.apply(target, args);
                        seen.add(chave);
                        const novo = healed.get(chave);
                        if (novo)
                            return target.locator(novo);
                        learnLocator(chave, original.apply(target, args));
                        return wrapLocator(original.apply(target, args), chave);
                    };
                }
                // page.locator(sel) nao falha na criacao, so quando usado. Registra-se
                // o seletor para que ele possa ser aprendido e, se quebrar, recuperado.
                if (prop === 'locator' && typeof original === 'function') {
                    return (...args) => {
                        const sel = args[0];
                        if (typeof sel === 'string') {
                            seen.add(sel);
                            // Se este seletor ja foi recuperado durante o teste, entrega-se
                            // o substituto. E o que permite que assercoes como
                            // expect(page.locator(...)) passem ainda nesta execucao, ja que
                            // elas nao passam pelos metodos interceptados acima.
                            const novo = healed.get(sel);
                            if (novo)
                                return original.apply(target, [novo, ...args.slice(1)]);
                            learn(sel);
                        }
                        return original.apply(target, args);
                    };
                }
                if (typeof original !== 'function' || !SELECTOR_METHODS.includes(prop)) {
                    return typeof original === 'function' ? original.bind(target) : original;
                }
                return async (...args) => {
                    const selector = args[0];
                    if (typeof selector !== 'string')
                        return original.apply(target, args);
                    // Primeira tentativa com espera limitada, para que a recuperacao
                    // aconteca antes de o teste estourar o proprio timeout.
                    try {
                        const result = await original.apply(target, withTimeout(args, limite));
                        seen.add(selector);
                        learn(selector);
                        return result;
                    }
                    catch (err) {
                        if (!isNotFound(err))
                            throw err;
                        const novo = await recover(selector);
                        if (!novo) {
                            // Nada a corrigir: pode ser um elemento apenas lento. Repete a
                            // chamada com os parametros originais, honrando o tempo que o
                            // usuario configurou.
                            return original.apply(target, args);
                        }
                        if (selfheal?.autoRetry) {
                            // Retoma a acao com o seletor recuperado: o teste segue verde.
                            const r = await original.apply(target, [novo, ...args.slice(1)]);
                            seen.add(novo);
                            learn(novo);
                            return r;
                        }
                        // Sem retentativa: a falha permanece visivel, mas o codigo ja
                        // sera corrigido ao final da execucao.
                        throw err;
                    }
                };
            },
        });
        await use(proxy);
        await Promise.allSettled(learning);
        // Assercoes como expect(locator).toBeVisible() falham dentro do expect,
        // sem passar pelos metodos interceptados acima. A mensagem de erro do
        // Playwright, porem, cita o seletor: e dela que ele e extraido aqui.
        const erros = [testInfo.error, ...(testInfo.errors || [])].filter(Boolean);
        if (erros.length) {
            const daMensagem = new Set();
            for (const e of erros) {
                const msg = String(e?.message || '');
                for (const m of msg.matchAll(/locator\('([^']+)'\)/g))
                    daMensagem.add(m[1]);
            }
            for (const sel of daMensagem) {
                if (healed.has(sel))
                    continue;
                try {
                    if (await page.$(sel))
                        continue; // ainda existe: nao e este o problema
                    await recover(sel);
                }
                catch { /* nao atrapalha o encerramento do teste */ }
            }
        }
        await bridge.save();
    },
});
