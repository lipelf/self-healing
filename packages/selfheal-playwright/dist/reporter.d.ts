/**
 * Reporter que aplica as correcoes ao final da suite e resume o que mudou.
 *
 * A reescrita acontece uma unica vez, depois que todos os workers terminaram,
 * evitando que dois processos editem o mesmo arquivo simultaneamente.
 *
 * Tres responsabilidades: corrigir o que da para corrigir, apontar a linha
 * exata do que nao da, e consolidar a execucao em .selfheal/report.json —
 * arquivo que alimenta `selfheal report` e `selfheal table`.
 */
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
export default class SelfHealReporter implements Reporter {
    private apply;
    private reportPath;
    private total;
    private falharam;
    private titulosComFalha;
    constructor(options?: {
        apply?: boolean;
        report?: string;
    });
    onBegin(): void;
    onTestEnd(test: TestCase, result: TestResult): void;
    onEnd(): Promise<void>;
}
