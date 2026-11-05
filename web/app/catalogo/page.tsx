'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Heart, Package, SlidersHorizontal, Star } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Campo, Rotulo, Selecao } from '@/components/ui/input';
import { Selo } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { attrs, CATALOG_SIZE, NESTED, REORDER } from '../ui';
import Protegida from '../Protegida';
import Isolado from '../Isolado';
import { adicionarAoCarrinho, alternarFavorito, real, useCarrinho, useFavoritos } from '../sessao';

const NOMES = ['Teclado mecanico', 'Mouse sem fio', 'Monitor 27 polegadas',
  'Headset gamer', 'Webcam Full HD', 'Cadeira ergonomica', 'SSD 1TB',
  'Placa de video', 'Notebook 14', 'Impressora laser', 'Roteador Wi-Fi 6',
  'Microfone condensador', 'Hub USB-C', 'Suporte para monitor', 'Mousepad XL',
  'Fonte 650W', 'Memoria 16GB', 'Gabinete ATX', 'Water cooler', 'Smartwatch',
  'Caixa de som', 'Tablet 10', 'Leitor biometrico', 'No-break 1200VA'];
const MARCAS = ['Keychron', 'Logitech', 'Dell', 'HyperX', 'Elgato', 'Flexform'];
const SELOS: (null | 'oferta' | 'novo' | 'ultimo')[] = [null, 'oferta', 'novo', null, 'ultimo', null];
const CATEGORIAS = ['perifericos', 'monitores', 'acessorios'];

interface Produto {
  i: number; nome: string; marca: string; categoria: string;
  preco: number; antes: number | null; selo: null | 'oferta' | 'novo' | 'ultimo'; nota: string;
}

const PRODUTOS: Produto[] = Array.from({ length: CATALOG_SIZE }, (_, i) => {
  const preco = 129 + i * 47;
  return {
    i, nome: NOMES[i % NOMES.length], marca: MARCAS[i % MARCAS.length],
    categoria: CATEGORIAS[i % CATEGORIAS.length], preco,
    antes: i % 3 === 1 ? preco * 1.25 : null,
    selo: SELOS[i % SELOS.length], nota: (3.6 + (i % 5) * 0.28).toFixed(1),
  };
});

const POR_PAGINA = 12;
const SELO_TEXTO = { oferta: 'Oferta', novo: 'Novidade', ultimo: 'Ultimas unidades' } as const;
const SELO_COR = { oferta: 'marca', novo: 'sucesso', ultimo: 'alerta' } as const;

const order = <T,>(a: T[]) => (REORDER ? [...a].reverse() : a);
const Wrap = ({ children }: { children: React.ReactNode }) =>
  NESTED ? <div className="layer-a"><section className="layer-b">{children}</section></div>
         : <>{children}</>;

