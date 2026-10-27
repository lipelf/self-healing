// Page Object: estilo predominante em suites reais. O seletor nao mora no
// arquivo .spec.ts, e e isso que o item 4 passa a alcancar.
import { Page } from '@playwright/test';

export const SELETOR_EMAIL = '#login-email';

export class LoginPage {
  constructor(private page: Page) {}

  async abrir() { await this.page.goto('/login'); }

  async preencherEmail(valor: string) {
    await this.page.fill(SELETOR_EMAIL, valor);
  }

  // Localizador semantico: estilo recomendado pela documentacao atual do
  // Playwright, e que o item 1 passa a acompanhar.
  botaoEntrar() {
    return this.page.getByRole('button', { name: 'Entrar' });
  }
}
