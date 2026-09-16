'use client';
import { useEffect, useState } from 'react';

const fmt = (n, d = 1) => (typeof n === 'number' ? n.toFixed(d) : '-');

function Stat({ label, value, suffix = '' }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}{suffix}</span>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({});

  useEffect(() => {
    fetch('/api/report').then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <main><h1>Painel de revisao</h1><p className="sub">Carregando...</p></main>;

  const s = data.summary;
  const records = data.records || [];
  const decide = (i, value) => setStatus((prev) => ({ ...prev, [i]: value }));

  return (
    <main>
      <h1>Painel de revisao</h1>
      <p className="sub">
        Correcoes propostas pelo engine de self-healing. No modo sugestao, cada
        uma pode ser aceita ou rejeitada sem editar arquivos manualmente.
      </p>

      {s && (
        <div className="stats">
          <Stat label="Seletores quebrados" value={s.total_broken} />
          <Stat label="Recuperados" value={s.total_healed} />
          <Stat label="Taxa de recuperacao" value={fmt(s.recovery_rate)} suffix="%" />
          <Stat label="Tempo medio" value={fmt(s.avg_duration_ms)} suffix=" ms" />
        </div>
      )}

      {records.length === 0 && (
        <div className="card"><p>Nenhuma correcao registrada ainda.</p></div>
      )}

      {records.map((r, i) => (
        <div className="card correction" key={i}>
          <div className="corr-head">
            <code className="old">{r.old_selector}</code>
            <span className="arrow">-&gt;</span>
            <code className={r.healed ? 'new' : 'fail'}>
              {r.new_selector || 'nao recuperado'}
            </code>
            {r.healed && <span className="score">score {fmt(r.score, 3)}</span>}
          </div>

          {r.file && (
            <p className="loc">{r.file.split('/').slice(-1)[0]}:{r.line}</p>
          )}

          {r.element && r.element.visible_text && (
            <p className="loc">elemento: &lt;{r.element.tag}&gt; &quot;{r.element.visible_text}&quot;</p>
          )}

          {r.breakdown && Object.keys(r.breakdown).length > 0 && (
            <details>
              <summary>Contribuicao por propriedade</summary>
              <div className="bars">
                {Object.entries(r.breakdown).map(([prop, v]) => (
                  <div className="bar-row" key={prop}>
                    <span className="bar-label">{prop}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${v * 100}%` }} />
                    </div>
                    <span className="bar-value">{fmt(v, 2)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {r.healed && (
            <div className="actions">
              <button className="btn btn-add" onClick={() => decide(i, 'accepted')}>
                Aceitar
              </button>
              <button className="btn btn-danger" onClick={() => decide(i, 'rejected')}>
                Rejeitar
              </button>
              {status[i] && <span className={`tag ${status[i]}`}>{status[i]}</span>}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
