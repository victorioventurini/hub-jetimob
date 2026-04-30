# Plano: Limpeza Consolidada de `@deprecated`

## Inventário (63 ocorrências)

Agrupei por **wave/origem** e **maturidade** (tempo desde marcação + risco de remoção):

### Grupo A — Snapshots Onda 4 Fase 1 (16 campos) — EM OBSERVAÇÃO
- **Localização**: `src/modules/okrs/types/wizard/{shared,mbr,qbr,collaborator,managers-clevel,weekly}.ts`
- **Status**: T0 = 2026-04-30. Janela de 90 dias até 2026-07-30.
- **Ação**: **NÃO TOCAR**. Já governado pela memória `wizard-snapshot-denormalized-fields-deprecation`.

### Grupo B — KPIs v2.82.0 (`category` → `area_id`) — MADURO (>3 meses)
- **Localização**: `src/modules/kpis/types.ts`, `useKpiData.ts`, `useKpiMutations.ts`, `KpiDashboardFilters.tsx`
- **Campos**: `category`, `KpiCategory`, props `category`/`categoryFilter`
- **Risco**: Verificar se UI ainda usa `category` em filtros legados.
- **Ação proposta**: Auditar consumidores → remover se órfão.

### Grupo C — KPIs v3.0.0 (`frequency` → `consolidation_frequency` + `update_frequency`) — RECENTE
- **Localização**: `src/modules/kpis/types.ts`, `useKpiData.ts`, `useKpiMutations.ts`, `editKpiSchema.ts`
- **Status**: Comentário diz "espelho enquanto coluna for NOT NULL no DB" → **bloqueado por schema DB**.
- **Ação**: **NÃO TOCAR**. Pré-requisito = migration tornando `frequency` nullable + drop.

### Grupo D — Permissions V1 → V2 (Wave 6/7) — DB-LEVEL, BLOQUEADO
- **Localização**: `supabase/migrations/20260108165603_*.sql`
- **Tabelas**: `permission_groups`, `permission_group_permissions`, `bu_permission_group_configs`, `bu_user_permission_groups`
- **Status**: READ-ONLY desde Wave 7, drop em Wave 8/9 (planejado).
- **Ação**: **NÃO TOCAR**. Aguardar Wave 8/9.

### Grupo E — Aliases triviais com substituto pronto — REMOVÍVEIS AGORA
1. `src/components/ui/delete-confirm-dialog.tsx` — substituto: `<ConfirmDialog variant="destructive" />`.
2. `src/components/links/UserLink.tsx` — prop `userId` (use `profileId`).
3. `src/modules/okrs/types/wizard/weekly.ts` linhas 18, 20 — type aliases (`RitualBlock`, `RitualThemeActionType`) já canonicalizados em `vocabulary.ts`.
4. `src/modules/okrs/hooks/useRitualHistory.ts` — re-export de `RITUAL_LABELS` (substituto: `../constants/ritualLabels`).
5. `src/lib/queryKeys.ts` linha 103 — barrel desencorajado; verificar consumidores.
6. `src/lib/analytics/gtag.ts` — `initGTM()` substitui; checar callers.
7. `src/modules/okrs/components/wizards/team-okr-creation/TeamOkrKrDetailStep.tsx` — prop legada com substituto óbvio.
8. `src/modules/projects/components/MilestoneList.tsx` — prop signature placeholder (manter, doc-only).

### Grupo F — Shapes legados de relatórios (Analysis) — RISCO DE DADOS HISTÓRICOS
- **Localização**: `src/modules/analysis/types/index.ts` (5 campos: `title`, `rationale`, `owner_hint`, `due_hint`, `impact`)
- **Risco**: Relatórios persistidos podem ter shape antigo no JSONB.
- **Ação**: **Auditar produção** antes de remover (mesmo padrão Wave 4).

### Grupo G — Outros (isolados, baixo impacto)
- `supabase/functions/qbr-pre-summary/index.ts` linha 57 — campo zombie `[]`. Remover quando consumidor desaparecer.
- `supabase/migrations/20260108145538_*.sql` linha 34 — `profiles.job_title` (Wave 3 já passou; checar se coluna ainda existe).
- `supabase/migrations/20260109041148_*.sql` — função `send_test_notification` v1 (utilitário; baixíssimo uso).
- `src/lib/queryKeys/okrs.ts` linha 491 — alias de cache key (`sources` é o canônico).
- `src/modules/tickets/hooks/useTicketCategories.ts` — hook embutiu subcategorias.

## Escopo desta execução (Onda 5 — Limpeza E + auditoria F + G parcial)

**FAZER AGORA** (baixo risco, substituto pronto):

1. **Grupo E itens 1-7**: Auditar consumidores e remover quando órfãos.
   - Para cada item: `rg` consumidores → se zero, remover. Se houver, migrar e remover.
   - Item 8 (MilestoneList prop): manter — é assinatura defensiva.

2. **Grupo G — sub-itens auditáveis**:
   - `profiles.job_title`: query DB → se `0 NOT NULL` registros usam, propor migration de drop (em fase separada).
   - `useTicketCategories` hook legado: rg consumidores → remover se órfão.
   - `qbr-pre-summary` linha 57: confirmar nenhum reader usa, remover.
   - `queryKeys/okrs.ts` linha 491 alias: rg consumidores.

**NÃO FAZER agora**:
- Grupos A, C, D (bloqueados por janela/schema).
- Grupo B (próxima onda dedicada — risco médio, requer regressão visual KPIs).
- Grupo F (próxima onda — auditoria de dados Analysis).

## Saída esperada

- 5–8 arquivos editados (deleções + migração de imports).
- Atualização de `mem://standards/wizard-snapshot-denormalized-fields-deprecation` ou nova memória `mem://standards/deprecated-cleanup-log` registrando o que foi removido e o que ficou pendente.
- Próximas ondas (B, F) ficam documentadas com pré-requisitos.

## Detalhes técnicos

- Auditoria de consumidores via `rg -n "<symbol>" src/ supabase/`.
- Build automático do harness valida quebras de import.
- Sem mudanças de schema neste passo.
