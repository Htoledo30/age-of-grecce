import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './testes/tela',
  timeout: 30_000,
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
