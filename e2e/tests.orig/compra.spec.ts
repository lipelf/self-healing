import { test, expect } from 'selfheal-playwright';

async function entrar(page: any) {
  await page.goto('/login');
  await page.fill('#login-email', 'luiz@unesc.net');
  await page.fill('#login-senha', 'unesc2026');
  await page.click('#btn-entrar');
  await expect(page).toHaveURL(/\/catalogo/);
}

test.describe('Fluxo de compra', () => {
  test('exige sessao para abrir o carrinho', async ({ page }) => {
    await page.goto('/carrinho');
    await expect(page).toHaveURL(/\/login/);
  });

  test('busca e filtros reduzem a listagem', async ({ page }) => {
    await entrar(page);
    const total = await page.locator('#total-resultados').textContent();

    await page.fill('#campo-busca', 'teclado');
    await expect(page.locator('#total-resultados')).toHaveText('1');

    await page.click('#limpar-filtros');
    await expect(page.locator('#total-resultados')).toHaveText(total || '');

    await page.selectOption('#filtro-categoria', 'monitores');
    await expect(page.locator('#total-resultados')).not.toHaveText(total || '');
  });

  test('compra de ponta a ponta: login, catalogo, carrinho e pedido',
       async ({ page }) => {
    await entrar(page);

    await page.selectOption('#ordenar-por', 'preco');
    await page.click('#add-produto-1');
    await page.click('#add-produto-2');
    await expect(page.locator('#contagem-topo')).toHaveText('2');

    await page.click('#abrir-minicarrinho');
    await expect(page).toHaveURL(/\/carrinho/);
    await expect(page.locator('#contador-unidades')).toHaveText('2');

    await page.click('#aumentar-item-1');
    await expect(page.locator('#qtd-item-1')).toHaveText('2');

    await page.fill('#campo-cupom', 'UNESC10');
    await page.click('#btn-aplicar-cupom');
    await expect(page.locator('#aviso-cupom')).toContainText('10% de desconto');

    await page.click('#btn-finalizar');
    await expect(page).toHaveURL(/\/checkout/);

    await page.fill('#checkout-nome', 'Luiz Fellipe');
    await page.fill('#checkout-cpf', '000.000.000-00');
    await page.fill('#checkout-cep', '88800-000');
    await page.fill('#checkout-endereco', 'Rua Principal, 100');
    await page.fill('#checkout-cidade', 'Criciuma');
    await page.selectOption('#checkout-pagamento', 'pix');
    await page.click('#btn-confirmar');

    await expect(page).toHaveURL(/\/pedido/);
    await expect(page.locator('#pedido-numero')).toContainText('PED-');
    await expect(page.locator('#pedido-nome')).toHaveText('Luiz Fellipe');
    await expect(page.locator('#contagem-topo')).toHaveText('0');
  });

  test('favorita um produto e remove item do carrinho', async ({ page }) => {
    await entrar(page);
    await page.click('#favoritar-1');
    await expect(page.locator('#contador-favoritos')).toHaveText('1');

    await page.click('#add-produto-1');
    await page.click('#abrir-minicarrinho');
    await expect(page.locator('#contador-unidades')).toHaveText('1');
    await page.click('#remover-item-1');
    await expect(page.locator('#carrinho-vazio')).toBeVisible();
  });

  test('recusa finalizar sem preencher a entrega', async ({ page }) => {
    await entrar(page);
    await page.click('#add-produto-1');
    await page.click('#abrir-minicarrinho');
    await page.click('#btn-finalizar');
    await page.click('#btn-confirmar');
    await expect(page.locator('#erro-checkout')).toContainText('Preencha');
    await expect(page).toHaveURL(/\/checkout/);
  });
});
