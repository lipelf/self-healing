'use client';
import { attrs, NESTED } from '../ui';

const Wrap = ({ children }) =>
  NESTED ? <div className="layer-a"><fieldset className="layer-b">{children}</fieldset></div>
         : <>{children}</>;

export default function Checkout() {
  return (
    <main>
      <h1>Finalizar pedido</h1>
      <p className="sub">Confirme os dados de entrega e pagamento.</p>

      <form className="card" onSubmit={(e) => e.preventDefault()}>
        <Wrap>
          <div className="row">
            <label htmlFor="checkout-nome">Nome completo</label>
            <input {...attrs('ckNome')} type="text" placeholder="Nome completo" />
          </div>
          <div className="row">
            <label htmlFor="checkout-cpf">CPF</label>
            <input {...attrs('ckCpf')} type="text" placeholder="000.000.000-00" />
          </div>
          <div className="row">
            <label htmlFor="checkout-cep">CEP</label>
            <input {...attrs('ckCep')} type="text" placeholder="00000-000" />
          </div>
          <div className="row">
            <label htmlFor="checkout-endereco">Endereco</label>
            <input {...attrs('ckEndereco')} type="text" placeholder="Rua, numero" />
          </div>
          <div className="row">
            <label htmlFor="checkout-cidade">Cidade</label>
            <input {...attrs('ckCidade')} type="text" placeholder="Cidade" />
          </div>
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
        </Wrap>
        <button {...attrs('ckConfirmar')} type="submit">Confirmar pedido</button>
      </form>
    </main>
  );
}
