'use client';
import { attrs, NESTED, REORDER } from '../ui';

const ITENS = [
  { nome: 'Teclado mecanico', marca: 'Keychron', variacao: 'Switch marrom, ABNT2',
    preco: 'R$ 349,90' },
  { nome: 'Mouse sem fio', marca: 'Logitech', variacao: 'Grafite, 2.4GHz',
    preco: 'R$ 129,90' },
];

// C4 inverte a ordem de renderizacao das listas.
const order = (arr) => (REORDER ? [...arr].reverse() : arr);

const Wrap = ({ children }) =>
  NESTED ? <div className="layer-a"><div className="layer-b">{children}</div></div>
         : <>{children}</>;

function MiniCaixa() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" /><path d="m3 8 9 5 9-5" />
    </svg>
  );
}

export default function Carrinho() {
  return (
    <main>
      <nav className="trilha">
        <a href="/">Inicio</a><span className="sep">/</span><span>Carrinho</span>
      </nav>

      <div className="pagina-topo">
        <div>
          <h1>Carrinho</h1>
          <p className="sub">Revise os itens antes de finalizar a compra.
             Os precos sao atualizados automaticamente.</p>
        </div>
      </div>

      <div className="aviso">
        <span>&#10003;</span>
        <span>Seu pedido tem <strong>frete gratis</strong>. Entrega estimada em 3 a 5 dias uteis.</span>
      </div>

      <div className="colunas">
        <div>
          <div className="card">
            <p className="card-titulo">Itens do pedido &middot; 2 produtos</p>
            <Wrap>
              {order(ITENS.map((it, i) => ({ ...it, i }))).map((item) => (
                <div className="item" key={item.nome}>
                  <div className="item-imagem"><MiniCaixa /></div>
                  <div className="item-info">
                    <h4>{item.nome}</h4>
                    <p>{item.marca} &middot; {item.variacao}</p>
                  </div>
                  <div className="qty">
                    <button {...attrs(`carMenos${item.i + 1}`)} type="button">-</button>
                    <span className="qty-valor">1</span>
                    <button {...attrs(`carMais${item.i + 1}`)} type="button">+</button>
                  </div>
                  <span className="item-preco">{item.preco}</span>
                  <button {...attrs(`carRemover${item.i + 1}`)} type="button">Remover</button>
                </div>
              ))}
            </Wrap>
          </div>

          <div className="card">
            <p className="card-titulo">Cupom de desconto</p>
            <div className="cupom-area">
              <div className="campo-grupo">
                <label htmlFor="campo-cupom">Codigo promocional</label>
                <input {...attrs('carCupom')} type="text" placeholder="Digite o cupom" />
              </div>
              <button {...attrs('carAplicar')} type="button">Aplicar cupom</button>
            </div>
            <p className="ajuda">Cupons nao sao acumulativos com outras promocoes.</p>
          </div>
        </div>

        <div className="card">
          <p className="card-titulo">Resumo</p>
          <div className="resumo-linha"><span>Subtotal</span><span>R$ 479,80</span></div>
          <div className="resumo-linha"><span>Frete</span><span>Gratis</span></div>
          <div className="resumo-linha"><span>Desconto</span><span>&mdash;</span></div>
          <div className="total"><span>Total</span><span>R$ 479,80</span></div>
          <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
            <button {...attrs('carFinalizar')} className="btn btn-primary btn-bloco" type="button">
              Finalizar compra
            </button>
            <a {...attrs('carContinuar')} href="/catalogo">Continuar comprando</a>
          </div>
          <p className="ajuda" style={{ marginTop: 16 }}>
            Pagamento processado em ambiente seguro. Esta e uma loja de demonstracao
            e nenhuma cobranca e realizada.
          </p>
        </div>
      </div>
    </main>
  );
}
