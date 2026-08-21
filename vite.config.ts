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
  },
});
