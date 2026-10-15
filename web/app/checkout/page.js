'use client';
import { attrs, NESTED } from '../ui';

const Wrap = ({ children }) =>
  NESTED ? <div className="layer-a"><fieldset className="layer-b">{children}</fieldset></div>
         : <>{children}</>;

export default function Checkout() {
  return (
    <main>
      <nav className="trilha">
        <a href="/">Inicio</a><span className="sep">/</span>
        <a href="/carrinho">Carrinho</a><span className="sep">/</span>
        <span>Finalizar pedido</span>
      </nav>

      <div className="pagina-topo">
        <div>
          <h1>Finalizar pedido</h1>
          <p className="sub">Confirme os dados de entrega e pagamento para concluir a compra.</p>
        </div>
      </div>

      <div className="passos">
        <div className="passo feito"><span className="passo-num">&#10003;</span> Carrinho</div>
        <div className="passo-traco" />
        <div className="passo ativo"><span className="passo-num">2</span> Entrega e pagamento</div>
        <div className="passo-traco" />
        <div className="passo"><span className="passo-num">3</span> Confirmacao</div>
      </div>

      <div className="colunas">
        <form className="card" onSubmit={(e) => e.preventDefault()}>
          <p className="card-titulo">Dados de entrega</p>
          <Wrap>
            <div className="row">
              <label htmlFor="checkout-nome">Nome completo</label>
              <input {...attrs('ckNome')} type="text" placeholder="Nome completo" />
            </div>
            <div className="dupla">
              <div className="row">
                <label htmlFor="checkout-cpf">CPF</label>
                <input {...attrs('ckCpf')} type="text" placeholder="000.000.000-00" />
              </div>
              <div className="row">
                <label htmlFor="checkout-cep">CEP</label>
                <input {...attrs('ckCep')} type="text" placeholder="00000-000" />
              </div>
            </div>
            <div className="row">
              <label htmlFor="checkout-endereco">Endereco</label>
              <input {...attrs('ckEndereco')} type="text" placeholder="Rua, numero" />
            </div>
            <div className="row">
              <label htmlFor="checkout-cidade">Cidade</label>
              <input {...attrs('ckCidade')} type="text" placeholder="Cidade" />
            </div>
            <div className="dupla">
              <div className="row">
                <label htmlFor="checkout-pagamento">Forma de pagamento</label>
                <select {...attrs('ckPagamento')} defaultValue="cartao">
                  <option value="cartao">Cartao de credito</option>
                  <option value="pix">Pix</option>
                  <option value="boleto">Boleto</option>
                </select>
              </div>
              <div className="row">
                <label htmlFor="checkout-parcelas">Parcelas</label>
                <select {...attrs('ckParcelas')} defaultValue="1">
                  <option value="1">1x sem juros</option>
                  <option value="3">3x sem juros</option>
                </select>
              </div>
            </div>
            <div className="row">
              <label htmlFor="checkout-observacao">Observacao para a entrega</label>
              <input className="field" id="checkout-observacao" name="observacao" type="text"
                     placeholder="Apartamento, ponto de referencia (opcional)" />
            </div>
          </Wrap>
          <button {...attrs('ckConfirmar')} className="btn btn-primary btn-bloco" type="submit">
            Confirmar pedido
          </button>
        </form>

        <div>
          <div className="card">
            <p className="card-titulo">Resumo do pedido</p>
            <div className="resumo-linha"><span>Teclado mecanico</span><span>R$ 349,90</span></div>
            <div className="resumo-linha"><span>Mouse sem fio</span><span>R$ 129,90</span></div>
            <div className="resumo-linha"><span>Frete</span><span>Gratis</span></div>
            <div className="total"><span>Total</span><span>R$ 479,80</span></div>
          </div>
          <div className="card">
            <p className="card-titulo">Entrega</p>
            <p className="ajuda" style={{ margin: 0 }}>
              Receba entre <strong>3 e 5 dias uteis</strong> apos a confirmacao do pagamento.
              O codigo de rastreio e enviado por e-mail.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
