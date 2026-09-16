import { test, expect } from 'selfheal-playwright';

// Os seletores abaixo sao os alvos do experimento: quando a interface muda,
// e aqui que a quebra aparece e e aqui que o selfheal aplica a correcao.
test.describe('Autenticacao', () => {
  test('preenche credenciais e envia o formulario', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'luiz@unesc.net');
    await page.fill('#login-senha', 'senha-secreta');
    await page.click('#btn-mostrar-senha');
    await page.click('#btn-entrar');
    await expect(page.locator('#login-email')).toHaveValue('luiz@unesc.net');
  });

  test('exibe os atalhos de recuperacao e cadastro', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#link-esqueci')).toBeVisible();
    await expect(page.locator('#link-criar-conta')).toBeVisible();
  });
});
