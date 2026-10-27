"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BridgeClient = void 0;
exports.getBridge = getBridge;
/**
 * Cliente do processo Python que decide as correcoes.
 *
 * O engine e mantido vivo durante toda a execucao da suite e conversa por
 * JSON, uma requisicao por linha. Manter um unico processo evita pagar a
 * inicializacao do Python a cada seletor quebrado.
 */
const node_child_process_1 = require("node:child_process");
const engine_resolver_1 = require("./engine-resolver");
class BridgeClient {
    opts;
    proc = null;
    buffer = '';
    nextId = 1;
    pending = new Map();
    constructor(opts = {}) {
        this.opts = opts;
    }
    ensure() {
        if (this.proc)
            return this.proc;
        // O engine pode vir de um binario embutido, de um ambiente provisionado
        // na instalacao ou do Python do sistema — nesta ordem de preferencia.
        const engine = (0, engine_resolver_1.resolveEngine)(this.opts.python);
        if (!engine) {
            console.error(engine_resolver_1.MENSAGEM_SEM_ENGINE);
            throw new Error('selfheal: engine de decisao indisponivel');
        }
        const python = engine.command;
        const args = [
            ...engine.baseArgs,
            '--knowledge', this.opts.knowledge || '.selfheal/knowledge.json',
            '--threshold', String(this.opts.threshold ?? 0.5),
            '--margin', String(this.opts.margin ?? 0.005),
        ];
        this.proc = (0, node_child_process_1.spawn)(python, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, PYTHONUNBUFFERED: '1' },
        });
        this.proc.stdout.on('data', (chunk) => {
            this.buffer += chunk.toString();
            let idx;
            while ((idx = this.buffer.indexOf('\n')) >= 0) {
                const line = this.buffer.slice(0, idx).trim();
                this.buffer = this.buffer.slice(idx + 1);
                if (!line)
                    continue;
                try {
                    const msg = JSON.parse(line);
                    const resolve = this.pending.get(msg.id);
                    if (resolve) {
                        this.pending.delete(msg.id);
                        resolve(msg);
                    }
                }
                catch { /* linha malformada e ignorada */ }
            }
        });
        // Erros do engine precisam ser visiveis: sem isso, uma falha de import
        // no Python vira silencio e a base de conhecimento fica vazia sem aviso.
        this.proc.stderr.on('data', (chunk) => {
            const txt = chunk.toString().trim();
            if (txt)
                console.error(`[selfheal:engine] ${txt}`);
        });
        if (process.env.SELFHEAL_DEBUG) {
            console.error(`[selfheal] engine via ${engine.origin}`);
            console.error(`[selfheal] ${python} ${args.join(' ')}`);
        }
        this.proc.on('error', (err) => {
            console.error(`\n[selfheal] o engine foi localizado (${engine.origin}) mas nao ` +
                `iniciou.\n           detalhe: ${err.message}`);
            console.error(engine_resolver_1.MENSAGEM_SEM_ENGINE);
        });
        return this.proc;
    }
    send(payload) {
        const proc = this.ensure();
        const id = this.nextId++;
        return new Promise((resolve) => {
            this.pending.set(id, resolve);
            if (process.env.SELFHEAL_DEBUG) {
                console.error(`[selfheal] -> ${payload.cmd} ${payload.selector || ''}`);
            }
            proc.stdin.write(JSON.stringify({ ...payload, id }) + '\n');
            setTimeout(() => {
                if (this.pending.has(id)) {
                    this.pending.delete(id);
                    resolve({ ok: false, healed: false, reason: 'timeout' });
                }
            }, 15000);
        });
    }
    remember(selector, descriptor) {
        return this.send({ cmd: 'remember', selector, descriptor });
    }
    rememberMany(items) {
        return this.send({ cmd: 'remember_many', items });
    }
    heal(selector, candidates) {
        return this.send({ cmd: 'heal', selector, candidates });
    }
    apply(fixes) {
        // A raiz permite alcancar seletores declarados fora do .spec.ts, como em
        // Page Objects. Sem ela o engine so procuraria no arquivo do teste.
        return this.send({ cmd: 'apply', fixes, root: process.cwd() });
    }
    /** Onde cada seletor aparece na suite: usado nos que nao foram corrigidos. */
    locate(items) {
        return this.send({ cmd: 'locate', items, root: process.cwd() });
    }
    /** Consolida a execucao em .selfheal/report.json. */
    report(payload) {
        return this.send({ cmd: 'report', ...payload });
    }
    save() { return this.send({ cmd: 'save' }); }
    async close() {
        await this.save();
        if (this.proc) {
            this.proc.stdin.end();
            this.proc = null;
        }
    }
}
exports.BridgeClient = BridgeClient;
/** Uma unica ponte por processo de teste. */
let shared = null;
function getBridge(opts) {
    if (!shared)
        shared = new BridgeClient(opts);
    return shared;
}
