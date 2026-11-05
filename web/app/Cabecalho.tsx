'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, LogOut, Search, ShoppingCart } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { encerrarSessao, useCarrinho, useFavoritos, useSessao } from './sessao';

export default function Cabecalho() {
  const { sessao } = useSessao();
  const { unidades } = useCarrinho();
  const favoritos = useFavoritos();
  const router = useRouter();
  const [termo, setTermo] = useState('');

  const [pulsando, setPulsando] = useState(false);
  const anterior = useRef(unidades);
  useEffect(() => {
    if (anterior.current !== unidades && unidades > 0) {
      setPulsando(true);
      const t = setTimeout(() => setPulsando(false), 450);
      anterior.current = unidades;
      return () => clearTimeout(t);
    }
    anterior.current = unidades;
  }, [unidades]);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(termo.trim() ? `/catalogo?q=${encodeURIComponent(termo.trim())}` : '/catalogo');
  };

  const sair = () => { encerrarSessao(); router.push('/login'); };

  return (
    <>
      <div className="bg-grafite-900 text-white">
        <div className="container flex flex-wrap items-center justify-between gap-2
                        py-2 text-[12.5px] font-medium">
          <span>Frete gratis acima de <strong className="text-marca-300">R$ 199</strong></span>
          <div className="flex items-center gap-5 text-grafite-300">
            <span className="cursor-default transition-colors hover:text-white">Central de atendimento</span>
            <span className="cursor-default transition-colors hover:text-white">Acompanhar pedido</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-borda bg-white/85 backdrop-blur-md">
        <div className="container flex h-[72px] items-center gap-5">
          <a href={sessao ? '/catalogo' : '/login'} id="marca-home"
             className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-marca font-titulo
                             text-xl font-extrabold text-white shadow-marca">S</span>
            <span className="hidden font-titulo text-[19px] font-extrabold sm:block">ShopDemo</span>
          </a>

          <form onSubmit={buscar} role="search" className="relative hidden flex-1 md:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px]
                               -translate-y-1/2 text-grafite-400" />
            <input id="busca-topo" name="busca-topo" type="search" value={termo}
                   onChange={(e) => setTermo(e.target.value)}
                   aria-label="Buscar na loja" placeholder="O que voce procura hoje?"
                   className="h-11 w-full rounded-full border border-borda bg-grafite-50 pl-12 pr-4
                              text-sm transition-colors placeholder:text-grafite-400
                              focus:border-marca focus:bg-white focus:outline-none
                              focus:ring-2 focus:ring-marca/20" />
          </form>

          <nav className="hidden items-center gap-1 lg:flex">
            {sessao && <>
              <a href="/catalogo" className="rounded-lg px-3 py-2 text-sm font-semibold
                                             text-grafite-600 transition-colors hover:bg-grafite-100 hover:text-grafite-900">Produtos</a>
              <a href="/galeria" className="rounded-lg px-3 py-2 text-sm font-semibold
                                            text-grafite-600 transition-colors hover:bg-grafite-100 hover:text-grafite-900">Galeria</a>
            </>}
            <a href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-semibold
                                            text-grafite-600 transition-colors hover:bg-grafite-100 hover:text-grafite-900">Painel do QA</a>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button id="abrir-favoritos" type="button" aria-label="Favoritos"
                    className="relative grid h-10 w-10 place-items-center rounded-xl
                               text-grafite-600 transition-colors hover:bg-grafite-100">
              <Heart className="h-[18px] w-[18px]" />
              {favoritos.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px]
                                 place-items-center rounded-full bg-grafite-900 px-1
                                 text-[10px] font-bold text-white">{favoritos.length}</span>
              )}
            </button>

            <a href="/carrinho" id="abrir-minicarrinho" aria-label="Carrinho"
               className="relative grid h-10 w-10 place-items-center rounded-xl
                          text-grafite-600 transition-colors hover:bg-grafite-100">
              <ShoppingCart className="h-[18px] w-[18px]" />
              <span id="contagem-topo"
                    className={cn('absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px]',
                                  'place-items-center rounded-full bg-marca px-1 text-[10px]',
                                  'font-bold text-white transition-transform',
                                  pulsando && 'animate-pulo')}>{unidades}</span>
            </a>

            {sessao ? (
              <button id="menu-usuario" type="button" onClick={sair} title={sessao.email}
                      aria-label="Sair da conta"
                      className="group ml-1 flex items-center gap-2 rounded-xl border border-borda
                                 py-1 pl-1 pr-2.5 transition-colors hover:border-grafite-300">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-marca-50
                                 text-[12px] font-bold text-marca-700">
                  {sessao.email.slice(0, 2).toUpperCase()}
                </span>
                <LogOut className="h-4 w-4 text-grafite-400 group-hover:text-grafite-700" />
              </button>
            ) : (
              <Botao asChild variante="primaria" tamanho="sm" className="ml-1">
                <a href="/login" id="entrar-topo">Entrar</a>
              </Botao>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
