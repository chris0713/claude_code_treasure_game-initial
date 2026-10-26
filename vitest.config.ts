import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import viteConfig from './vite.config';

// Reuses the app's aliases but not its plugins: the sqlite-api plugin would open data/treasure.db.
export default defineConfig({
  plugins: [react()],
  resolve: viteConfig.resolve,
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Node 25+ has its own global localStorage that hides jsdom's; turn it off in test workers.
    poolOptions: { forks: { execArgv: ['--no-experimental-webstorage'] } },
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'server/**/*.mjs'],
      reporter: ['text', 'html'],
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
});
