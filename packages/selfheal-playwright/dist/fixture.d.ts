/**
 * Fixture que envolve a `page` do Playwright.
 *
 * A ideia central: o teste continua sendo escrito exatamente como antes.
 * Quando uma acao falha porque o seletor nao encontrou o elemento, este
 * envoltorio intercepta a falha antes que ela derrube o teste, pergunta ao
 * engine qual e o elemento correspondente na pagina atual e registra a
 * correcao para que o codigo do teste seja reescrito ao final da execucao.
 */
import { expect } from '@playwright/test';
export interface SelfHealOptions {
    enabled?: boolean;
    /**
     * true (padrao): apos recuperar, a acao prossegue com o novo seletor e o
     * teste segue verde na mesma execucao. false: a falha e mantida visivel e
     * apenas o primeiro seletor de cada teste e corrigido por execucao.
     */
    autoRetry?: boolean;
    /**
     * Quanto esperar por um elemento antes de tentar recupera-lo, em ms.
     * Sem esse limite a acao consumiria o timeout inteiro do teste e o
     * Playwright abortaria antes que a recuperacao pudesse acontecer.
     */
    healTimeout?: number;
    python?: string;
    knowledge?: string;
    threshold?: number;
    margin?: number;
}
export declare const test: import("@playwright/test").TestType<import("@playwright/test").PlaywrightTestArgs & import("@playwright/test").PlaywrightTestOptions & {
    selfheal: SelfHealOptions;
    page: any;
}, import("@playwright/test").PlaywrightWorkerArgs & import("@playwright/test").PlaywrightWorkerOptions>;
export { expect };
