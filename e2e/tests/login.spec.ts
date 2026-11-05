import { test, expect } from 'selfheal-playwright';

test.describe('Autenticacao', () => {
  test('recusa credencial invalida', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'errado@unesc.net');
    await page.fill('#login-senha', 'senha-errada');
    await page.click('#btn-entrar');
    await expect(page.locator('#erro-login')).toContainText('invalidos');
    await expect(page).toHaveURL(/\/login/);
  });

  test('entra na conta e chega ao catalogo', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'luiz@unesc.net');
    await page.click('#btn-mostrar-senha');
    await page.fill('#login-senha', 'unesc2026');
    await page.click('#btn-entrar');
    await expect(page).toHaveURL(/\/catalogo/);
    await expect(page.locator('#menu-usuario')).toBeVisible();
  });

  test('exibe os atalhos de recuperacao e cadastro', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#link-esqueci')).toBeVisible();
    await expect(page.locator('#link-criar-conta')).toBeVisible();
  });
});
