/**
 * Cliente do processo Python que decide as correcoes.
 *
 * O engine e mantido vivo durante toda a execucao da suite e conversa por
 * JSON, uma requisicao por linha. Manter um unico processo evita pagar a
 * inicializacao do Python a cada seletor quebrado.
 */
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { Descriptor } from './collector';
import { MENSAGEM_SEM_ENGINE, resolveEngine } from './engine-resolver';

export interface HealResult {
  ok: boolean;
  healed: boolean;
  selector: string;
  new_selector?: string;
  score?: number;
  margin?: number;
  reason?: string;
  breakdown?: Record<string, number>;
  element?: Record<string, string>;
  duration_ms?: number;
}

export interface BridgeOptions {
  python?: string;
  knowledge?: string;
  threshold?: number;
  margin?: number;
}

export class BridgeClient {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private nextId = 1;
  private pending = new Map<number, (value: any) => void>();

  constructor(private opts: BridgeOptions = {}) {}

  private ensure(): ChildProcessWithoutNullStreams {
    if (this.proc) return this.proc;

    // O engine pode vir de um binario embutido, de um ambiente provisionado
    // na instalacao ou do Python do sistema — nesta ordem de preferencia.
    const engine = resolveEngine(this.opts.python);
    if (!engine) {
      console.error(MENSAGEM_SEM_ENGINE);
      throw new Error('selfheal: engine de decisao indisponivel');
    }

    const python = engine.command;
    const args = [
      ...engine.baseArgs,
      '--knowledge', this.opts.knowledge || '.selfheal/knowledge.json',
      '--threshold', String(this.opts.threshold ?? 0.5),
      '--margin', String(this.opts.margin ?? 0.005),
    ];

    this.proc = spawn(python, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    this.proc.stdout.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      let idx: number;
      while ((idx = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, idx).trim();
        this.buffer = this.buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          const resolve = this.pending.get(msg.id);
          if (resolve) { this.pending.delete(msg.id); resolve(msg); }
        } catch { /* linha malformada e ignorada */ }
      }
    });

    // Erros do engine precisam ser visiveis: sem isso, uma falha de import
    // no Python vira silencio e a base de conhecimento fica vazia sem aviso.
    this.proc.stderr.on('data', (chunk: Buffer) => {
      const txt = chunk.toString().trim();
      if (txt) console.error(`[selfheal:engine] ${txt}`);
    });

    if (process.env.SELFHEAL_DEBUG) {
      console.error(`[selfheal] engine via ${engine.origin}`);
      console.error(`[selfheal] ${python} ${args.join(' ')}`);
    }

    this.proc.on('error', (err) => {
      console.error(
        `\n[selfheal] o engine foi localizado (${engine.origin}) mas nao ` +
        `iniciou.\n           detalhe: ${err.message}`);
      console.error(MENSAGEM_SEM_ENGINE);
    });

    return this.proc;
  }

  private send(payload: Record<string, any>): Promise<any> {
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

  remember(selector: string, descriptor: Descriptor) {
    return this.send({ cmd: 'remember', selector, descriptor });
  }

  rememberMany(items: { selector: string; descriptor: Descriptor }[]) {
    return this.send({ cmd: 'remember_many', items });
  }

  heal(selector: string, candidates: Descriptor[]): Promise<HealResult> {
    return this.send({ cmd: 'heal', selector, candidates });
  }

  apply(fixes: { file: string; old: string; new: string }[]) {
    return this.send({ cmd: 'apply', fixes });
  }

  /** Onde cada seletor aparece na suite: usado nos que nao foram corrigidos. */
  locate(items: { file?: string; selector: string }[]) {
    return this.send({ cmd: 'locate', items });
  }

  /** Consolida a execucao em .selfheal/report.json. */
  report(payload: { fixes: any[]; misses: any[]; suite?: any; path?: string }) {
    return this.send({ cmd: 'report', ...payload });
  }

  save() { return this.send({ cmd: 'save' }); }

  async close() {
    await this.save();
    if (this.proc) { this.proc.stdin.end(); this.proc = null; }
  }
}

/** Uma unica ponte por processo de teste. */
let shared: BridgeClient | null = null;
export function getBridge(opts?: BridgeOptions): BridgeClient {
  if (!shared) shared = new BridgeClient(opts);
  return shared;
}
