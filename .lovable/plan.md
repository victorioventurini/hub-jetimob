# Plano: UserProfile — Link KPI dedicado + URL State nas tabs

## Contexto
Página `/users/:id` → card "Atuação em Jetimob".

**Problemas:**
1. KPIs na aba "KPIs" linkam para `/kpis?kpi=${id}` (legado, abre lista). Padrão atual = página dedicada `/kpis/:id`.
2. Tabs (`overview` / `projects` / `okrs` / `initiatives` / `kpis`) usam `useState` local — não persistem em refresh nem permitem deep-link.

## Pré-checklist (executado)
- ✅ `mem://features/projects/internal-linking-standard` — entidades internas devem navegar para página dedicada (`/kpis/:id`, não query param).
- ✅ `mem://features/kpis/kpis-master-standard` — página dedicada de KPI é o destino canônico.
- ✅ `src/shared/url/index.ts` — `useUrlTab` é o helper canônico para tabs (Wave 4B).
- ✅ Padrão já aplicado em `/teams`, `/tickets`, `/settings/*` (QA_URL_STATE_WAVE4 PASS).
- ✅ Confirmado que `KpiDetailPage` existe em `src/modules/kpis/pages/KpiDetailPage.tsx` (rota `/kpis/:id`).

## Mudanças (1 arquivo)

### `src/pages/UserProfile/index.tsx`

**1) Imports (linhas 1-2):**
- Remover `useState` do import de "react" (manter `useMemo`).
- Adicionar `import { useUrlTab } from "@/shared/url";`.

**2) Tab state (linha 127):**
- Trocar `useState<EngagementTab>("overview")` por `useUrlTab<EngagementTab>("overview")`.
- Resultado: URL passa a refletir `?tab=projects|okrs|initiatives|kpis`.

**3) Links de KPI (linhas 600-604 e 623-628):**
- Trocar `to={\`/kpis?kpi=${kpi.id}\`}` por `to={\`/kpis/${kpi.id}\`}` em ambas as listas (KPIs próprios + KPIs onde contribui).

## Não-mudanças
- Botões de "Visão geral" que disparam `setActiveTab(...)` continuam funcionando (a API do `useUrlTab` mantém assinatura `[value, setValue]`).
- Nenhuma alteração em hooks, queries ou backend.
- Nenhuma migration.

## QA manual
- [ ] Abrir `/users/:id` → tab default = "overview", URL sem `?tab=`.
- [ ] Clicar em "KPIs" → URL passa a `/users/:id?tab=kpis`.
- [ ] F5 → mantém tab "kpis".
- [ ] Abrir nova aba colando `/users/:id?tab=okrs` → abre direto na tab OKRs.
- [ ] Clicar em um KPI da lista → abre `/kpis/:kpiId` (página dedicada), não a lista.
- [ ] Clicar em KPI onde contribui (badge "Contribuidor") → mesmo destino dedicado.
- [ ] Back/Forward do navegador navega entre tabs.

## Risco
Baixo. Mudanças isoladas em 1 arquivo, padrão já validado em outras páginas.