function Conteudo() {
  const { unidades } = useCarrinho();
  const favoritos = useFavoritos();
  const parametros = useSearchParams();
  const q = parametros.get('q');

  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [ordem, setOrdem] = useState('relevancia');
  const [pagina, setPagina] = useState(1);
  const [detalhe, setDetalhe] = useState<Produto | null>(null);

  useEffect(() => { if (q) { setBusca(q); setPagina(1); } }, [q]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let lista = PRODUTOS.filter((p) =>
      (!termo || p.nome.toLowerCase().includes(termo) || p.marca.toLowerCase().includes(termo)) &&
      (categoria === 'todas' || p.categoria === categoria));
    if (ordem === 'preco') lista = [...lista].sort((a, b) => a.preco - b.preco);
    if (ordem === 'nota') lista = [...lista].sort((a, b) => Number(b.nota) - Number(a.nota));
    return lista;
  }, [busca, categoria, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice(0, paginaAtual * POR_PAGINA);

  const adicionar = (p: Produto) => {
    adicionarAoCarrinho({ nome: p.nome, marca: p.marca, preco: p.preco });
    toast.success('Adicionado ao carrinho', { description: `${p.nome} — ${real(p.preco)}` });
  };

  const favoritar = (nome: string) => {
    const tinha = favoritos.includes(nome);
    alternarFavorito(nome);
    toast(tinha ? 'Removido dos favoritos' : 'Salvo nos favoritos', { description: nome });
  };

  const limpar = () => {
    setBusca(''); setCategoria('todas'); setOrdem('relevancia'); setPagina(1);
    toast('Filtros limpos');
  };

  return (
    <main className="pagina container py-10">
      <nav className="flex items-center gap-2 text-[13px] text-grafite-400">
        <a href="/catalogo" className="transition-colors hover:text-marca">Produtos</a>
        <span>/</span>
        <span className="text-grafite-600">
          {categoria === 'todas' ? 'Todas as categorias' : categoria}
        </span>
      </nav>

      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titulo text-[34px] font-extrabold leading-tight">Produtos</h1>
          <p className="mt-1.5 text-[15px] text-grafite-500">
            <strong id="total-resultados" className="numero text-grafite-900">
              {filtrados.length}
            </strong>{' '}
            produto(s) encontrado(s)
          </p>
        </div>
        <p id="contador-carrinho"
           className="rounded-full border border-borda bg-white px-4 py-2 text-[13px] text-grafite-600">
          <strong className="numero text-grafite-900">{unidades}</strong> no carrinho
          <span className="mx-2 text-grafite-300">|</span>
          <strong id="contador-favoritos" className="numero text-grafite-900">
            {favoritos.length}
          </strong>{' '}favorito(s)
        </p>
      </header>

      <section className="mt-7 rounded-2xl border border-borda bg-white p-4 shadow-suave">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Rotulo htmlFor="campo-busca">Buscar no catalogo</Rotulo>
            <Campo {...attrs('catBusca')} type="search" placeholder="Buscar produto"
                   value={busca}
                   onChange={(e) => { setBusca(e.target.value); setPagina(1); }} />
          </div>
          <div className="space-y-2">
            <Rotulo htmlFor="filtro-categoria">Categoria</Rotulo>
            <Selecao {...attrs('catFiltro')} value={categoria}
                     onChange={(e) => { setCategoria(e.target.value); setPagina(1); }}>
              <option value="todas">Todas as categorias</option>
              <option value="perifericos">Perifericos</option>
              <option value="monitores">Monitores</option>
              <option value="acessorios">Acessorios</option>
            </Selecao>
          </div>
          <div className="space-y-2">
            <Rotulo htmlFor="ordenar-por">Ordenar por</Rotulo>
            <Selecao {...attrs('catOrdenar')} value={ordem}
                     onChange={(e) => setOrdem(e.target.value)}>
              <option value="relevancia">Relevancia</option>
              <option value="preco">Menor preco</option>
              <option value="nota">Melhor avaliacao</option>
            </Selecao>
          </div>
          <Botao variante="secundaria" id="limpar-filtros" type="button" onClick={limpar}>
            <SlidersHorizontal className="h-4 w-4" /> Limpar
          </Botao>
        </div>
      </section>

      {detalhe && (
        <section id="detalhe-produto"
                 className="mt-6 flex flex-wrap items-center gap-6 rounded-2xl border-2
                            border-marca-200 bg-marca-50/60 p-6 animate-surgir">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white text-marca shadow-suave">
            <Package className="h-9 w-9" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-titulo text-lg font-bold">{detalhe.nome}</h3>
            <p className="mt-0.5 text-sm text-grafite-500">
              {detalhe.marca} &middot; {detalhe.categoria} &middot; nota {detalhe.nota}
            </p>
            <p id="detalhe-preco" className="numero mt-2 font-titulo text-2xl font-extrabold text-marca">
              {real(detalhe.preco)}
            </p>
          </div>
          <div className="flex gap-2.5">
            <Botao id="detalhe-adicionar" type="button" onClick={() => adicionar(detalhe)}>
              Adicionar ao carrinho
            </Botao>
            <Botao variante="secundaria" id="detalhe-fechar" type="button"
                   onClick={() => setDetalhe(null)}>Fechar</Botao>
          </div>
        </section>
      )}

      {visiveis.length === 0 ? (
        <div id="sem-resultados"
             className="mt-10 grid place-items-center rounded-2xl border border-dashed
                        border-grafite-300 bg-white py-20 text-center">
          <Package className="h-10 w-10 text-grafite-300" strokeWidth={1.5} />
          <h3 className="mt-4 font-titulo text-lg font-bold">Nenhum produto encontrado</h3>
          <p className="mt-1 text-sm text-grafite-500">Ajuste a busca ou limpe os filtros.</p>
        </div>
      ) : (
        <Wrap>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {order(visiveis).map((p) => (
              <article key={`${p.nome}-${p.i}`}
                       className="produto group flex flex-col overflow-hidden rounded-2xl border
                                  border-borda bg-white shadow-suave transition-all duration-200
                                  hover:-translate-y-1 hover:border-grafite-200 hover:shadow-alta">
                <div className="relative grid h-40 place-items-center bg-grafite-50">
                  <Package className="h-12 w-12 text-grafite-300 transition-transform
                                      duration-300 group-hover:scale-110" strokeWidth={1.25} />
                  {p.selo && (
                    <Selo variante={SELO_COR[p.selo]} className="absolute left-3 top-3">
                      {SELO_TEXTO[p.selo]}
                    </Selo>
                  )}
                  <button type="button" id={`favoritar-${p.i + 1}`}
                          aria-pressed={favoritos.includes(p.nome)}
                          onClick={() => favoritar(p.nome)}
                          className={cn('absolute right-3 top-3 grid h-9 w-9 place-items-center',
                                        'rounded-full bg-white shadow-suave transition-all',
                                        'hover:scale-110',
                                        favoritos.includes(p.nome)
                                          ? 'text-erro animate-pulo' : 'text-grafite-400')}>
                    <Heart className="h-[17px] w-[17px]"
                           fill={favoritos.includes(p.nome) ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-titulo text-[15px] font-bold leading-snug">{p.nome}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-grafite-500">
                    {p.marca}
                    <span className="text-grafite-300">&middot;</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="numero">{p.nota}</span>
                  </p>

                  <div className="mt-3">
                    {p.antes && (
                      <p className="numero text-[13px] text-grafite-400 line-through">
                        {real(p.antes)}
                      </p>
                    )}
                    <p className="numero font-titulo text-[22px] font-extrabold text-grafite-900">
                      {real(p.preco)}
                    </p>
                  </div>

                  {/* Sem involucro fixo em volta do botao: os irmaos dele sao o
                      nome e o preco do produto, e e isso que distingue um cartao
                      do outro para a recuperacao. Agrupa-los num <div>
                      permanente tornaria a vizinhanca identica em todos. */}
                  <Isolado className="mt-4">
                    <Botao {...attrs(`catAdd${p.i + 1}`)} type="button" bloco
                           className="mt-4" onClick={() => adicionar(p)}>
                      Adicionar ao carrinho
                    </Botao>
                  </Isolado>
                  <Isolado className="mt-2">
                    <a {...attrs(`catDet${p.i + 1}`)} href="#"
                       onClick={(e) => { e.preventDefault(); setDetalhe(p); }}
                       className="mt-2 block text-center text-[13px] font-semibold
                                  text-grafite-500 transition-colors hover:text-marca">
                      Ver detalhes
                    </a>
                  </Isolado>
                </div>
              </article>
            ))}
          </div>
        </Wrap>
      )}

      {visiveis.length < filtrados.length && (
        <div className="mt-10 text-center">
          <Botao {...attrs('catVerMais')} variante="contorno" tamanho="lg" type="button"
                 onClick={() => setPagina((n) => n + 1)}>
            Ver mais produtos
          </Botao>
        </div>
      )}

      <nav aria-label="Paginacao do catalogo"
           className="mt-10 flex items-center justify-center gap-3">
        <Botao variante="secundaria" tamanho="sm" id="pagina-anterior" type="button"
               disabled={paginaAtual === 1}
               onClick={() => setPagina((n) => Math.max(1, n - 1))}>Anterior</Botao>
        <span id="pagina-atual" className="numero text-[13px] font-semibold text-grafite-500">
          {paginaAtual} de {totalPaginas}
        </span>
        <Botao variante="secundaria" tamanho="sm" id="pagina-proxima" type="button"
               disabled={paginaAtual >= totalPaginas}
               onClick={() => setPagina((n) => Math.min(totalPaginas, n + 1))}>Proxima</Botao>
      </nav>
    </main>
  );
}

export default function Catalogo() {
  return (
    <Protegida>
      <Suspense fallback={<main className="container py-16"><div className="esqueleto h-10 w-56" /></main>}>
        <Conteudo />
      </Suspense>
    </Protegida>
  );
}
