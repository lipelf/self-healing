'use client';
import { attrs, NESTED } from '../ui';

const Wrap = ({ children }) =>
  NESTED ? <div className="layer-a"><div className="layer-b">{children}</div></div>
         : <>{children}</>;

export default function Login() {
  return (
    <main>
      <nav className="trilha">
        <a href="/">Inicio</a><span className="sep">/</span><span>Entrar</span>
      </nav>

      <div className="pagina-topo">
        <div>
          <h1>Acessar conta</h1>
          <p className="sub">Entre com suas credenciais para acompanhar pedidos,
             salvar favoritos e finalizar compras mais rapido.</p>
        </div>
      </div>

      <div style={{ maxWidth: 460 }}>
        <form className="card" onSubmit={(e) => e.preventDefault()}>
          <Wrap>
            <div className="row">
              <label htmlFor="login-email">E-mail</label>
              <input {...attrs('loginEmail')} type="email" placeholder="voce@exemplo.com" />
            </div>
            <div className="row">
              <label htmlFor="login-senha">Senha</label>
              <input {...attrs('loginSenha')} type="password" placeholder="Sua senha" />
              <button {...attrs('loginMostrar')} type="button">Mostrar senha</button>
            </div>
            <div className="row">
              <button {...attrs('loginEntrar')} className="btn btn-primary btn-bloco" type="submit">
                Entrar
              </button>
            </div>
            <div className="row">
              <a {...attrs('loginEsqueci')} href="#">Esqueci minha senha</a>
              <a {...attrs('loginCriar')} href="#">Criar conta</a>
            </div>
          </Wrap>
        </form>

        <div className="card">
          <p className="card-titulo">Ou continue com</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" id="entrar-google" type="button"
                    style={{ flex: 1, justifyContent: 'center' }}>Google</button>
            <button className="btn btn-secondary" id="entrar-github" type="button"
                    style={{ flex: 1, justifyContent: 'center' }}>GitHub</button>
          </div>
          <p className="ajuda" style={{ marginTop: 14 }}>
            Ao continuar voce concorda com os <a className="link" href="#">termos de uso</a> e
            com a <a className="link" href="#">politica de privacidade</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
