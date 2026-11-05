'use client';
import { useEffect, useState } from 'react';
import { Check, ChevronDown, FileCode2, X } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Selo } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Registro {
  old_selector: string; new_selector: string | null; healed: boolean;
  score?: number; file?: string; line?: number; status?: string;
  element?: { tag?: string; visible_text?: string };
  breakdown?: Record<string, number>;
}
interface Resumo {
  total_broken: number; total_healed: number; recovery_rate: number;
  avg_duration_ms: number; rewrite_share_pct?: number;
}

const fmt = (n: unknown, d = 1) => (typeof n === 'number' ? n.toFixed(d) : '-');

function Indicador({ rotulo, valor, sufixo = '' }:
                   { rotulo: string; valor: React.ReactNode; sufixo?: string }) {
  return (
    <div className="rounded-2xl border border-borda bg-white p-5 shadow-suave">
      <p className="text-[11px] font-bold uppercase tracking-widest text-grafite-400">{rotulo}</p>
      <p className="numero mt-2 font-titulo text-[30px] font-extrabold leading-none">
        {valor}<span className="text-[18px] text-grafite-400">{sufixo}</span>
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [dados, setDados] = useState<{ summary: Resumo | null; records: Registro[] } | null>(null);
  const [decisao, setDecisao] = useState<Record<number, 'aceita' | 'rejeitada'>>({});

  useEffect(() => {
    fetch('/api/report').then((r) => r.json()).then(setDados).catch(() => setDados(null));
  }, []);

  if (!dados) {
    return (
      <main className="container py-10">
        <div className="esqueleto h-10 w-64" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="esqueleto h-28" />)}
        </div>
      </main>
    );
  }

  const s = dados.summary;
  const registros = dados.records || [];

  return (
    <main className="pagina container py-10">
      <header className="max-w-2xl">
        <Selo variante="marca">Ferramenta do QA</Selo>
        <h1 className="mt-3 font-titulo text-[34px] font-extrabold leading-tight">
          Painel de revisao
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-grafite-500">
          Correcoes propostas pelo engine de self-healing. No modo sugestao, cada
          uma pode ser aceita ou rejeitada sem editar arquivos manualmente.
        </p>
      </header>

      {s && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador rotulo="Seletores quebrados" valor={s.total_broken} />
          <Indicador rotulo="Recuperados" valor={s.total_healed} />
          <Indicador rotulo="Taxa de recuperacao" valor={fmt(s.recovery_rate)} sufixo="%" />
          <Indicador rotulo="Tempo medio" valor={fmt(s.avg_duration_ms)} sufixo=" ms" />
        </div>
      )}

      {registros.length === 0 ? (
        <div className="mt-10 grid place-items-center rounded-2xl border border-dashed
                        border-grafite-300 bg-white py-20 text-center">
          <FileCode2 className="h-10 w-10 text-grafite-300" strokeWidth={1.5} />
          <h2 className="mt-4 font-titulo text-lg font-bold">Nenhuma correcao registrada</h2>
          <p className="mt-1 text-sm text-grafite-500">
            Execute a suite de testes para popular este painel.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {registros.map((r, i) => (
            <article key={i}
                     className="rounded-2xl border border-borda bg-white p-5 shadow-suave
                                transition-shadow hover:shadow-media">
              <div className="flex flex-wrap items-center gap-3">
                <code className="rounded-lg bg-red-50 px-2.5 py-1 font-mono text-[13px]
                                 text-erro line-through">{r.old_selector}</code>
                <span className="text-grafite-300">&rarr;</span>
                <code className={cn('rounded-lg px-2.5 py-1 font-mono text-[13px]',
                  r.healed ? 'bg-emerald-50 text-sucesso' : 'bg-grafite-100 text-grafite-500')}>
                  {r.new_selector || 'nao recuperado'}
                </code>
                {r.healed
                  ? <Selo variante="sucesso" className="ml-auto numero">
                      score {fmt(r.score, 3)}
                    </Selo>
                  : <Selo variante="alerta" className="ml-auto">abstencao</Selo>}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-grafite-500">
                {r.file && (
                  <span className="font-mono">
                    {r.file.split('/').slice(-1)[0]}:{r.line}
                  </span>
                )}
                {r.element?.visible_text && (
                  <span>&lt;{r.element.tag}&gt; &quot;{r.element.visible_text}&quot;</span>
                )}
              </div>

              {r.breakdown && Object.keys(r.breakdown).length > 0 && (
                <details className="group mt-4">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5
                                      text-[13px] font-semibold text-grafite-600
                                      transition-colors hover:text-marca">
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    Contribuicao por propriedade
                  </summary>
                  <div className="mt-3 space-y-2">
                    {Object.entries(r.breakdown).map(([prop, v]) => (
                      <div key={prop} className="grid grid-cols-[130px_1fr_46px] items-center gap-3">
                        <span className="font-mono text-[12px] text-grafite-500">{prop}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-grafite-100">
                          <div className="h-full rounded-full bg-marca transition-all duration-500"
                               style={{ width: `${v * 100}%` }} />
                        </div>
                        <span className="numero text-right text-[12px] font-semibold">
                          {fmt(v, 2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {r.healed && (
                <div className="mt-4 flex items-center gap-2.5 border-t border-borda pt-4">
                  <Botao tamanho="sm" onClick={() => setDecisao((p) => ({ ...p, [i]: 'aceita' }))}>
                    <Check className="h-4 w-4" /> Aceitar
                  </Botao>
                  <Botao variante="secundaria" tamanho="sm"
                         onClick={() => setDecisao((p) => ({ ...p, [i]: 'rejeitada' }))}>
                    <X className="h-4 w-4" /> Rejeitar
                  </Botao>
                  {decisao[i] && (
                    <Selo variante={decisao[i] === 'aceita' ? 'sucesso' : 'alerta'}
                          className="ml-1">{decisao[i]}</Selo>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
