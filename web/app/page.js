const FLUXOS = [
  { href: '/login', titulo: 'Autenticacao',
    desc: 'Formulario de acesso com campos, botoes e ligacoes auxiliares.' },
  { href: '/catalogo', titulo: 'Catalogo',
    desc: 'Listagem de produtos com busca, filtros e acoes repetidas por item.' },
  { href: '/carrinho', titulo: 'Carrinho',
    desc: 'Itens com controles de quantidade, cupom e resumo do pedido.' },
  { href: '/checkout', titulo: 'Finalizacao',
    desc: 'Formulario extenso de entrega e pagamento.' },
  { href: '/galeria', titulo: 'Galeria',
    desc: 'Miniaturas sem texto nem rotulo: o pior caso para a similaridade.' },
  { href: '/dashboard', titulo: 'Painel de revisao',
    desc: 'Resultado da ultima execucao, com a pontuacao de cada correcao.' },
];

export default function Home() {
  return (
    <main>
      <div className="pagina-topo">
        <div>
          <h1>ShopDemo</h1>
          <p className="sub">
            Loja de demonstracao usada como alvo controlado dos experimentos de
            recuperacao automatica de seletores. Cada fluxo foi desenhado para
            exercitar um tipo diferente de elemento.
          </p>
        </div>
      </div>

      <div className="grid">
        {FLUXOS.map((f) => (
          <article className="produto" key={f.href}>
            <h3>{f.titulo}</h3>
            <p className="produto-meta">{f.desc}</p>
            <a className="btn btn-secondary" href={f.href}
               style={{ gridColumn: '1 / -1', justifySelf: 'start',
                        margin: '0 16px 16px' }}>Abrir fluxo</a>
          </article>
        ))}
      </div>
    </main>
  );
}
