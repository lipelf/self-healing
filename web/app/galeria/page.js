'use client';
import { attrs, NESTED, REORDER } from '../ui';

const THUMBS = [1, 2, 3, 4, 5, 6, 7, 8];
const order = (arr) => (REORDER ? [...arr].reverse() : arr);

const Wrap = ({ children }) =>
  NESTED ? <div className="layer-a"><div className="layer-b">{children}</div></div>
         : <>{children}</>;

export default function Galeria() {
  return (
    <main>
      <nav className="trilha">
        <a href="/">Inicio</a><span className="sep">/</span>
        <a href="/catalogo">Produtos</a><span className="sep">/</span>
        <span>Teclado mecanico</span>
      </nav>

      <div className="pagina-topo">
        <div>
          <h1>Galeria do produto</h1>
          <p className="sub">
            Miniaturas sem rotulo textual, sem atributo de nome e com a mesma classe:
            apenas a posicao as distingue. E o pior caso para qualquer abordagem
            baseada em similaridade, e esta aqui de proposito.
          </p>
        </div>
      </div>

      <div className="colunas">
        <div className="card">
          <p className="card-titulo">Imagens do produto</p>
          <Wrap>
            <div className="gal">
              {order(THUMBS).map((n) => (
                <button {...attrs(`thumb${n}`)} key={n} type="button" />
              ))}
            </div>
          </Wrap>
          <p className="ajuda" style={{ marginTop: 16 }}>
            Oito miniaturas identicas entre si. Quando a ordem da lista muda, a posicao
            deixa de ser evidencia confiavel e o algoritmo fica sem discriminante.
          </p>
        </div>

        <div className="card">
          <p className="card-titulo">Teclado mecanico</p>
          <p className="preco">R$ 349,90</p>
          <p className="produto-meta" style={{ marginTop: 4 }}>
            Keychron &middot; <span className="estrelas">&#9733;</span> 4.6 &middot; 128 avaliacoes
          </p>
          <p className="ajuda" style={{ marginTop: 12 }}>
            Switch marrom, layout ABNT2, retroiluminacao branca e conexao
            sem fio com tres dispositivos.
          </p>
          <button className="btn btn-primary btn-bloco" id="galeria-comprar" type="button"
                  style={{ marginTop: 16 }}>
            Comprar agora
          </button>
        </div>
      </div>
    </main>
  );
}
