/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.storybook', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        'e2e/',
        '**/*.d.ts',
        '**/*.stories.tsx',
        'src/integrations/supabase/types.ts',
      ],
      thresholds: {
        // Metas de cobertura por wave (plano de ampliação progressiva)
        // Wave 1 (atual): 30/25/30/30 — fundação + utils críticos
        // Wave 2: 45/40/45/45 — hooks de domínio
        // Wave 3: 50/45/50/50 — RBAC/Auth
        // Wave 4: 58/52/58/58 — edge functions
        // Wave 5: 65/60/65/65 — E2E autenticado
        statements: 30,
        branches: 25,
        functions: 30,
        lines: 30,
      },
    },
    reporters: ['default'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
