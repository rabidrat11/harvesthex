import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4177',
    viewport: { width: 1280, height: 720 },
    launchOptions: { args: ['--use-gl=angle', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4177 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
