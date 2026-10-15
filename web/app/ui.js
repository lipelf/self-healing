// Registro central dos atributos dos elementos interativos.
// Os cenarios do experimento sao gerados reescrevendo este arquivo, o que
// torna cada mutacao reproduzivel e permite saber exatamente quais seletores
// foram invalidados.
export const E = {
  // ---- login -------------------------------------------------------------
  loginEmail:      { id: 'elxdjwv',      name: 'email',      className: 'field field-text' },
  loginSenha:      { id: 'eh5lcxy',      name: 'senha',      className: 'field field-text' },
  loginMostrar:    { id: 'e1kf6ll',name: 'mostrar',    className: 'btn btn-ghost' },
  loginEntrar:     { id: 'e1vm4v1',       name: 'entrar',     className: 'btn btn-primary' },
  loginEsqueci:    { id: 'e1jbe5x',     name: 'esqueci',    className: 'link link-muted' },
  loginCriar:      { id: 'e1xl598', name: 'criar',      className: 'link link-muted' },

  // ---- catalogo ----------------------------------------------------------
  catBusca:        { id: 'eql2sd2',      name: 'busca',      className: 'field field-search' },
  catFiltro:       { id: 'ea1cwvl', name: 'categoria',  className: 'field field-select' },
  catOrdenar:      { id: 'e1krzug',      name: 'ordem',      className: 'field field-select' },
  catAdd1: { id: 'e1ciiox', name: 'add1', className: 'btn btn-add' },
  catDet1: { id: 'e18taoo', name: 'det1', className: 'link link-detail' },
  catAdd2: { id: 'e1c8j38', name: 'add2', className: 'btn btn-add' },
  catDet2: { id: 'e18jb2z', name: 'det2', className: 'link link-detail' },
  catAdd3: { id: 'e1byjhj', name: 'add3', className: 'btn btn-add' },
  catDet3: { id: 'e189bha', name: 'det3', className: 'link link-detail' },
  catAdd4: { id: 'e1dwgpe', name: 'add4', className: 'btn btn-add' },
  catDet4: { id: 'e17zbvl', name: 'det4', className: 'link link-detail' },
  catVerMais:      { id: 'e1qtag5',     name: 'vermais',    className: 'btn btn-secondary' },

  // ---- carrinho ----------------------------------------------------------
  carMais1:        { id: 'e19f8em',  name: 'mais1',      className: 'btn btn-qty' },
  carMenos1:       { id: 'e1phnjs',  name: 'menos1',     className: 'btn btn-qty' },
  carRemover1:     { id: 'e1baj7p',   name: 'rem1',       className: 'btn btn-danger' },
  carMais2:        { id: 'e1958sx',  name: 'mais2',      className: 'btn btn-qty' },
  carMenos2:       { id: 'e1qbmcu',  name: 'menos2',     className: 'btn btn-qty' },
  carRemover2:     { id: 'ehbq4s',   name: 'rem2',       className: 'btn btn-danger' },
  carCupom:        { id: 'eticn0w',      name: 'cupom',      className: 'field field-text' },
  carAplicar:      { id: 'e8sqjn',name: 'aplicar',    className: 'btn btn-secondary' },
  carContinuar:    { id: 'eguwui1',   name: 'continuar',  className: 'link link-muted' },
  carFinalizar:    { id: 'e17oqor',    name: 'finalizar',  className: 'btn btn-primary' },

  // ---- checkout ----------------------------------------------------------
  ckNome:          { id: 'ef16eth',    name: 'nome',       className: 'field field-text' },
  ckCpf:           { id: 'e83sqpf',     name: 'cpf',        className: 'field field-text' },
  ckCep:           { id: 'eepg5g8',     name: 'cep',        className: 'field field-text' },
  ckEndereco:      { id: 'e1r9a16',name: 'endereco',   className: 'field field-text' },
  ckCidade:        { id: 'e1akyz7',  name: 'cidade',     className: 'field field-text' },
  ckPagamento:     { id: 'e2gnds0',name: 'pagamento',  className: 'field field-select' },
  ckParcelas:      { id: 'e1fdk71',name: 'parcelas',   className: 'field field-select' },
  ckConfirmar:     { id: 'eldvsct',    name: 'confirmar',  className: 'btn btn-primary' },

  // ---- galeria: botoes de icone sem texto nem rotulo -------------------
  thumb1:          { id: 'ect9w2p',           name: '',           className: 'thumb thumb-item' },
  thumb2:          { id: 'ebzb2zs',           name: '',           className: 'thumb thumb-item' },
  thumb3:          { id: 'ec9aoor',           name: '',           className: 'thumb thumb-item' },
  thumb4:          { id: 'edn8p5m',           name: '',           className: 'thumb thumb-item' },
  thumb5:          { id: 'edx8aul',           name: '',           className: 'thumb thumb-item' },
  thumb6:          { id: 'ed39hro',           name: '',           className: 'thumb thumb-item' },
  thumb7:          { id: 'edd93gn',           name: '',           className: 'thumb thumb-item' },
  thumb8:          { id: 'eabdgty',           name: '',           className: 'thumb thumb-item' },
};

// Espalha os atributos do registro no elemento JSX.
export const attrs = (key) => {
  const e = E[key];
  if (!e) throw new Error(`elemento desconhecido: ${key}`);
  return { id: e.id, name: e.name, className: e.className };
};

// Variacao estrutural usada pelo cenario C4: quando ativa, os controles sao
// envolvidos por camadas adicionais, alterando a hierarquia do DOM.
export const NESTED = false;

// Cenario C4: inverte a ordem dos itens em listas, alterando xpath,
// posicao e texto dos vizinhos.
export const REORDER = false;

// Numero de produtos do catalogo: controla a densidade de
// elementos semelhantes disputando a mesma recuperacao.
export const CATALOG_SIZE = 4;

// Cenario ativo ('base', 'c1', 'c2', 'c3', 'c4').
export const VARIANT = 'c1';
