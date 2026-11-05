'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Package, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Campo, Rotulo } from '@/components/ui/input';
import { attrs, NESTED, REORDER } from '../ui';
import Protegida from '../Protegida';
import Isolado from '../Isolado';
import { ajustarQuantidade, real, removerDoCarrinho, useCarrinho } from '../sessao';

const CUPONS: Record<string, number> = { UNESC10: 0.10, UNESC20: 0.20 };

const order = <T,>(a: T[]) => (REORDER ? [...a].reverse() : a);
const Wrap = ({ children }: { children: React.ReactNode }) =>
  NESTED ? <div className="layer-a"><div className="layer-b">{children}</div></div>
         : <>{children}</>;

function Conteudo() {
  const { itens, unidades, subtotal } = useCarrinho();
  const [cupom, setCupom] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [aviso, setAviso] = useState('');

  const aplicarCupom = () => {
    const taxa = CUPONS[cupom.trim().toUpperCase()];
    setDesconto(taxa || 0);
    setAviso(taxa ? `Cupom aplicado: ${Math.round(taxa * 100)}% de desconto` : 'Cupom invalido');
    if (taxa) toast.success(`Cupom de ${Math.round(taxa * 100)}% aplicado`,
                            { description: 'O desconto ja aparece no resumo' });
    else toast.error('Cupom invalido', { description: 'Confira o codigo digitado' });
  };

  const remover = (nome: string) => {
    removerDoCarrinho(nome);
    toast('Item removido', { description: nome });
  };

  const valorDesconto = subtotal * desconto;
  const total = subtotal - valorDesconto;

  return (
    <main className="pagina container py-10">
      <nav className="flex items-center gap-2 text-[13px] text-grafite-400">
        <a href="/catalogo" className="transition-colors hover:text-marca">Produtos</a>
        <span>/</span><span className="text-grafite-600">Carrinho</span>
      </nav>

      <h1 className="mt-5 font-titulo text-[34px] font-extrabold leading-tight">Carrinho</h1>
      <p className="mt-1.5 text-[15px] text-grafite-500">
        Revise os itens antes de finalizar a compra.
      </p>

      {itens.length === 0 ? (
        <div id="carrinho-vazio"
             className="mt-10 grid place-items-center rounded-2xl border border-dashed
                        border-grafite-300 bg-white py-20 text-center">
          <ShoppingBag className="h-11 w-11 text-grafite-300" strokeWidth={1.4} />
          <h2 className="mt-4 font-titulo text-xl font-bold">Seu carrinho esta vazio</h2>
          <p className="mt-1.5 text-sm text-grafite-500">
            Escolha produtos no catalogo para continuar.
          </p>
          <Botao asChild className="mt-6">
            <a {...attrs('carContinuar')} href="/catalogo">Continuar comprando</a>
          </Botao>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-borda bg-white shadow-suave">
              <header className="border-b border-borda px-6 py-4">
                <h2 className="font-titulo text-[15px] font-bold">
                  Itens do pedido &middot;{' '}
                  <span id="contador-unidades" className="numero text-marca">{unidades}</span>{' '}
                  unidade(s)
                </h2>
              </header>
              <Wrap>
                <ul className="divide-y divide-borda">
                  {order(itens.map((it, i) => ({ ...it, i }))).map((item) => (
                    <li key={item.nome}
                        className="item flex flex-wrap items-center gap-4 px-6 py-5">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-grafite-50">
                        <Package className="h-6 w-6 text-grafite-400" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-titulo text-[15px] font-bold leading-snug">{item.nome}</h3>
                        <p className="mt-0.5 text-[13px] text-grafite-500">{item.marca}</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-xl border border-borda p-1">
                        <Isolado>
                        <button {...attrs(`carMenos${item.i + 1}`)} type="button"
                                onClick={() => ajustarQuantidade(item.nome, -1)}
                                aria-label="Diminuir quantidade"
                                className="grid h-8 w-8 place-items-center rounded-lg text-lg
                                           font-bold text-grafite-500 transition-colors
                                           hover:bg-grafite-100 active:scale-95">-</button>
                        </Isolado>
                        <span id={`qtd-item-${item.i + 1}`}
                              className="numero w-8 text-center text-sm font-bold">{item.qtd}</span>
                        <Isolado>
                        <button {...attrs(`carMais${item.i + 1}`)} type="button"
                                onClick={() => ajustarQuantidade(item.nome, 1)}
                                aria-label="Aumentar quantidade"
                                className="grid h-8 w-8 place-items-center rounded-lg text-lg
                                           font-bold text-grafite-500 transition-colors
                                           hover:bg-grafite-100 active:scale-95">+</button>
                        </Isolado>
                      </div>
                      <span className="numero w-28 text-right font-titulo text-[17px] font-extrabold">
                        {real(item.preco * item.qtd)}
                      </span>
                      <Botao {...attrs(`carRemover${item.i + 1}`)} variante="perigo" tamanho="icone"
                             type="button" onClick={() => remover(item.nome)}
                             aria-label={`Remover ${item.nome}`}>
                        <Trash2 className="h-[17px] w-[17px]" />
                      </Botao>
                    </li>
                  ))}
                </ul>
              </Wrap>
            </section>

            <section className="rounded-2xl border border-borda bg-white p-6 shadow-suave">
              <h2 className="flex items-center gap-2 font-titulo text-[15px] font-bold">
                <Tag className="h-4 w-4 text-marca" /> Cupom de desconto
              </h2>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1 space-y-2">
                  <Rotulo htmlFor="campo-cupom">Codigo promocional</Rotulo>
                  <Campo {...attrs('carCupom')} type="text" placeholder="Digite o cupom"
                         value={cupom} onChange={(e) => setCupom(e.target.value)} />
                </div>
                <Botao {...attrs('carAplicar')} variante="secundaria" type="button"
                       onClick={aplicarCupom}>Aplicar cupom</Botao>
              </div>
              <p id="aviso-cupom" className="mt-3 text-[13px] text-grafite-500">
                {aviso || 'Cupons nao sao acumulativos com outras promocoes.'}
              </p>
            </section>
          </div>

          <aside className="rounded-2xl border border-borda bg-white p-6 shadow-suave lg:sticky lg:top-24">
            <h2 className="font-titulo text-[15px] font-bold">Resumo</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-grafite-500">Subtotal</dt>
                <dd id="resumo-subtotal" className="numero font-semibold">{real(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-grafite-500">Frete</dt>
                <dd className="font-semibold text-sucesso">Gratis</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-grafite-500">Desconto</dt>
                <dd id="resumo-desconto"
                    className={desconto ? 'numero font-semibold text-sucesso' : 'text-grafite-400'}>
                  {desconto ? `- ${real(valorDesconto)}` : 'Nenhum'}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex items-baseline justify-between border-t border-borda pt-5">
              <span className="font-titulo font-bold">Total</span>
              <span id="resumo-total" className="numero font-titulo text-[26px] font-extrabold text-marca">
                {real(total)}
              </span>
            </div>
            <div className="mt-6 space-y-2.5">
              <Botao asChild tamanho="lg" bloco>
                <a {...attrs('carFinalizar')} href="/checkout">Finalizar compra</a>
              </Botao>
              <Botao asChild variante="fantasma" bloco>
                <a {...attrs('carContinuar')} href="/catalogo">Continuar comprando</a>
              </Botao>
            </div>
            <p className="mt-5 text-center text-[12px] leading-relaxed text-grafite-400">
              Loja de demonstracao. Nenhuma cobranca e realizada.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}

export default function Carrinho() {
  return <Protegida><Conteudo /></Protegida>;
}
