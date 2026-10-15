'use client';
import { attrs, NESTED, REORDER, CATALOG_SIZE } from '../ui';

const NOMES = ['Teclado mecanico', 'Mouse sem fio', 'Monitor 27 polegadas',
  'Headset gamer', 'Webcam Full HD', 'Cadeira ergonomica', 'SSD 1TB',
  'Placa de video', 'Notebook 14', 'Impressora laser', 'Roteador Wi-Fi 6',
  'Microfone condensador', 'Hub USB-C', 'Suporte para monitor', 'Mousepad XL',
  'Fonte 650W', 'Memoria 16GB', 'Gabinete ATX', 'Water cooler', 'Smartwatch',
  'Caixa de som', 'Tablet 10', 'Leitor biometrico', 'No-break 1200VA'];

const MARCAS = ['Keychron', 'Logitech', 'Dell', 'HyperX', 'Elgato', 'Flexform'];
const SELOS = [null, 'oferta', 'novo', null, 'ultimo', null];

const PRODUTOS = Array.from({ length: CATALOG_SIZE }, (_, i) => {
  const preco = 129 + i * 47;
  return {
    nome: NOMES[i % NOMES.length],
    marca: MARCAS[i % MARCAS.length],
    preco: `R$ ${preco.toFixed(2).replace('.', ',')}`,
    antes: i % 3 === 1 ? `R$ ${(preco * 1.25).toFixed(2).replace('.', ',')}` : null,
    selo: SELOS[i % SELOS.length],
    nota: (3.6 + (i % 5) * 0.28).toFixed(1),
  };
});

// C4 inverte a ordem de renderizacao das listas.
const order = (arr) => (REORDER ? [...arr].reverse() : arr);

const Wrap = ({ children }) =>
  NESTED ? <div className="layer-a"><section className="layer-b">{children}</section></div>
         : <>{children}</>;

function Caixa() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" />
    </svg>
  );
}

const SELO_TEXTO = { oferta: 'Oferta', novo: 'Novidade', ultimo: 'Ultimas unidades' };

export default function Catalogo() {
  return (
    <main>
      <nav className="trilha">
        <a href="/">Inicio</a><span className="sep">/</span>
        <a href="/catalogo">Produtos</a><span className="sep">/</span>
        <span>Informatica</span>
      </nav>

      <div className="pagina-topo">
        <div>
          <h1>Catalogo</h1>
          <p className="sub">
            {CATALOG_SIZE} produtos encontrados em Informatica. Selecione os itens
            que deseja adicionar ao carrinho.
          </p>
        </div>
      </div>

      <div className="toolbar">
        <div className="campo-grupo">
          <label htmlFor="campo-busca">Buscar no catalogo</label>
          <input {...attrs('catBusca')} type="search" placeholder="Buscar produto" />
        </div>
        <div className="campo-grupo">
          <label htmlFor="filtro-categoria">Categoria</label>
          <select {...attrs('catFiltro')} defaultValue="todas">
            <option value="todas">Todas as categorias</option>
            <option value="perifericos">Perifericos</option>
            <option value="monitores">Monitores</option>
          </select>
        </div>
        <div className="campo-grupo">
          <label htmlFor="ordenar-por">Ordenar por</label>
          <select {...attrs('catOrdenar')} defaultValue="relevancia">
            <option value="relevancia">Relevancia</option>
            <option value="preco">Menor preco</option>
          </select>
        </div>
        <button className="btn btn-secondary" id="limpar-filtros" type="button">
          Limpar filtros
        </button>
      </div>

      <Wrap>
        <div className="grid">
          {order(PRODUTOS.map((p, i) => ({ ...p, i }))).map((p) => (
            <article className="produto" key={p.nome}>
              <div className="produto-imagem">
                <Caixa />
                {p.selo && (
                  <span className={`selo selo-${p.selo}`}>{SELO_TEXTO[p.selo]}</span>
                )}
              </div>
              <h3>{p.nome}</h3>
              <p className="produto-meta">
                {p.marca} &middot; <span className="estrelas">&#9733;</span> {p.nota}
              </p>
              {p.antes && <p className="preco-antes">{p.antes}</p>}
              <p className="preco">{p.preco}</p>
              <button {...attrs(`catAdd${p.i + 1}`)} type="button">
                Adicionar ao carrinho
              </button>
              <a {...attrs(`catDet${p.i + 1}`)} href="#">Ver detalhes</a>
            </article>
          ))}
        </div>
      </Wrap>

      <div className="row" style={{ marginTop: 24, textAlign: 'center' }}>
        <button {...attrs('catVerMais')} type="button">Ver mais produtos</button>
      </div>

      <nav className="paginacao" aria-label="Paginacao do catalogo">
        <button id="pagina-anterior" type="button">Anterior</button>
        <button id="pagina-1" type="button" aria-current="page">1</button>
        <button id="pagina-2" type="button">2</button>
        <button id="pagina-3" type="button">3</button>
        <button id="pagina-proxima" type="button">Proxima</button>
      </nav>
    </main>
  );
}
