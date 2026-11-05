'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, ShieldCheck, Truck, Undo2 } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Campo, Rotulo } from '@/components/ui/input';
import { attrs, NESTED } from '../ui';
import { autenticar, CREDENCIAL } from '../sessao';

const VANTAGENS = [
  { Icone: Truck, titulo: 'Frete gratis', texto: 'Acima de R$ 199 para todo o Brasil' },
  { Icone: Undo2, titulo: '30 dias para trocar', texto: 'Devolucao sem custo adicional' },
  { Icone: ShieldCheck, titulo: 'Compra protegida', texto: 'Seus dados ficam no seu navegador' },
];

const Wrap = ({ children }: { children: React.ReactNode }) =>
  NESTED ? <div className="layer-a"><div className="layer-b">{children}</div></div>
         : <>{children}</>;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (autenticar(email, senha)) {
      setErro('');
      toast.success('Bem-vindo de volta', { description: 'Sessao iniciada com sucesso' });
      router.push('/catalogo');
    } else {
      setErro('E-mail ou senha invalidos');
      toast.error('Nao foi possivel entrar', { description: 'Verifique o e-mail e a senha' });
    }
  };

  return (
    <main className="pagina">
      <div className="container grid items-center gap-14 py-14 lg:grid-cols-[1.05fr_minmax(0,460px)] lg:py-20">
        <section className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-marca-50 px-3 py-1
                           text-[12px] font-bold uppercase tracking-wider text-marca-700">
            Tecnologia e perifericos
          </span>
          <h1 className="mt-5 font-titulo text-[40px] font-extrabold leading-[1.08] text-grafite-900
                         sm:text-[52px]">
            Tudo para o seu<br />
            <span className="text-marca">setup</span> em um lugar so.
          </h1>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-grafite-500">
            Entre na sua conta para acompanhar pedidos, salvar favoritos e
            finalizar a compra em poucos cliques.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {VANTAGENS.map(({ Icone, titulo, texto }) => (
              <li key={titulo} className="rounded-2xl border border-borda bg-white p-4 shadow-suave">
                <Icone className="h-5 w-5 text-marca" />
                <p className="mt-3 font-titulo text-sm font-bold text-grafite-900">{titulo}</p>
                <p className="mt-1 text-[13px] leading-snug text-grafite-500">{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <form onSubmit={entrar}
                className="rounded-3xl border border-borda bg-white p-7 shadow-alta sm:p-9">
            <h2 className="font-titulo text-[22px] font-extrabold">Acessar conta</h2>
            <p className="mt-1.5 text-sm text-grafite-500">
              Use as credenciais de demonstracao abaixo.
            </p>

            <Wrap>
              <div className="mt-7 space-y-5">
                <div className="space-y-2">
                  <Rotulo htmlFor="login-email">E-mail</Rotulo>
                  <Campo {...attrs('loginEmail')} type="email" placeholder="voce@exemplo.com"
                         value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Rotulo htmlFor="login-senha">Senha</Rotulo>
                  <div className="relative">
                    <Campo {...attrs('loginSenha')} type={verSenha ? 'text' : 'password'}
                           placeholder="Sua senha" className="pr-12"
                           value={senha} onChange={(e) => setSenha(e.target.value)} />
                    <button {...attrs('loginMostrar')} type="button"
                            onClick={() => setVerSenha((v) => !v)}
                            aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2
                                       place-items-center rounded-lg text-grafite-400
                                       transition-colors hover:bg-grafite-100 hover:text-grafite-700">
                      {verSenha ? <EyeOff className="h-[17px] w-[17px]" />
                                : <Eye className="h-[17px] w-[17px]" />}
                    </button>
                  </div>
                </div>

                <p id="erro-login" role="alert"
                   className={erro ? 'rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-erro'
                                   : 'rounded-xl bg-grafite-50 px-3.5 py-2.5 text-[13px] text-grafite-500'}>
                  {erro || `Demonstracao: ${CREDENCIAL.email} / ${CREDENCIAL.senha}`}
                </p>

                <Botao {...attrs('loginEntrar')} type="submit" tamanho="lg" bloco>
                  Entrar
                </Botao>

                <div className="flex items-center justify-between pt-1 text-[13px] font-semibold">
                  <a {...attrs('loginEsqueci')} href="#"
                     className="text-grafite-500 transition-colors hover:text-marca">
                    Esqueci minha senha
                  </a>
                  <a {...attrs('loginCriar')} href="#"
                     className="text-marca transition-colors hover:text-marca-700">
                    Criar conta
                  </a>
                </div>
              </div>
            </Wrap>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Botao variante="secundaria" id="entrar-google" type="button">Google</Botao>
            <Botao variante="secundaria" id="entrar-github" type="button">GitHub</Botao>
          </div>
        </section>
      </div>
    </main>
  );
}
