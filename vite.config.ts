import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // caminhos relativos: necessário pro Electron carregar o build via file://
  base: './',
  // o mapa fixo vive aqui e é copiado sem transformação para o jogo empacotado
  publicDir: 'assets',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome130',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['testes/**/*.test.ts'],
    /**
     * ⚠️ O padrão do vitest são 5 s, e ele não serve a este projeto: os testes que valem mais
     * aqui são SIMULAÇÕES de cem turnos com o mapa inteiro, e uma delas leva 4 s numa máquina
     * folgada e 11 s numa apertada — os arquivos rodam em paralelo e disputam os mesmos núcleos.
     * Cinco segundos transformavam um teste de comportamento num teste de hardware, que falhava
     * no notebook e passava no desktop com o mesmo código.
     */
    testTimeout: 30000,
  },
});
