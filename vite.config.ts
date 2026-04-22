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
    rollupOptions: {
      output: {
        // W3.P3.1 — Bundle splitting manual.
        // Mantém vendors estáveis em chunks separados para melhorar cache
        // entre deploys e reduzir o tamanho do entrypoint.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // React core + router
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/scheduler/")
          ) {
            return "react-vendor";
          }

          // Radix UI (muitos pacotes pequenos)
          if (id.includes("@radix-ui/")) {
            return "radix-vendor";
          }

          // Data layer
          if (
            id.includes("@tanstack/react-query") ||
            id.includes("@supabase/")
          ) {
            return "query-vendor";
          }

          // Datas isoladas — date-fns NÃO pode compartilhar chunk com recharts.
          // Agrupar recharts + suas deps (d3-*, victory-vendor, internmap, etc.)
          // num único chunk gerava TDZ ("Cannot access 'A' before initialization")
          // sob minify quando date-fns era forçado para o mesmo chunk.
          if (id.includes("date-fns")) {
            return "date-vendor";
          }

          // Charts: deixar Rollup escolher os chunks de recharts e suas
          // dependências internas (d3-*, victory-vendor, internmap, react-smooth)
          // automaticamente — forçá-las num único chunk junto a outras libs
          // quebra a ordem de inicialização das classes minificadas.

          // Ícones (lucide é grande)
          if (id.includes("lucide-react")) {
            return "icons-vendor";
          }

          return undefined;
        },
      },
    },
  },
}));
