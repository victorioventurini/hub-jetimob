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
      reporter: ['text', 'text-summary', 'json', 'json-summary', 'html', 'lcov'],
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
        // Metas de cobertura por wave (plano de ampliação progressiva).
        // Os números são definidos com pequena folga abaixo do real para evitar
        // falsos negativos de flutuação V8, mas SEMPRE bloqueiam regressões.
        //
        // Wave 1 (atual): baseline ~25% — fundação + utils críticos
        // Wave 2: 35/30/35/35 — hooks de domínio (tickets/assets/kpis/projects)
        // Wave 3: 45/40/45/45 — RBAC/Auth + guards
        // Wave 4: 55/50/55/55 — edge functions
        // Wave 5: 65/60/65/65 — E2E autenticado
        statements: 24,
        branches: 22,
        functions: 24,
        lines: 25,
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
