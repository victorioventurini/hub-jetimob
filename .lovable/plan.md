## Contexto

Hoje, no cadastro/edição de KPIs:
- `scope=org` exige **Área Responsável** (quando ativo) e o Time Responsável é opcional.
- `scope=area` não exige **Time Responsável** (apenas recomendação).
- `scope=team` já tem `team_id` obrigatório (não muda nada).

A nova regra: **todo KPI de Área ou Global deve ter Time Responsável obrigatório**, independente do `lifecycle_status`.

## Mudanças

### 1. Modal de Cadastro / Edição

Tornar `responsible_team_id` **obrigatório** quando `scope ∈ {area, org}`.

**Arquivos:**
- `src/modules/kpis/components/edit-kpi/editKpiSchema.ts` — adicionar regra no `superRefine`:
  - se `scope === 'area' || scope === 'org'` e `!responsible_team_id` → erro em `responsible_team_id` ("Time Responsável é obrigatório para KPIs de Área e Globais").
- `src/modules/kpis/components/CreateKpiDialog.tsx` — mesma regra no `superRefine` do schema interno.
- UI:
  - `EditKpiScopeSection.tsx`: marcar o label "Time Responsável" com asterisco vermelho quando `scope ∈ {area, org}`; trocar `includeNone` para `false` nesses casos.
  - `CreateKpiDialog.tsx` (blocos `org` e `area`): mesma marcação visual e remover `includeNone` quando aplicável.
- Para `scope=area`, hoje a Área é a própria do KPI. Mantemos sem o sub-bloco de "Área Responsável" (não faz sentido), apenas o Time Responsável passa a ser obrigatório.
- Para `scope=org`, a Área Responsável continua obrigatória (regra existente) e o Time Responsável passa a ser obrigatório também.

### 2. Listagem de KPIs Sem Time Responsável

Adicionar um **filtro opcional + banner de governança** no dashboard `/kpis` reaproveitando o padrão já existente do banner de "pending review" (`KpiMigrationBanner` / filtro `needs_review`).

**Arquivos:**
- `src/modules/kpis/pages/KpiDashboardPage.tsx`:
  - Novo `useUrlState` `missing_responsible` (`"0" | "1"`).
  - `pendingResponsibleCount` = KPIs com `scope ∈ {area, org}` e `responsible_team_id == null` (sobre `allKpis`).
  - Banner inline (mesmo estilo do `needs_review`) visível para `canManageKpis` quando `pendingResponsibleCount > 0` e filtro não ativo: "X indicadores de Área/Globais sem Time Responsável" + botão "Revisar".
  - Ao filtrar, aplicar no `filteredKpis`. Quando ativo, mostra a faixa "Mostrando apenas..." com botão "Limpar filtro" (mesmo padrão).

Não precisa de migration: regra é só de UX/validação no formulário; dados existentes ficam expostos pelo filtro.

## Fora do escopo
- Backfill ou trigger SQL forçando `responsible_team_id NOT NULL` (pode ser uma fase 2 após users limparem os pendentes via novo filtro).
- Mudanças em RLS / permissões.