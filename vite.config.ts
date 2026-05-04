import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    // W3.P3.2 — Bundle splitting automático.
    // Manual chunks customizado quebrava a ordem de inicialização dos vendors:
    // `query-vendor` (react-query + supabase) tentava acessar `React.createContext`
    // antes do `react-vendor` ter sido avaliado, gerando:
    //   "Cannot read properties of undefined (reading 'createContext')"
    // e tela em branco no domínio publicado. Delegar a estratégia de split ao
    // Rollup garante que cada chunk receba suas dependências na ordem correta.
  },
  // W1.F.1 — Strip de `console.*` e `debugger` no build de produção.
  // Mantém logs em dev (preview/Lovable) para diagnóstico; remove os 352+
  // `console.*` em `src/` no bundle final, reduzindo tamanho e ruído em prod.
  // `console.error` é preservado para Sentry-like fallbacks.
  esbuild: mode === "production"
    ? { drop: ["debugger"], pure: ["console.log", "console.info", "console.debug", "console.warn"] }
    : {},
}));
