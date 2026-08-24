import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './testes/tela',
  /**
   * Um minuto por teste, e não meio.
   *
   * Pelo mesmo motivo do número de trabalhadores logo abaixo: cada teste sobe uma cena
   * WebGL de 1920x1080 por SOFTWARE. Sozinho um leva 6 s; com dois em paralelo numa
   * máquina ocupada passa de 20 s, e a suíte começou a reprovar por sorteio quando cresceu.
   * **Reprovação por sorteio é pior que suíte lenta**: ninguém confia numa falha que às
   * vezes some, e o hábito vira "roda de novo" em vez de "vai ver o que quebrou".
   */
  timeout: 60_000,
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
    // Porta exclusiva dos testes: não reutiliza o Vite aberto pelo Electron ou pelo
    // desenvolvedor, que pode ser fechado no meio da suíte e derrubar todos os casos.
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
