import { Page } from '@playwright/test';

export const SELETOR_EMAIL = '#login-email';

export class LoginPage {
  constructor(private page: Page) {}

  async abrir() { await this.page.goto('/login'); }

  async preencherEmail(valor: string) {
    await this.page.fill(SELETOR_EMAIL, valor);
  }

  botaoEntrar() {
    return this.page.getByRole('button', { name: 'Entrar' });
  }
}
