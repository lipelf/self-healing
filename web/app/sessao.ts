'use client';
import { useEffect, useState } from 'react';

export interface ProdutoBase { nome: string; marca: string; preco: number }
export interface ItemCarrinho extends ProdutoBase { qtd: number }
export interface Sessao { email: string }

const CHAVE_SESSAO = 'shopdemo:sessao';
const CHAVE_CARRINHO = 'shopdemo:carrinho';
const CHAVE_FAVORITOS = 'shopdemo:favoritos';

export const CREDENCIAL = {
  email: process.env.NEXT_PUBLIC_DEMO_EMAIL || 'luiz@unesc.net',
  senha: process.env.NEXT_PUBLIC_DEMO_SENHA || 'unesc2026',
};

function ler<T>(chave: string, padrao: T): T {
  if (typeof window === 'undefined') return padrao;
  try {
    const bruto = window.sessionStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : padrao;
  } catch {
    return padrao;
  }
}

function escrever(chave: string, valor: unknown) {
  try {
    window.sessionStorage.setItem(chave, JSON.stringify(valor));
    window.dispatchEvent(new Event('shopdemo:mudou'));
  } catch {
  }
}

export function autenticar(email: string, senha: string): boolean {
  const ok = email.trim().toLowerCase() === CREDENCIAL.email &&
             senha === CREDENCIAL.senha;
  if (ok) escrever(CHAVE_SESSAO, { email: email.trim().toLowerCase() });
  return ok;
}

export function encerrarSessao() {
  try {
    window.sessionStorage.removeItem(CHAVE_SESSAO);
    window.sessionStorage.removeItem(CHAVE_CARRINHO);
    window.sessionStorage.removeItem(CHAVE_FAVORITOS);
    window.dispatchEvent(new Event('shopdemo:mudou'));
  } catch {}
}

export function adicionarAoCarrinho(produto: ProdutoBase) {
  const itens = ler<ItemCarrinho[]>(CHAVE_CARRINHO, []);
  const existente = itens.find((i: ItemCarrinho) => i.nome === produto.nome);
  if (existente) existente.qtd += 1;
  else itens.push({ ...produto, qtd: 1 });
  escrever(CHAVE_CARRINHO, itens);
}

export function ajustarQuantidade(nome: string, delta: number) {
  const itens = ler<ItemCarrinho[]>(CHAVE_CARRINHO, [])
    .map((i: ItemCarrinho) => (i.nome === nome ? { ...i, qtd: Math.max(0, i.qtd + delta) } : i))
    .filter((i: ItemCarrinho) => i.qtd > 0);
  escrever(CHAVE_CARRINHO, itens);
}

export function removerDoCarrinho(nome: string) {
  escrever(CHAVE_CARRINHO, ler<ItemCarrinho[]>(CHAVE_CARRINHO, []).filter((i) => i.nome !== nome));
}

export function esvaziarCarrinho() {
  escrever(CHAVE_CARRINHO, []);
}

export function alternarFavorito(nome: string) {
  const atuais = ler<string[]>(CHAVE_FAVORITOS, []);
  escrever(CHAVE_FAVORITOS,
           atuais.includes(nome) ? atuais.filter((n: string) => n !== nome)
                                 : [...atuais, nome]);
}

function useArmazenado<T>(chave: string, padrao: T): [T, boolean] {
  const [valor, setValor] = useState(padrao);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const sincronizar = () => setValor(ler(chave, padrao));
    sincronizar();
    setPronto(true);
    window.addEventListener('shopdemo:mudou', sincronizar);
    window.addEventListener('storage', sincronizar);
    return () => {
      window.removeEventListener('shopdemo:mudou', sincronizar);
      window.removeEventListener('storage', sincronizar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return [valor, pronto];
}

export function useSessao() {
  const [sessao, pronto] = useArmazenado<Sessao | null>(CHAVE_SESSAO, null);
  return { sessao, pronto };
}

export function useCarrinho() {
  const [itens, pronto] = useArmazenado<ItemCarrinho[]>(CHAVE_CARRINHO, []);
  const unidades = itens.reduce((t, i) => t + i.qtd, 0);
  const subtotal = itens.reduce((t, i) => t + i.preco * i.qtd, 0);
  return { itens, unidades, subtotal, pronto };
}

export function useFavoritos() {
  const [favoritos] = useArmazenado<string[]>(CHAVE_FAVORITOS, []);
  return favoritos;
}

export const real = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
