# Módulo de Análise Estratégica — Especificação Canônica

**Versão:** 1.0.0  
**Última atualização:** 2026-04-18  
**Status:** Produção

---

## 1. Visão Geral

O módulo **Análise Estratégica** (`src/modules/analysis`) permite que líderes solicitem
relatórios analíticos gerados por IA a partir de dados operacionais do Hub (KPIs, OKRs,
projetos, iniciativas, check-ins, wizards). O fluxo cobre composição, geração assíncrona,
visualização rica, comentários, feedback e compartilhamento.

---

## 2. Tabelas (DATA_MODEL_REGISTRY)

| Tabela | Finalidade |
|--------|------------|
| `analysis_reports` | Relatório gerado (premise, modules, scope, period, result, status) |
| `analysis_templates` | Templates de premissa (`scope='global'` ou `scope='bu'`) |
| `analysis_comments` | Discussão por relatório |
| `analysis_feedback` | Avaliação do usuário (rating + texto opcional) |
| `analysis_share_log` | Log imutável de compartilhamentos |
| `analysis_schedules` | Agendamentos automáticos (futuro) |

Todas as tabelas são **BU-scoped** com RLS por permission key e **soft-delete**
(`deleted_at IS NULL` obrigatório nos selects).

---

## 3. Permissões (PERMISSIONS_AND_RBAC_MODEL)

| Permission Key | Quem | Ação |
|----------------|------|------|
| `analysis.report.read:bu` | Membros da BU | Visualizar relatórios |
| `analysis.report.create:bu` | Líderes+ | Solicitar nova análise |
| `analysis.report.delete:bu` | Admin BU | Soft-delete de relatórios |
| `analysis.template.manage:bu` | Admin BU | CRUD de templates `scope='bu'` |
| `analysis.template.manage:global` | Super admin | CRUD de templates `scope='global'` |
| `analysis.share:bu` | Líderes+ | Compartilhar via edge function |

---

## 4. Componentes do Resultado (`components/result/`)

Todos memoizados (regra inquebrável #7) e consumindo apenas tipos do
`types/index.ts` — sem `select('*')` em nenhum lugar.

| Componente | Propósito |
|------------|-----------|
| `ResultHeader` | Título, premissa, status, ações Compartilhar/Excluir |
| `SourcesChips` | Chips de `report.sources` (módulo + label opcional) |
| `KeyMetricsGrid` | Grid responsivo de `AnalysisKeyMetric` |
| `InsightBlock` | Bloco visual por insight (`info` / `warning` / `positive`) |
| `AnalysisBody` | Corpo descritivo com `whitespace-pre-wrap` |
| `SuggestedActions` | Lista de ações sugeridas (placeholder Registrar) |
| `AnalysisCommentList` | Discussão integrada via `useAnalysisComments` |

---

## 5. Hooks (`hooks/`)

| Hook | Responsabilidade |
|------|-----------------|
| `useAnalysisReport(id)` | Fetch single report (BU-scoped) |
| `useAnalysisHistory()` | Lista paginada com filtros |
| `useAnalysisTemplates()` | Templates `global` + `bu` ordenados |
| `useAnalysisTemplateMutations` | `useCreateTemplate` / `useUpdateTemplate` / `useDeleteTemplate` (somente `scope='bu'`) |
| `useGenerateAnalysis` | Invoca edge function `analysis-generate` |
| `useAnalysisComments(id)` | Lista + add (realtime opcional) |
| `useAnalysisFeedback(id)` | Submete rating + texto |
| `useAnalysisShare` | Invoca edge function `analysis-share` |

**Conformidade obrigatória:**
- Todas as mutações usam `realProfileId` de `useIdentity()` (evita RLS 42501)
- Cliente Supabase é sempre `useBuScopedSupabase()`
- Query keys via `analysisKeys` (`src/lib/queryKeys/analysis.ts`)
- Invalidações usam helpers `*Prefix()`

---

## 6. CRUD de Templates da BU

A página `/analysis/templates` (`AnalysisTemplatesPage.tsx`) lista templates
`global` (read-only) e `bu` (CRUD) lado a lado.

**Regras:**
- Botão "Novo template" gated por `useHasPermission('analysis.template.manage:bu')`
- Menu Editar/Excluir aparece somente em cards `scope='bu'`
- Badges visuais distinguem **Global** vs **BU**
- Exclusão é soft-delete (`deleted_at = now()`)
- `TemplateFormDialog` valida: `name` não-vazio, `premise` ≥ 20 caracteres

---

## 7. Cobertura de Testes

| Arquivo | Cobertura |
|---------|-----------|
| `src/lib/queryKeys/analysis.test.ts` | Query keys + invariantes de prefixo (cache invalidation) |
| `src/modules/analysis/types/index.test.ts` | Contratos canônicos dos tipos |
| `components/result/KeyMetricsGrid.test.tsx` | Render condicional + reference/delta |
| `components/result/InsightBlock.test.tsx` | 3 tipos visuais + fallback resiliente |
| `components/result/SourcesChips.test.tsx` | Empty state + chips |
| `components/result/SuggestedActions.test.tsx` | Empty state + meta-dados + botão desabilitado |
| `components/result/AnalysisBody.test.tsx` | Empty/whitespace + render com newlines |

Total: **31 testes** cobrindo lógica determinística e renderização. Hooks
de mutação (Supabase) ficam no domínio de testes E2E pois dependem de RLS real.

---

## 8. Edge Functions

| Função | Propósito | JWT |
|--------|-----------|-----|
| `analysis-generate` | Orquestra agentes IA, popula `result`/`sources`/`suggested_actions` | ✅ |
| `analysis-share` | Cria `analysis_share_log` + dispara notificação | ✅ |

Padrões: `_shared/client.ts`, validação de BU, correlation-id.

---

## 9. Anti-padrões proibidos

- ❌ `select('*')` em qualquer hook
- ❌ Hardcode de roles (sempre permission key)
- ❌ Mutações sem `realProfileId`
- ❌ Edição de templates `scope='global'` pelo frontend
- ❌ Render direto de strings da IA sem `toText()` (anti React #31)
