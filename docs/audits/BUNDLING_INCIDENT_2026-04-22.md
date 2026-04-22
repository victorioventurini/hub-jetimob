# 🚨 Incidente — Tela Branca em Produção (Bundling)

**Data:** 2026-04-22
**Severidade:** P0 (app indisponível em `hub.jetimob.com`)
**Categoria:** Build / Frontend / Deploy
**Status:** ✅ Resolvido
**Documento canônico relacionado:** `docs/canonical/BUNDLING_AND_VENDOR_CHUNKS_STANDARD.md` (v1.0.0)

---

## Resumo Executivo

Após o roll-out da estratégia de `manualChunks` customizada (introduzida em
W3.P3.2 para reduzir tamanho de bundle), o domínio publicado
`hub.jetimob.com` passou a renderizar tela branca em todas as rotas, embora
o preview Lovable funcionasse normalmente.

A causa raiz foi **quebra de ordem de inicialização entre chunks vendor**
(TDZ — Temporal Dead Zone), exposta apenas pela pipeline de minificação do
publicado.

---

## Linha do Tempo

| Hora (BRT) | Evento |
|------------|--------|
| T0 | Usuário relata: "Ao acessar hub.jetimob.com nada é exibido na página" |
| T+5min | Inspeção via `curl` confirma HTML servido corretamente; problema é client-side |
| T+10min | Browser tools revelam `ReferenceError: Cannot access 'A' before initialization` em `chart-vendor` |
| T+15min | 1ª tentativa: isolar `date-fns` em `date-vendor`, retirar `recharts` do manual chunking |
| T+25min | Republicado — novo erro: `TypeError: Cannot read properties of undefined (reading 'createContext')` em `query-vendor` |
| T+35min | Diagnóstico final: qualquer split manual entre `react-vendor` e consumidores de React quebra a ordem de avaliação no bundle minificado |
| T+40min | Remoção total de `manualChunks`; build delegado ao Rollup |
| T+50min | Republicado — app volta a funcionar em `hub.jetimob.com` |

---

## Causa Raiz

A configuração `build.rollupOptions.output.manualChunks` agrupava vendors
em chunks separados (`react-vendor`, `query-vendor`, `chart-vendor`,
`supabase-vendor`, etc.). Em produção:

1. O navegador carrega chunks via `<link rel="modulepreload">` em ordem
   ditada pelo HTML.
2. Após minificação, identificadores de top-level são renomeados (`React`
   → `A`) e referenciados via TDZ.
3. Se `query-vendor` (consumidor) é avaliado antes de `react-vendor`
   (provedor) ter completado export, o módulo executa contra `undefined`.

O preview Lovable usa pipeline ligeiramente diferente que tolerava a ordem,
mascarando o defeito até o publish.

---

## Correção Aplicada

`vite.config.ts`:

```diff
 build: {
   cssCodeSplit: true,
   chunkSizeWarningLimit: 1000,
-  rollupOptions: {
-    output: {
-      manualChunks: (id) => {
-        if (id.includes('react')) return 'react-vendor';
-        if (id.includes('@tanstack')) return 'query-vendor';
-        // ... mais agrupamentos
-      }
-    }
-  }
+  // Sem manualChunks — Rollup decide a estratégia de split.
+  // Ver docs/canonical/BUNDLING_AND_VENDOR_CHUNKS_STANDARD.md
 }
```

---

## Impacto

- **Usuários afetados:** 100% dos usuários no domínio `hub.jetimob.com`
- **Duração da indisponibilidade:** ~50 minutos
- **Dados afetados:** Nenhum (problema puramente client-side)
- **Backend / RLS:** Não impactado

---

## Lições Aprendidas

1. **Preview ≠ Publicado.** A pipeline de build/minificação do publish pode
   expor bugs invisíveis no preview. Toda mudança em `vite.config.ts` deve
   ser validada em produção, não apenas no preview.
2. **`manualChunks` é uma armadilha.** Mesmo com agrupamentos "lógicos", a
   ordem de avaliação não é garantida sem que Rollup veja o grafo completo.
3. **Otimização prematura de bundle.** O ganho de tamanho era marginal
   (<5%) frente ao risco de quebrar o app inteiro.

---

## Ações Preventivas

| Ação | Responsável | Prazo | Status |
|------|-------------|-------|--------|
| Criar padrão canônico proibindo `manualChunks` sem aprovação | Arquitetura | 2026-04-22 | ✅ `BUNDLING_AND_VENDOR_CHUNKS_STANDARD.md` v1.0.0 |
| Adicionar checklist de validação em produção pós-build | Arquitetura | 2026-04-22 | ✅ Seção 5 do padrão |
| Documentar no TCR a regra de bundling | Arquitetura | próxima release | ⏳ Em fila |

---

## Referências

- `vite.config.ts` (estado pós-correção)
- `docs/canonical/BUNDLING_AND_VENDOR_CHUNKS_STANDARD.md`
- Console produção: `TypeError: Cannot read properties of undefined (reading 'createContext')`

---

*Pós-mortem registrado em 2026-04-22.*
