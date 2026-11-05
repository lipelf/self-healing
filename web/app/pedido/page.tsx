'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Package, Truck } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import Protegida from '../Protegida';
import { real } from '../sessao';

interface Pedido { numero: string; unidades: number; total: number; nome: string }

function Conteudo() {
  const [pedido, setPedido] = useState<Pedido | null>(null);

  useEffect(() => {
    try {
      const bruto = window.sessionStorage.getItem('shopdemo:pedido');
      setPedido(bruto ? JSON.parse(bruto) : null);
    } catch { setPedido(null); }
  }, []);

  return (
    <main className="pagina container py-14">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-9 w-9 text-sucesso" strokeWidth={1.6} />
        </span>
        <h1 className="mt-6 font-titulo text-[32px] font-extrabold leading-tight">
          Pedido confirmado
        </h1>
        <p className="mt-2 text-[15px] text-grafite-500">
          Obrigado pela compra. Voce recebera o rastreio por e-mail.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-borda bg-white p-7 shadow-media">
        {pedido ? (
          <>
            <dl className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-grafite-500">Numero do pedido</dt>
                <dd id="pedido-numero" className="numero font-titulo font-bold">{pedido.numero}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-grafite-500">Itens</dt>
                <dd id="pedido-itens" className="numero font-semibold">{pedido.unidades}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-grafite-500">Destinatario</dt>
                <dd id="pedido-nome" className="font-semibold">{pedido.nome}</dd>
              </div>
            </dl>
            <div className="mt-5 flex items-baseline justify-between border-t border-borda pt-5">
              <span className="font-titulo font-bold">Total</span>
              <span id="pedido-total" className="numero font-titulo text-[26px] font-extrabold text-marca">
                {real(pedido.total)}
              </span>
            </div>

            <div className="mt-7 flex items-center gap-4 rounded-xl bg-grafite-50 p-4">
              <Truck className="h-5 w-5 shrink-0 text-marca" />
              <p className="text-[13px] leading-snug text-grafite-600">
                Entrega estimada em <strong className="text-grafite-900">3 a 5 dias uteis</strong>.
                Enviaremos o codigo de rastreio assim que o pedido for despachado.
              </p>
            </div>
          </>
        ) : (
          <div className="grid place-items-center py-10 text-center">
            <Package className="h-10 w-10 text-grafite-300" strokeWidth={1.5} />
            <p id="pedido-ausente" className="mt-4 text-sm text-grafite-500">
              Nenhum pedido nesta sessao.
            </p>
          </div>
        )}

        <Botao asChild variante="secundaria" bloco className="mt-6">
          <a id="voltar-catalogo" href="/catalogo">Voltar ao catalogo</a>
        </Botao>
      </div>
    </main>
  );
}

export default function Pedido() {
  return <Protegida><Conteudo /></Protegida>;
}
