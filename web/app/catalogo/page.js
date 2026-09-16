'use client';
import { attrs, NESTED, REORDER, CATALOG_SIZE } from '../ui';

const NOMES = ['Teclado mecanico', 'Mouse sem fio', 'Monitor 27 polegadas',
  'Headset gamer', 'Webcam Full HD', 'Cadeira ergonomica', 'SSD 1TB',
  'Placa de video', 'Notebook 14', 'Impressora laser', 'Roteador Wi-Fi 6',
  'Microfone condensador', 'Hub USB-C', 'Suporte para monitor', 'Mousepad XL',
  'Fonte 650W', 'Memoria 16GB', 'Gabinete ATX', 'Water cooler', 'Smartwatch',
  'Caixa de som', 'Tablet 10', 'Leitor biometrico', 'No-break 1200VA'];

const PRODUTOS = Array.from({ length: CATALOG_SIZE }, (_, i) => ({
  nome: NOMES[i % NOMES.length],
  preco: `R$ ${(129 + i * 47).toFixed(2).replace('.', ',')}`,
}));

// C4 inverte a ordem de renderizacao das listas.
const order = (arr) => (REORDER ? [...arr].reverse() : arr);

const Wrap = ({ children }) =>
  NESTED ? <div className="layer-a"><section className="layer-b">{children}</section></div>
         : <>{children}</>;

export default function Catalogo() {
  return (
    <main>
      <h1>Catalogo</h1>
      <p className="sub">Selecione os produtos que deseja adicionar ao carrinho.</p>

      <div className="toolbar">
        <input {...attrs('catBusca')} type="search" placeholder="Buscar produto" />
        <select {...attrs('catFiltro')} defaultValue="todas">
          <option value="todas">Todas as categorias</option>
          <option value="perifericos">Perifericos</option>
          <option value="monitores">Monitores</option>
        </select>
        <select {...attrs('catOrdenar')} defaultValue="relevancia">
          <option value="relevancia">Relevancia</option>
          <option value="preco">Menor preco</option>
        </select>
      </div>

      <Wrap>
        <div className="grid">
          {order(PRODUTOS.map((p, i) => ({ ...p, i }))).map((p) => (
            <article className="produto" key={p.nome}>
              <h3>{p.nome}</h3>
              <p className="preco">{p.preco}</p>
              <button {...attrs(`catAdd${p.i + 1}`)} type="button">Adicionar ao carrinho</button>
              <a {...attrs(`catDet${p.i + 1}`)} href="#">Ver detalhes</a>
            </article>
          ))}
        </div>
      </Wrap>

      <div className="row" style={{ marginTop: 20 }}>
        <button {...attrs('catVerMais')} type="button">Ver mais produtos</button>
      </div>
    </main>
  );
}
