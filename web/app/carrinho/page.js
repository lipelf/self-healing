'use client';
import { attrs, NESTED, REORDER } from '../ui';

const ITENS = [
  { nome: 'Teclado mecanico', preco: 'R$ 349,90' },
  { nome: 'Mouse sem fio', preco: 'R$ 129,90' },
];

// C4 inverte a ordem de renderizacao das listas.
const order = (arr) => (REORDER ? [...arr].reverse() : arr);

const Wrap = ({ children }) =>
  NESTED ? <div className="layer-a"><div className="layer-b">{children}</div></div>
         : <>{children}</>;

export default function Carrinho() {
  return (
    <main>
      <h1>Carrinho</h1>
      <p className="sub">Revise os itens antes de finalizar a compra.</p>

      <div className="card">
        <Wrap>
          {order(ITENS.map((it, i) => ({ ...it, i }))).map((item) => (
            <div className="item" key={item.nome}>
              <div>
                <strong>{item.nome}</strong>
                <div className="preco">{item.preco}</div>
              </div>
              <div className="qty">
                <button {...attrs(`carMenos${item.i + 1}`)} type="button">-</button>
                <span>1</span>
                <button {...attrs(`carMais${item.i + 1}`)} type="button">+</button>
                <button {...attrs(`carRemover${item.i + 1}`)} type="button">Remover</button>
              </div>
            </div>
          ))}
        </Wrap>
        <div className="total"><span>Total</span><span>R$ 479,80</span></div>
      </div>

      <div className="card">
        <label htmlFor="campo-cupom">Cupom de desconto</label>
        <div className="toolbar">
          <input {...attrs('carCupom')} type="text" placeholder="Digite o cupom" />
          <button {...attrs('carAplicar')} type="button">Aplicar cupom</button>
        </div>
        <a {...attrs('carContinuar')} href="/catalogo">Continuar comprando</a>
        <button {...attrs('carFinalizar')} type="button">Finalizar compra</button>
      </div>
    </main>
  );
}
