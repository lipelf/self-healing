import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { VARIANT } from './ui';
import Cabecalho from './Cabecalho';
import Rodape from './Rodape';

const corpo = Inter({ subsets: ['latin'], variable: '--fonte-corpo', display: 'swap' });
const titulo = Plus_Jakarta_Sans({
  subsets: ['latin'], weight: ['600', '700', '800'],
  variable: '--fonte-titulo', display: 'swap',
});

export const metadata: Metadata = {
  title: 'ShopDemo — tecnologia que acompanha voce',
  description: 'Loja de demonstracao usada como alvo dos testes de self-healing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${corpo.variable} ${titulo.variable}`}>
      <body data-variante={VARIANT} className="min-h-screen">
        <Cabecalho />
        <div className="wrap">{children}</div>
        <Rodape />
        <Toaster position="bottom-right" richColors closeButton
                 toastOptions={{ classNames: { toast: 'rounded-xl border-borda shadow-alta' } }} />
      </body>
    </html>
  );
}
