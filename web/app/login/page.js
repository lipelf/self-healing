'use client';
import { attrs, NESTED } from '../ui';

const Wrap = ({ children }) =>
  NESTED ? <div className="layer-a"><div className="layer-b">{children}</div></div>
         : <>{children}</>;

export default function Login() {
  return (
    <main>
      <h1>Acessar conta</h1>
      <p className="sub">Informe suas credenciais para continuar.</p>
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
            <button {...attrs('loginEntrar')} type="submit">Entrar</button>
          </div>
          <div className="row">
            <a {...attrs('loginEsqueci')} href="#">Esqueci minha senha</a>
            <a {...attrs('loginCriar')} href="#">Criar conta</a>
          </div>
        </Wrap>
      </form>
    </main>
  );
}
