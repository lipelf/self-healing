import { test as base, expect } from '@playwright/test';
import { collectCandidates, describeSelector, describeLocator } from './collector';
import { getBridge } from './bridge-client';
import { recordFix, recordMiss } from './store';

const SELECTOR_METHODS = [
  'click', 'fill', 'type', 'press', 'check', 'uncheck', 'hover',
  'selectOption', 'focus', 'tap', 'dblclick', 'setInputFiles',
  'textContent', 'inputValue', 'getAttribute', 'isVisible', 'isEnabled',
  'isChecked', 'waitForSelector',
];

const LOCATOR_METHODS = [
  'click', 'fill', 'type', 'press', 'check', 'uncheck', 'hover',
  'selectOption', 'focus', 'tap', 'dblclick', 'setInputFiles',
  'textContent', 'inputValue', 'getAttribute', 'isVisible', 'isEnabled',
  'isChecked',
];

const CHAVE_GETBY: Record<string, (args: any[]) => string | null> = {
  getByTestId:      (a) => (typeof a[0] === 'string' ? `getByTestId=${a[0]}` : null),
  getByText:        (a) => (typeof a[0] === 'string' ? `getByText=${a[0]}` : null),
  getByLabel:       (a) => (typeof a[0] === 'string' ? `getByLabel=${a[0]}` : null),
  getByPlaceholder: (a) => (typeof a[0] === 'string' ? `getByPlaceholder=${a[0]}` : null),
  getByAltText:     (a) => (typeof a[0] === 'string' ? `getByAltText=${a[0]}` : null),
  getByTitle:       (a) => (typeof a[0] === 'string' ? `getByTitle=${a[0]}` : null),
  getByRole:        (a) => {
    if (typeof a[0] !== 'string') return null;
    const nome = a[1]?.name;
    if (nome === undefined) return `getByRole=${a[0]}`;
    return typeof nome === 'string' ? `getByRole=${a[0]}|${nome}` : null;
  },
};

