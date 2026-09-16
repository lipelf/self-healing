import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['selfheal-playwright/dist/reporter']],

  // Sobe a aplicacao de demonstracao automaticamente, reaproveitando o
  // servidor caso ele ja esteja rodando.
  webServer: {
    command: 'npm run dev',
    cwd: '../web',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },

  // Chromium com janela visivel: a recuperacao do seletor acontece na tela,
  // que e o que se quer mostrar na defesa. Em integracao continua, use
  // HEADLESS=1 para voltar ao modo sem interface.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: process.env.HEADLESS === '1',
    launchOptions: {
      // Desacelera as acoes para que a quebra e a correcao sejam visiveis a
      // olho nu. SELFHEAL_SLOWMO=0 executa na velocidade normal.
      slowMo: Number(process.env.SELFHEAL_SLOWMO ?? 150),
      // Usa o Chromium que o proprio Playwright instala. A variavel de
      // ambiente so e necessaria quando se quer apontar para outro binario.
      ...(process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {}),
    },
  },
});
