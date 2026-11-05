import { Separator } from '@radix-ui/react-separator';

const COLUNAS = [
  { titulo: 'Institucional', itens: ['Quem somos', 'Trabalhe conosco', 'Politica de privacidade'] },
  { titulo: 'Ajuda', itens: ['Trocas e devolucoes', 'Prazos de entrega', 'Formas de pagamento'] },
  { titulo: 'Categorias', itens: ['Perifericos', 'Monitores', 'Acessorios'] },
];

export default function Rodape() {
  return (
    <footer className="mt-24 border-t border-borda bg-white">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-marca font-titulo
                             text-lg font-extrabold text-white">S</span>
            <span className="font-titulo text-lg font-extrabold">ShopDemo</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-grafite-500">
            Loja de demonstracao usada como alvo dos testes automatizados deste
            trabalho. Nenhuma compra e processada.
          </p>
        </div>
        {COLUNAS.map((c) => (
          <nav key={c.titulo}>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-grafite-400">
              {c.titulo}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {c.itens.map((i) => (
                <li key={i}>
                  <span className="cursor-default text-sm text-grafite-600 transition-colors hover:text-marca">
                    {i}
                  </span>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <Separator className="h-px bg-borda" />
      <div className="container flex flex-wrap items-center justify-between gap-3 py-6
                      text-[13px] text-grafite-400">
        <span>ShopDemo &middot; projeto academico Unesc</span>
        <span>Ambiente de demonstracao, sem cobrancas reais</span>
      </div>
    </footer>
  );
}
