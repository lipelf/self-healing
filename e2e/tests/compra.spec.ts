import { test, expect } from 'selfheal-playwright';

test.describe('Fluxo de compra', () => {
  test('busca, filtra e adiciona produtos ao carrinho', async ({ page }) => {
    await page.goto('/catalogo');
    await page.fill('#campo-busca', 'teclado');
    await page.selectOption('#filtro-categoria', 'perifericos');
    await page.selectOption('#ordenar-por', 'preco');
    await page.click('#add-produto-1');
    await page.click('#add-produto-2');
    await expect(page.locator('#btn-ver-mais')).toBeVisible();
  });

  test('ajusta quantidades e aplica cupom', async ({ page }) => {
    await page.goto('/carrinho');
    await page.click('#aumentar-item-1');
    await page.click('#diminuir-item-1');
    await page.fill('#campo-cupom', 'UNESC10');
    await page.click('#btn-aplicar-cupom');
    await expect(page.locator('#btn-finalizar')).toBeVisible();
  });

  test('preenche os dados de entrega e confirma', async ({ page }) => {
    await page.goto('/checkout');
    await page.fill('#checkout-nome', 'Luiz Fellipe');
    await page.fill('#checkout-cpf', '000.000.000-00');
    await page.fill('#checkout-cep', '88800-000');
    await page.fill('#checkout-endereco', 'Rua Principal, 100');
    await page.fill('#checkout-cidade', 'Criciuma');
    await page.selectOption('#checkout-pagamento', 'pix');
    await page.click('#btn-confirmar');
    await expect(page.locator('#checkout-nome')).toHaveValue('Luiz Fellipe');
  });
});
