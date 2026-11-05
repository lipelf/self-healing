export interface Elemento { id: string; name: string; className: string }

export const E: Record<string, Elemento> = {
  loginEmail:      { id: 'login-email',      name: 'email',      className: 'field field-text' },
  loginSenha:      { id: 'login-senha',      name: 'senha',      className: 'field field-text' },
  loginMostrar:    { id: 'btn-mostrar-senha',name: 'mostrar',    className: 'btn btn-ghost' },
  loginEntrar:     { id: 'btn-entrar',       name: 'entrar',     className: 'btn btn-primary' },
  loginEsqueci:    { id: 'link-esqueci',     name: 'esqueci',    className: 'link link-muted' },
  loginCriar:      { id: 'link-criar-conta', name: 'criar',      className: 'link link-muted' },

  catBusca:        { id: 'campo-busca',      name: 'busca',      className: 'field field-search' },
  catFiltro:       { id: 'filtro-categoria', name: 'categoria',  className: 'field field-select' },
  catOrdenar:      { id: 'ordenar-por',      name: 'ordem',      className: 'field field-select' },
  // apply-variant.mjs injeta no marcador abaixo as entradas do catalogo,
  // conforme a densidade escolhida. O marcador e codigo, nao comentario:
  // sem ele o catalogo fica vazio e a pagina nao renderiza.
  /*__CATALOG__*/
  catVerMais:      { id: 'btn-ver-mais',     name: 'vermais',    className: 'btn btn-secondary' },

  carMais1:        { id: 'aumentar-item-1',  name: 'mais1',      className: 'btn btn-qty' },
  carMenos1:       { id: 'diminuir-item-1',  name: 'menos1',     className: 'btn btn-qty' },
  carRemover1:     { id: 'remover-item-1',   name: 'rem1',       className: 'btn btn-danger' },
  carMais2:        { id: 'aumentar-item-2',  name: 'mais2',      className: 'btn btn-qty' },
  carMenos2:       { id: 'diminuir-item-2',  name: 'menos2',     className: 'btn btn-qty' },
  carRemover2:     { id: 'remover-item-2',   name: 'rem2',       className: 'btn btn-danger' },
  carCupom:        { id: 'campo-cupom',      name: 'cupom',      className: 'field field-text' },
  carAplicar:      { id: 'btn-aplicar-cupom',name: 'aplicar',    className: 'btn btn-secondary' },
  carContinuar:    { id: 'link-continuar',   name: 'continuar',  className: 'link link-muted' },
  carFinalizar:    { id: 'btn-finalizar',    name: 'finalizar',  className: 'btn btn-primary' },

  ckNome:          { id: 'checkout-nome',    name: 'nome',       className: 'field field-text' },
  ckCpf:           { id: 'checkout-cpf',     name: 'cpf',        className: 'field field-text' },
  ckCep:           { id: 'checkout-cep',     name: 'cep',        className: 'field field-text' },
  ckEndereco:      { id: 'checkout-endereco',name: 'endereco',   className: 'field field-text' },
  ckCidade:        { id: 'checkout-cidade',  name: 'cidade',     className: 'field field-text' },
  ckPagamento:     { id: 'checkout-pagamento',name: 'pagamento',  className: 'field field-select' },
  ckParcelas:      { id: 'checkout-parcelas',name: 'parcelas',   className: 'field field-select' },
  ckConfirmar:     { id: 'btn-confirmar',    name: 'confirmar',  className: 'btn btn-primary' },

  thumb1:          { id: 'thumb-1',           name: '',           className: 'thumb thumb-item' },
  thumb2:          { id: 'thumb-2',           name: '',           className: 'thumb thumb-item' },
  thumb3:          { id: 'thumb-3',           name: '',           className: 'thumb thumb-item' },
  thumb4:          { id: 'thumb-4',           name: '',           className: 'thumb thumb-item' },
  thumb5:          { id: 'thumb-5',           name: '',           className: 'thumb thumb-item' },
  thumb6:          { id: 'thumb-6',           name: '',           className: 'thumb thumb-item' },
  thumb7:          { id: 'thumb-7',           name: '',           className: 'thumb thumb-item' },
  thumb8:          { id: 'thumb-8',           name: '',           className: 'thumb thumb-item' },
};

export const attrs = (key: string) => {
  const e = E[key];
  if (!e) throw new Error(`elemento desconhecido: ${key}`);
  return { id: e.id, name: e.name, className: e.className };
};

export const NESTED = false;

export const REORDER = false;

export const CATALOG_SIZE = 4;

export const VARIANT = 'base';
