# 📦 Bundling & Vendor Chunks — Padrão Canônico

**Versão:** v1.0.0
**Última atualização:** 2026-04-22
**Status:** Normativo
**Referência cruzada:** `vite.config.ts`, TCR §arquitetura

---

## Contexto

O Hub é uma SPA Vite + React 18 servida em produção via `hub.jetimob.com`. A
estratégia de chunking do bundler tem impacto direto na **ordem de inicialização**
dos módulos e, portanto, na disponibilidade do app no carregamento inicial.

Tentativas anteriores de otimizar tamanho de chunks através de `manualChunks`
customizados (W3.P3.2) provocaram **incidentes de tela em branco em produção**
por quebra de TDZ (Temporal Dead Zone) entre vendors interdependentes.

---

## 1. Regra Inquebrável

> **❌ Proibido** definir `build.rollupOptions.output.manualChunks` em
> `vite.config.ts` sem aprovação arquitetural explícita e teste em ambiente
> publicado (não apenas preview).

A estratégia padrão é **delegar 100% do split ao Rollup**, que resolve o grafo
de dependências e garante a ordem correta de avaliação.

---

## 2. Por que `manualChunks` quebra

Quando agrupamos manualmente vendors, criamos chunks que importam outros
chunks vendor. Se a ordem de avaliação do navegador entrega `query-vendor`
(que precisa de `React.createContext`) antes de `react-vendor` ter exportado
`React`, o módulo executa contra `undefined` e falha com:

```
TypeError: Cannot read properties of undefined (reading 'createContext')
```

Em modo dev essa ordem é tolerada por causa do ESM nativo + HMR. Em produção
(IIFE/ESM bundlado + minificação), o erro só aparece **após publicar**.

Casos reais já observados no Hub:
- `recharts` + `date-fns` agrupados → `ReferenceError: Cannot access 'A' before initialization`
- `react-query` + `supabase-js` separados de `react` → `createContext` undefined

---

## 3. Configuração Canônica

`vite.config.ts` deve manter apenas:

```ts
build: {
  cssCodeSplit: true,
  chunkSizeWarningLimit: 1000,
  // Sem manualChunks — Rollup decide.
}
```

Comentário no arquivo deve explicar o motivo, para evitar regressão futura.

---

## 4. Quando otimizar chunk size

Se o warning de `chunkSizeWarningLimit` aparecer e for necessário reduzir o
bundle, as ferramentas permitidas (em ordem de preferência) são:

1. **Lazy loading de rotas** com `React.lazy` + `Suspense` (já em uso).
2. **Dynamic import** de bibliotecas pesadas usadas em poucos pontos
   (ex.: `import('xlsx')` apenas dentro do handler de export).
3. **Tree-shaking** revisão: garantir imports nomeados, evitar barrels que
   importam tudo.
4. **Code-splitting por feature** via `import()` em componentes pesados.

`manualChunks` permanece **fora do conjunto de soluções permitidas**.

---

## 5. Procedimento de Validação Antes de Mexer no Build

Toda PR que altere `vite.config.ts` precisa de:

1. ✅ `npx vite build` local sem erros nem warnings novos.
2. ✅ `npx vite preview` testado manualmente (login + navegação em 3 módulos).
3. ✅ Deploy em staging/preview Lovable validado.
4. ✅ **Deploy publicado** validado em `hub.jetimob.com` — preview Lovable
   não reproduz a totalidade da pipeline de minificação do publicado.
5. ✅ Checagem do console em produção: nenhum `ReferenceError` ou
   `TypeError: Cannot read properties of undefined`.

---

## 6. Histórico de Incidentes

| Data | Mudança | Sintoma | Resolução |
|------|---------|---------|-----------|
| 2026-04-22 | `manualChunks` agrupando `query-vendor` + `react-vendor` | Tela branca em `hub.jetimob.com`; `createContext` undefined | Remoção total de `manualChunks` |
| 2026-04-22 | `manualChunks` agrupando `recharts` + `date-fns` em `chart-vendor` | TDZ em produção (`Cannot access 'A' before initialization`) | Isolar `date-fns`, depois remoção total |

Ambos os incidentes só foram visíveis **no domínio publicado**, não no preview.

---

## 7. Referências

- `vite.config.ts` (configuração ativa)
- TCR v3.28.0 — seção arquitetura
- `docs/canonical/EDGE_PERFORMANCE_STANDARD.md` (performance backend)
- Issue interna: tela branca pós-publicação Q2/2026

---

*Mantido pela equipe de arquitetura. Alterações requerem incremento de versão.*
