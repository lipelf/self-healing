"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const bridge_client_1 = require("./bridge-client");
const store_1 = require("./store");
const VERDE = '\x1b[32m', VERM = '\x1b[31m', AMAR = '\x1b[33m';
const CINZA = '\x1b[2m', RESET = '\x1b[0m', NEG = '\x1b[1m';
class SelfHealReporter {
    apply;
    reportPath;
    total = 0;
    falharam = 0;
    titulosComFalha = new Set();
    constructor(options = {}) {
        // Por padrao corrige o codigo. Use { apply: false } para so sugerir.
        this.apply = options.apply !== false;
        this.reportPath = options.report || '.selfheal/report.json';
    }
    onBegin() { (0, store_1.clearPending)(); }
    onTestEnd(test, result) {
        this.total++;
        if (result.status !== 'passed' && result.status !== 'skipped') {
            this.falharam++;
            this.titulosComFalha.add(test.title);
        }
    }
    async onEnd() {
        const fixes = (0, store_1.readFixes)();
        const misses = (0, store_1.readMisses)();
        // Uma execucao sem correcoes ainda interessa quando ha uma campanha em
        // andamento: e ela que registra o desfecho — a suite voltou ao verde.
        const campanha = (0, node_fs_1.existsSync)(this.reportPath);
        if (!fixes.length && !misses.length && !campanha)
            return;
        const bridge = (0, bridge_client_1.getBridge)();
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
        let applied = [];
        if (fixes.length) {
            if (this.apply) {
                const res = await bridge.apply(fixes.map((f) => ({ file: f.file, old: f.old, new: f.new,
                    // texto do elemento escolhido: e o que
                    // substitui o argumento de um getBy*
                    text: f.element?.text })));
                applied = res?.applied || [];
            }
            for (const f of fixes) {
                const info = applied.find((a) => a.old === f.old);
                if (info?.line)
                    f.line = info.line;
                const local = f.line
                    ? `${CINZA}${(0, node_path_1.basename)(f.file)}:${f.line}${RESET}`
                    : '';
                console.log(`  ${VERM}${f.old}${RESET} ${CINZA}->${RESET} ${VERDE}${f.new}${RESET}` +
                    `  ${CINZA}similaridade ${f.score.toFixed(3)}${RESET}  ${local}`);
            }
            const total = fixes.length;
            if (this.apply) {
                const ok = applied.filter((a) => a.applied).length;
                console.log(`\n  ${VERDE}${ok} de ${total} seletor(es) corrigido(s) ` +
                    `permanentemente no codigo.${RESET}`);
                console.log(`  ${NEG}execute a suite novamente para confirmar.${RESET}`);
            }
            else {
                console.log(`\n  ${AMAR}${total} correcao(oes) sugerida(s).${RESET}`);
                console.log(`  aplique com: ${NEG}selfheal apply${RESET}`);
            }
        }
        if (misses.length) {
            // A ferramenta se absteve. Ela nao corrige, mas aponta a linha exata:
            // sem isso o tester teria de caçar o seletor pela suite inteira.
            const locais = await bridge.locate(misses.map((m) => ({ file: m.file, selector: m.old })));
            for (const m of misses) {
                const achado = (locais?.located || []).find((l) => l.selector === m.old && l.file === m.file);
                if (achado?.lines?.length)
                    m.line = achado.lines[0];
            }
            console.log(`\n  ${AMAR}nao recuperados — exigem correcao manual:${RESET}`);
            for (const m of misses) {
                const onde = m.file
                    ? `${(0, node_path_1.basename)(m.file)}${m.line ? `:${m.line}` : ''}`
                    : 'local nao identificado';
                console.log(`    ${VERM}${m.old}${RESET}  ${NEG}${onde}${RESET}\n` +
                    `      ${CINZA}motivo: ${m.reason}${m.score ? `, melhor similaridade ${m.score.toFixed(3)}` : ''}${RESET}`);
            }
        }
        // Consolida tudo em disco: e daqui que saem `selfheal report` e
        // `selfheal table`. Sem esta etapa a execucao se perde ao terminar.
        const semHealing = new Set(this.titulosComFalha);
        for (const f of fixes)
            if (f.test)
                semHealing.add(f.test);
        for (const m of misses)
            if (m.test)
                semHealing.add(m.test);
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
exports.default = SelfHealReporter;
