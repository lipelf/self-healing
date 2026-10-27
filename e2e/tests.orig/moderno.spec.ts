import { test, expect } from 'selfheal-playwright';
import { LoginPage, SELETOR_EMAIL } from '../pages/LoginPage';

test.describe('Estilo moderno', () => {
  test('page object e localizador semantico', async ({ page }) => {
    const login = new LoginPage(page);
    await login.abrir();
    await login.preencherEmail('luiz@unesc.net');
    await login.botaoEntrar().click();
    await expect(page.locator(SELETOR_EMAIL)).toHaveValue('luiz@unesc.net');
  });
});
