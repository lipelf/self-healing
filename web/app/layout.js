import './globals.css';
import { VARIANT } from './ui';

export const metadata = {
  title: 'ShopDemo — loja de demonstracao',
  description: 'Aplicacao alvo dos testes automatizados de self-healing',
};

/* Os elementos deste cabecalho e do rodape nao fazem parte do registro de
   elementos do experimento: eles nao sao alvos de nenhum teste e nao sofrem
   mutacao entre os cenarios. Entram na pagina como concorrentes, aumentando o
   numero de candidatos que o algoritmo precisa descartar — que e o que
   acontece em uma aplicacao real, onde a maior parte do DOM nao tem relacao
   com o elemento procurado. */

function Lupa() {
  return (
    <svg className="busca-icone" width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`v-${VARIANT}`}>
        <div className="topbar">
          <div className="topbar-in">
            <span>Frete gratis acima de <strong>R$ 199</strong></span>
            <div className="topbar-sep">
              <span>Central de atendimento</span>
              <span>Acompanhar pedido</span>
            </div>
          </div>
        </div>

        <header className="header">
          <div className="header-in">
            <a className="marca" href="/" id="marca-home">
              <span className="marca-sigla">S</span>
              <span className="marca-nome">ShopDemo</span>
            </a>

            <div className="busca-global">
              <Lupa />
              <input id="busca-topo" name="busca-topo" type="search"
                     placeholder="O que voce procura hoje?" aria-label="Buscar na loja" />
            </div>

            <nav className="top">
              <a href="/login">Login</a>
              <a href="/catalogo">Catalogo</a>
              <a href="/carrinho">Carrinho</a>
              <a href="/checkout">Checkout</a>
              <a href="/galeria">Galeria</a>
              <a href="/dashboard">Painel</a>
            </nav>

            <div className="header-acoes">
              <button className="icone-botao" id="abrir-favoritos" type="button"
                      aria-label="Favoritos">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/></svg>
              </button>
              <button className="icone-botao" id="abrir-minicarrinho" type="button"
                      aria-label="Carrinho">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>
                     <path d="M2 3h2.2l2.3 12h12l2.2-8H6"/></svg>
                <span className="selo-contagem">2</span>
              </button>
              <div className="avatar" id="menu-usuario" role="button" aria-label="Minha conta">LF</div>
            </div>
          </div>
        </header>

        <div className="wrap">{children}</div>

        <footer className="rodape">
          <div className="rodape-in">
            <div className="rodape-sobre">
              <a className="marca" href="/" style={{ marginBottom: '12px' }}>
                <span className="marca-sigla">S</span>
                <span className="marca-nome">ShopDemo</span>
              </a>
              <p>Loja de demonstracao usada como alvo dos testes automatizados
                 deste trabalho. Nenhuma compra e processada.</p>
            </div>
            <div>
              <h5>Institucional</h5>
              <ul>
                <li><a href="#">Quem somos</a></li>
                <li><a href="#">Trabalhe conosco</a></li>
                <li><a href="#">Politica de privacidade</a></li>
              </ul>
            </div>
            <div>
              <h5>Ajuda</h5>
              <ul>
                <li><a href="#">Trocas e devolucoes</a></li>
                <li><a href="#">Prazos de entrega</a></li>
                <li><a href="#">Formas de pagamento</a></li>
              </ul>
            </div>
            <div>
              <h5>Categorias</h5>
              <ul>
                <li><a href="#">Perifericos</a></li>
                <li><a href="#">Audio</a></li>
                <li><a href="#">Acessorios</a></li>
              </ul>
            </div>
          </div>
          <div className="rodape-base">
            <span>ShopDemo &middot; aplicacao de demonstracao</span>
            <span>Trabalho de Conclusao de Curso &middot; UNESC</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