function withTimeout(args: any[], timeout: number): any[] {
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

function isNotFound(err: any): boolean {
  const msg = String(err?.message || '');
  return /Timeout.*exceeded|waiting for locator|strict mode violation|no element|not found|failed to find element|element\(s\) not found/i
    .test(msg);
}

export interface SelfHealOptions {
  enabled?: boolean;
  autoRetry?: boolean;
  // Quanto esperar por um elemento antes de tentar recupera-lo. Sem esse
  // limite a acao consumiria o timeout inteiro do teste e o Playwright
  // abortaria antes que a recuperacao pudesse acontecer.
  healTimeout?: number;
  python?: string;
  knowledge?: string;
  threshold?: number;
  margin?: number;
}

export const test = base.extend<{ selfheal: SelfHealOptions; page: any }>({
  selfheal: [{ enabled: true, autoRetry: true, healTimeout: 2000 }, { option: true }],

  page: async ({ page, selfheal }, use, testInfo) => {
    if (selfheal?.enabled === false) { await use(page); return; }

    const bridge = getBridge(selfheal);
    const healed = new Map<string, string>();
    const learning: Promise<any>[] = [];
    const seen = new Set<string>();
    const testFile = testInfo.file;
    const testName = testInfo.title;

    // Fotografa o elemento SEM gravar. Clicar ou preencher pode alterar o
    // proprio elemento ou o texto a sua volta, e memorizar o estado posterior
    // gravaria um caso transitorio, levando a recuperacao seguinte a casar
    // com o elemento errado.
    const fotografar = async (selector: string) => {
      try {
        return await describeSelector(page, selector);
      } catch {
        return null;
      }
    };

    const gravar = (selector: string, descritor: any) => {
      if (!descritor) return;
      const task = (async () => {
        try {
          await bridge.remember(selector, descritor);
        } catch (e) {
          if (process.env.SELFHEAL_DEBUG) {
            console.error(`[selfheal] erro ao gravar ${selector}: ${e}`);
          }
        }
      })();
      learning.push(task);
      return task;
    };

    const learn = (selector: string, previa?: any) => {
      if (previa) return gravar(selector, previa);
      const task = (async () => {
        try {
          const d = await describeSelector(page, selector);
          if (d) await bridge.remember(selector, d);
          else if (process.env.SELFHEAL_DEBUG) {
            console.error(`[selfheal] nao descreveu ${selector}`);
          }
        } catch (e) {
          if (process.env.SELFHEAL_DEBUG) {
            console.error(`[selfheal] erro ao aprender ${selector}: ${e}`);
          }
        }
      })();
      learning.push(task);
      return task;
    };

    const learnLocator = (chave: string, locator: any) => {
      const task = (async () => {
        try {
          const d = await describeLocator(page, locator);
          if (d) await bridge.remember(chave, d);
        } catch {}
      })();
      learning.push(task);
      return task;
    };

    const wrapLocator = (locator: any, chave: string): any => new Proxy(locator, {
      get(alvo, prop: string, receptor) {
        const original = Reflect.get(alvo, prop, receptor);
        if (typeof original !== 'function') return original;
        if (!LOCATOR_METHODS.includes(prop)) return original.bind(alvo);

        return async (...args: any[]) => {
          let previa: any = null;
          try { previa = await describeLocator(page, alvo); } catch { previa = null; }
          try {
            const r = await original.apply(alvo, withTimeout(args, limite));
            if (previa) gravar(chave, previa); else learnLocator(chave, alvo);
            return r;
          } catch (err) {
            if (!isNotFound(err)) throw err;
            const novo = await recover(chave);
            if (!novo) return original.apply(alvo, args);
            if (selfheal?.autoRetry) {
              const substituto = page.locator(novo);
              const r = await substituto[prop](...args);
              seen.add(novo); learn(novo);
              return r;
            }
            throw err;
          }
        };
      },
    });

    const recover = async (selector: string): Promise<string | null> => {
      if (healed.has(selector)) return healed.get(selector)!;
      let candidates: any[] = [];
      try { candidates = await collectCandidates(page); } catch { return null; }

      const res = await bridge.heal(selector, candidates);
      if (!res?.healed || !res.new_selector) {
        recordMiss({ file: testFile, old: selector, test: testName,
                     reason: res?.reason || 'desconhecido', score: res?.score });
        return null;
      }

      healed.set(selector, res.new_selector);
      recordFix({
        file: testFile, old: selector, new: res.new_selector,
        score: res.score!, margin: res.margin, test: testName,
        element: res.element, breakdown: res.breakdown,
        duration_ms: res.duration_ms,
      });
      console.log(
        `  [selfheal] ${selector} -> ${res.new_selector} ` +
        `(similaridade ${res.score!.toFixed(3)})`);
      return res.new_selector;
    };

    const limite = selfheal?.healTimeout ?? 2000;

    const proxy = new Proxy(page, {
      get(target, prop: string, receiver) {
        const original = Reflect.get(target, prop, receiver);

        if (CHAVE_GETBY[prop] && typeof original === 'function') {
          return (...args: any[]) => {
            const chave = CHAVE_GETBY[prop](args);
            if (!chave) return original.apply(target, args);
            seen.add(chave);
            const novo = healed.get(chave);
            if (novo) return target.locator(novo);
            learnLocator(chave, original.apply(target, args));
            return wrapLocator(original.apply(target, args), chave);
          };
        }

        if (prop === 'locator' && typeof original === 'function') {
          return (...args: any[]) => {
            const sel = args[0];
            if (typeof sel === 'string') {
              seen.add(sel);
              const novo = healed.get(sel);
              if (novo) return original.apply(target, [novo, ...args.slice(1)]);
              learn(sel);
            }
            return original.apply(target, args);
          };
        }

        if (typeof original !== 'function' || !SELECTOR_METHODS.includes(prop)) {
          return typeof original === 'function' ? original.bind(target) : original;
        }

        return async (...args: any[]) => {
          const selector = args[0];
          if (typeof selector !== 'string') return original.apply(target, args);

          const previa = await fotografar(selector);   // antes de agir

          try {
            const result = await original.apply(target, withTimeout(args, limite));
            seen.add(selector); learn(selector, previa);
            return result;
          } catch (err) {
            if (!isNotFound(err)) throw err;

            const novo = await recover(selector);

            if (!novo) {
              return original.apply(target, args);
            }

            if (selfheal?.autoRetry) {
              const r = await original.apply(target, [novo, ...args.slice(1)]);
              seen.add(novo); learn(novo);
              return r;
            }
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
      const daMensagem = new Set<string>();
      for (const e of erros) {
        const msg = String((e as any)?.message || '');
        for (const m of msg.matchAll(/locator\('([^']+)'\)/g)) daMensagem.add(m[1]);
      }
      for (const sel of daMensagem) {
        if (healed.has(sel)) continue;
        try {
          if (await page.$(sel)) continue;   // ainda existe: nao e este o problema
          await recover(sel);
        } catch { /* nao atrapalha o encerramento do teste */ }
      }
    }

    await bridge.save();
  },
});

export { expect };
