import './globals.css';
import { VARIANT } from './ui';

export const metadata = {
  title: 'ShopDemo - aplicacao de demonstracao',
  description: 'Aplicacao alvo dos testes automatizados de self-healing',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`v-${VARIANT}`}>
        <nav className="top">
          <a href="/login">Login</a>
          <a href="/catalogo">Catalogo</a>
          <a href="/carrinho">Carrinho</a>
          <a href="/checkout">Checkout</a>
          <a href="/galeria">Galeria</a>
          <a href="/dashboard">Painel</a>
        </nav>
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}
