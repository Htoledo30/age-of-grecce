import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './testes/tela',
  timeout: 30_000,
  /**
   * Dois trabalhadores, não um por núcleo.
   *
   * Cada teste sobe uma cena WebGL de 1920x1080 renderizada por SOFTWARE (o navegador
   * roda oculto). Com quatro em paralelo nesta máquina, testes que levam 6 s sozinhos
   * passam de 25 s e estouram o limite — e a suíte reprova por sorteio, o que é pior que
   * uma suíte lenta: ninguém confia numa reprovação que às vezes some.
   */
  workers: 2,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
