'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Image as Imagem, Star } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { attrs, NESTED, REORDER } from '../ui';
import Protegida from '../Protegida';
import { adicionarAoCarrinho, real } from '../sessao';

const PRODUTO = { nome: 'Teclado mecanico', marca: 'Keychron', preco: 349.90 };
const THUMBS = [1, 2, 3, 4, 5, 6, 7, 8];

const order = <T,>(a: T[]) => (REORDER ? [...a].reverse() : a);
const Wrap = ({ children }: { children: React.ReactNode }) =>
  NESTED ? <div className="layer-a"><div className="layer-b">{children}</div></div>
         : <>{children}</>;

function Conteudo() {
  const [selecionada, setSelecionada] = useState(1);
  const router = useRouter();

  const comprar = () => {
    adicionarAoCarrinho(PRODUTO);
    toast.success('Adicionado ao carrinho',
                  { description: `${PRODUTO.nome} — ${real(PRODUTO.preco)}` });
    router.push('/carrinho');
  };

  return (
    <main className="pagina container py-10">
      <nav className="flex items-center gap-2 text-[13px] text-grafite-400">
        <a href="/catalogo" className="transition-colors hover:text-marca">Produtos</a>
        <span>/</span><span className="text-grafite-600">{PRODUTO.nome}</span>
      </nav>

      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <section className="rounded-2xl border border-borda bg-white p-6 shadow-suave">
          <div className="grid h-80 place-items-center rounded-xl bg-grafite-50">
            <Imagem className="h-20 w-20 text-grafite-300" strokeWidth={1.2} />
            <p id="imagem-selecionada" className="mt-3 text-[13px] text-grafite-500">
              Exibindo a imagem <strong className="numero text-grafite-900">{selecionada}</strong>{' '}
              de {THUMBS.length}
            </p>
          </div>

          {/* As miniaturas ficam sem rotulo acessivel de proposito: sao o pior
              caso do experimento, elementos sem texto, sem nome e com a mesma
              classe. Um aria-label daria a elas justamente a ancora que o
              estudo precisa que nao exista. */}
          <Wrap>
            <div className="gal mt-5 grid grid-cols-4 gap-3 sm:grid-cols-8">
              {order(THUMBS).map((n) => (
                <button {...attrs(`thumb${n}`)} key={n} type="button"
                        aria-pressed={selecionada === n}
                        onClick={() => setSelecionada(n)}
                        className={cn('aspect-square rounded-xl border-2 bg-grafite-50 transition-all',
                          selecionada === n
                            ? 'border-marca ring-2 ring-marca/25'
                            : 'border-borda hover:border-grafite-300')} />
              ))}
            </div>
          </Wrap>

          <p className="mt-5 text-[13px] leading-relaxed text-grafite-500">
            Oito miniaturas identicas entre si, sem rotulo textual e com a mesma
            classe. Quando a ordem da lista muda, a posicao deixa de ser evidencia
            confiavel e o algoritmo fica sem discriminante. Esta aqui de proposito.
          </p>
        </section>

        <aside className="rounded-2xl border border-borda bg-white p-6 shadow-suave lg:sticky lg:top-24">
          <h1 className="font-titulo text-[22px] font-extrabold leading-tight">{PRODUTO.nome}</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-grafite-500">
            {PRODUTO.marca}<span className="text-grafite-300">&middot;</span>
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="numero">4.6</span>
            <span className="text-grafite-300">&middot;</span>128 avaliacoes
          </p>
          <p className="numero mt-5 font-titulo text-[32px] font-extrabold text-marca">
            {real(PRODUTO.preco)}
          </p>
          <p className="mt-4 text-[13px] leading-relaxed text-grafite-600">
            Switch marrom, layout ABNT2, retroiluminacao branca e conexao sem fio
            com tres dispositivos.
          </p>
          <Botao id="galeria-comprar" type="button" tamanho="lg" bloco className="mt-6"
                 onClick={comprar}>
            Comprar agora
          </Botao>
        </aside>
      </div>
    </main>
  );
}

export default function Galeria() {
  return <Protegida><Conteudo /></Protegida>;
}
