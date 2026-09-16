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
import { basename } from 'node:path';
import { existsSync } from 'node:fs';
import { getBridge } from './bridge-client';
import { clearPending, readFixes, readMisses } from './store';

const VERDE = '\x1b[32m', VERM = '\x1b[31m', AMAR = '\x1b[33m';
const CINZA = '\x1b[2m', RESET = '\x1b[0m', NEG = '\x1b[1m';

export default class SelfHealReporter implements Reporter {
  private apply: boolean;
  private reportPath: string;
  private total = 0;
  private falharam = 0;
  private titulosComFalha = new Set<string>();

  constructor(options: { apply?: boolean; report?: string } = {}) {
    // Por padrao corrige o codigo. Use { apply: false } para so sugerir.
    this.apply = options.apply !== false;
    this.reportPath = options.report || '.selfheal/report.json';
  }

  onBegin() { clearPending(); }

  onTestEnd(test: TestCase, result: TestResult) {
    this.total++;
    if (result.status !== 'passed' && result.status !== 'skipped') {
      this.falharam++;
      this.titulosComFalha.add(test.title);
    }
  }

  async onEnd() {
    const fixes = readFixes();
    const misses = readMisses();

    // Uma execucao sem correcoes ainda interessa quando ha uma campanha em
    // andamento: e ela que registra o desfecho — a suite voltou ao verde.
    const campanha = existsSync(this.reportPath);
    if (!fixes.length && !misses.length && !campanha) return;

    const bridge = getBridge();
    if (!fixes.length && !misses.length) {
      await bridge.report({ path: this.reportPath, fixes: [], misses: [],
        suite: { total: this.total, passed: this.total - this.falharam,
                 failed: this.falharam,
                 failed_without_healing: this.titulosComFalha.size } });
      await bridge.close();
      return;
    }

    console.log(`\n${NEG}${'='.repeat(64)}${RESET}`);
    console.log(`${NEG}  SELF-HEALING${RESET}`);
    console.log(`${NEG}${'='.repeat(64)}${RESET}`);

    let applied: any[] = [];

    if (fixes.length) {
      if (this.apply) {
        const res = await bridge.apply(
          fixes.map((f) => ({ file: f.file, old: f.old, new: f.new })));
        applied = res?.applied || [];
      }

      for (const f of fixes) {
        const info = applied.find((a) => a.old === f.old);
        if (info?.line) f.line = info.line;
        const local = f.line
          ? `${CINZA}${basename(f.file)}:${f.line}${RESET}`
          : '';
        console.log(
          `  ${VERM}${f.old}${RESET} ${CINZA}->${RESET} ${VERDE}${f.new}${RESET}` +
          `  ${CINZA}similaridade ${f.score.toFixed(3)}${RESET}  ${local}`);
      }

      const total = fixes.length;
      if (this.apply) {
        const ok = applied.filter((a) => a.applied).length;
        console.log(`\n  ${VERDE}${ok} de ${total} seletor(es) corrigido(s) ` +
                    `permanentemente no codigo.${RESET}`);
        console.log(`  ${NEG}execute a suite novamente para confirmar.${RESET}`);
      } else {
        console.log(`\n  ${AMAR}${total} correcao(oes) sugerida(s).${RESET}`);
        console.log(`  aplique com: ${NEG}selfheal apply${RESET}`);
      }
    }

    if (misses.length) {
      // A ferramenta se absteve. Ela nao corrige, mas aponta a linha exata:
      // sem isso o tester teria de caçar o seletor pela suite inteira.
      const locais = await bridge.locate(
        misses.map((m) => ({ file: m.file, selector: m.old })));
      for (const m of misses) {
        const achado = (locais?.located || []).find(
          (l: any) => l.selector === m.old && l.file === m.file);
        if (achado?.lines?.length) m.line = achado.lines[0];
      }

      console.log(`\n  ${AMAR}nao recuperados — exigem correcao manual:${RESET}`);
      for (const m of misses) {
        const onde = m.file
          ? `${basename(m.file)}${m.line ? `:${m.line}` : ''}`
          : 'local nao identificado';
        console.log(
          `    ${VERM}${m.old}${RESET}  ${NEG}${onde}${RESET}\n` +
          `      ${CINZA}motivo: ${m.reason}${
            m.score ? `, melhor similaridade ${m.score.toFixed(3)}` : ''
          }${RESET}`);
      }
    }

    // Consolida tudo em disco: e daqui que saem `selfheal report` e
    // `selfheal table`. Sem esta etapa a execucao se perde ao terminar.
    const semHealing = new Set<string>(this.titulosComFalha);
    for (const f of fixes) if (f.test) semHealing.add(f.test);
    for (const m of misses) if (m.test) semHealing.add(m.test);

    const res = await bridge.report({
      path: this.reportPath,
      fixes: fixes.map((f) => ({
        ...f, applied: applied.some((a) => a.old === f.old && a.applied),
      })),
      misses,
      suite: {
        total: this.total,
        passed: this.total - this.falharam,
        failed: this.falharam,
        // Quantos testes falhariam sem a ferramenta: os que ja falharam mais
        // os que so passaram porque um seletor foi recuperado em tempo real.
        failed_without_healing: semHealing.size,
      },
    });

    if (res?.ok) {
      console.log(`\n  ${CINZA}relatorio: ${res.path}${RESET}`);
      console.log(`  ${CINZA}tabela comparativa: ${NEG}selfheal table${RESET}`);
    }

    await bridge.close();
    console.log(`${NEG}${'='.repeat(64)}${RESET}\n`);
  }
}
