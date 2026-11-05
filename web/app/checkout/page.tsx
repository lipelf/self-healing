'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, CreditCard, MapPin } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Campo, Rotulo, Selecao } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { attrs, NESTED } from '../ui';
import Protegida from '../Protegida';
import { esvaziarCarrinho, real, useCarrinho } from '../sessao';

const OBRIGATORIOS = ['nome', 'cpf', 'cep', 'endereco', 'cidade'] as const;

const Wrap = ({ children }: { children: React.ReactNode }) =>
  NESTED ? <div className="layer-a"><fieldset className="layer-b">{children}</fieldset></div>
         : <>{children}</>;

function Passos({ atual }: { atual: number }) {
  const nomes = ['Carrinho', 'Entrega e pagamento', 'Confirmacao'];
  return (
    <ol className="mt-7 flex flex-wrap items-center gap-3">
      {nomes.map((nome, i) => {
        const feito = i < atual, ativo = i === atual;
        return (
          <li key={nome} className="flex items-center gap-3">
            <span className={cn('flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold',
              feito && 'border-sucesso/25 bg-emerald-50 text-sucesso',
              ativo && 'border-marca bg-marca text-white shadow-marca',
              !feito && !ativo && 'border-borda bg-white text-grafite-400')}>
              <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold',
                feito ? 'bg-sucesso text-white' : ativo ? 'bg-white/25' : 'bg-grafite-100')}>
                {feito ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              {nome}
            </span>
            {i < nomes.length - 1 && <span className="h-px w-6 bg-borda" />}
          </li>
        );
      })}
    </ol>
  );
}

function Conteudo() {
  const router = useRouter();
  const { itens, unidades, subtotal } = useCarrinho();
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');

  const liga = (nome: string) => ({
    value: campos[nome] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setCampos((c) => ({ ...c, [nome]: e.target.value })),
  });

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault();
    if (itens.length === 0) {
      setErro('Seu carrinho esta vazio');
      toast.error('Carrinho vazio', { description: 'Adicione produtos antes de finalizar' });
      return;
    }
    const faltando = OBRIGATORIOS.filter((k) => !(campos[k] || '').trim());
    if (faltando.length) {
      setErro('Preencha todos os dados de entrega');
      toast.error('Dados incompletos',
                  { description: `Faltam ${faltando.length} campo(s) obrigatorio(s)` });
      return;
    }
    const numero = `PED-${Date.now().toString().slice(-6)}`;
    try {
      window.sessionStorage.setItem('shopdemo:pedido', JSON.stringify(
        { numero, unidades, total: subtotal, nome: campos.nome }));
    } catch { /* segue mesmo sem armazenamento */ }
    esvaziarCarrinho();
    toast.success('Pedido confirmado', { description: `Numero ${numero}` });
    router.push('/pedido');
  };

  return (
    <main className="pagina container py-10">
      <nav className="flex items-center gap-2 text-[13px] text-grafite-400">
        <a href="/catalogo" className="transition-colors hover:text-marca">Produtos</a>
        <span>/</span>
        <a href="/carrinho" className="transition-colors hover:text-marca">Carrinho</a>
        <span>/</span><span className="text-grafite-600">Finalizar</span>
      </nav>

      <h1 className="mt-5 font-titulo text-[34px] font-extrabold leading-tight">Finalizar pedido</h1>
      <Passos atual={1} />

      <form onSubmit={confirmar} className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-5">
          <section className="rounded-2xl border border-borda bg-white p-6 shadow-suave">
            <h2 className="flex items-center gap-2 font-titulo text-[15px] font-bold">
              <MapPin className="h-4 w-4 text-marca" /> Dados de entrega
            </h2>
            <Wrap>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Rotulo htmlFor="checkout-nome">Nome completo</Rotulo>
                  <Campo {...attrs('ckNome')} type="text" placeholder="Nome completo" {...liga('nome')} />
                </div>
                <div className="space-y-2">
                  <Rotulo htmlFor="checkout-cpf">CPF</Rotulo>
                  <Campo {...attrs('ckCpf')} type="text" placeholder="000.000.000-00" {...liga('cpf')} />
                </div>
                <div className="space-y-2">
                  <Rotulo htmlFor="checkout-cep">CEP</Rotulo>
                  <Campo {...attrs('ckCep')} type="text" placeholder="00000-000" {...liga('cep')} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Rotulo htmlFor="checkout-endereco">Endereco</Rotulo>
                  <Campo {...attrs('ckEndereco')} type="text" placeholder="Rua, numero" {...liga('endereco')} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Rotulo htmlFor="checkout-cidade">Cidade</Rotulo>
                  <Campo {...attrs('ckCidade')} type="text" placeholder="Cidade" {...liga('cidade')} />
                </div>
              </div>
            </Wrap>
          </section>

          <section className="rounded-2xl border border-borda bg-white p-6 shadow-suave">
            <h2 className="flex items-center gap-2 font-titulo text-[15px] font-bold">
              <CreditCard className="h-4 w-4 text-marca" /> Pagamento
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Rotulo htmlFor="checkout-pagamento">Forma de pagamento</Rotulo>
                <Selecao {...attrs('ckPagamento')} defaultValue="cartao">
                  <option value="cartao">Cartao de credito</option>
                  <option value="pix">Pix</option>
                  <option value="boleto">Boleto</option>
                </Selecao>
              </div>
              <div className="space-y-2">
                <Rotulo htmlFor="checkout-parcelas">Parcelas</Rotulo>
                <Selecao {...attrs('ckParcelas')} defaultValue="1">
                  <option value="1">1x sem juros</option>
                  <option value="3">3x sem juros</option>
                </Selecao>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Rotulo htmlFor="checkout-observacao">Observacao para a entrega</Rotulo>
                <Campo id="checkout-observacao" name="observacao" type="text"
                       placeholder="Apartamento, ponto de referencia (opcional)" />
              </div>
            </div>
          </section>
        </div>

        <aside className="rounded-2xl border border-borda bg-white p-6 shadow-suave lg:sticky lg:top-24">
          <h2 className="font-titulo text-[15px] font-bold">Resumo do pedido</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-grafite-500">Itens</dt>
              <dd className="numero font-semibold">{unidades}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-grafite-500">Frete</dt>
              <dd className="font-semibold text-sucesso">Gratis</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-baseline justify-between border-t border-borda pt-5">
            <span className="font-titulo font-bold">Total</span>
            <span className="numero font-titulo text-[26px] font-extrabold text-marca">
              {real(subtotal)}
            </span>
          </div>
          <p id="erro-checkout" role="alert"
             className={cn('mt-5 rounded-xl px-3.5 py-2.5 text-[13px]',
               erro ? 'bg-red-50 font-medium text-erro' : 'bg-grafite-50 text-grafite-500')}>
            {erro || `Pedido com ${unidades} item(ns), total ${real(subtotal)}`}
          </p>
          <Botao {...attrs('ckConfirmar')} type="submit" tamanho="lg" bloco className="mt-4">
            Confirmar pedido
          </Botao>
        </aside>
      </form>
    </main>
  );
}

export default function Checkout() {
  return <Protegida><Conteudo /></Protegida>;
}
