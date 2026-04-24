
# Plano — OKRs Compartilhadas: Bloco no Time Contribuidor + Fix de Edição

Resolve dois bugs reais reportados (edição perde `is_shared`; objetivo compartilhado não aparece no time contribuidor) reaproveitando 100% dos componentes existentes (`TeamOkrSections`, `ContributingOkrCard`, `useTeamContributedOkrs`, `SharedOkrBadge`). **Sem duplicação de componentes**, sem alterações de schema, sem mudanças em ritos (que já leem KRs por `team_id` da KR).

---

## Fase 1 — Correção dos bugs (núcleo)

### 1.1 Fix de hidratação na edição (`is_shared` perdido)
**Arquivo:** `src/modules/okrs/components/dashboard/ObjectiveListItem.tsx`

Hoje, ao abrir o `TeamObjectiveFormDialog` para editar, o objeto passado em `objective` omite `is_shared`, `responsibility_model` e `org_objective_id`. O form então hidrata com defaults (`isShared=false`), escondendo a seção de contribuidores e fazendo parecer que o compartilhamento foi perdido.

**Mudança:** incluir esses campos no objeto passado ao dialog (já vêm em `objective` da query `useTeamObjectives` / `okr_team_objectives`):
```ts
objective={{
  id: objective.id,
  title: objective.title,
  description: objective.description,
  team_id: objective.team_id,
  status: objective.status,
  is_shared: objective.is_shared,
  responsibility_model: objective.responsibility_model,
  org_objective_id: objective.org_objective_id,
}}
```

**Validação:** verificar via `useTeamObjectives` que esses campos já estão sendo selecionados (via `AGGREGATE_FIELDS.teamObjectiveWithKrs`). Se algum estiver faltando no select, adicionar em `aggregateUtils.ts`.

### 1.2 Renderizar bloco "OKRs Compartilhadas" no dashboard de time
**Arquivo:** `src/modules/okrs/pages/OkrDashboardPage.tsx` (view `team`)

Hoje renderiza apenas `useTeamObjectives` (objetivos onde `team_id = currentTeamId`). O componente `TeamOkrSections` já existe e implementa exatamente a UI proposta (bloco principal + bloco "Compartilhadas" condicional), mas está orfão.

**Mudança:**
- Adicionar `useTeamContributedOkrs(teamId)` ao lado da query existente.
- Substituir o map atual de `ObjectiveListItem` por `<TeamOkrSections primaryObjectives={...} contributedObjectives={...} teamId={teamId} teamName={teamName} canEdit={canEdit} />`.
- Bloco "Compartilhadas" só aparece se `contributedObjectives.length > 0` (lógica já no componente).
- Card secundário renderizado por `ContributingOkrCard` (read-only, com `SharedOkrBadge` + nome do time owner).

**Reaproveitamento:** zero novo componente. Apenas conectar peças existentes.

---

## Fase 2 — Enriquecimento do card compartilhado

### 2.1 Filtrar KRs do time contribuidor no `ContributingOkrCard`
**Arquivo:** `src/modules/okrs/components/team-view/ContributingOkrCard.tsx`

Mostrar explicitamente "Contribuição do {Time B}" listando apenas as KRs onde `kr.team_id === currentTeamId` (já recebido como prop). Isso materializa o conceito metodológico: "objetivo do Time A, KRs próprias do Time B contribuindo".

- Reusar `KrCardCompact` ou o pattern já usado em `ObjectiveListItem` para listagem de KRs (não criar componente novo).
- Se `team_id` não estiver em `okr_team_key_results` no select atual, adicionar.

### 2.2 Badge de estado de contribuição
Derivar 3 estados a partir dos dados já disponíveis no objeto contribuído:

| Estado | Condição | Badge |
|---|---|---|
| Estratégica | tem ≥1 KR com `team_id = currentTeamId` | `success` "Contribuição estratégica" |
| Operacional | sem KR, mas tem projeto/iniciativa do time vinculada | `warning` "Contribuição operacional" |
| Apenas visível | nenhum vínculo concreto | `outline` "Apenas visível" |

Renderizar via `Badge` existente (`@/components/ui/badge`). Sem componente novo.

### 2.3 Ações no card compartilhado (read-only)
- Manter botão "Ver detalhes" → navega para a página/drawer já existente do objetivo (mesma rota usada no time owner). Sem edição, sem cancel, sem delete.
- `canEdit` permanece `false` no `ObjectiveListItem` quando renderizado dentro do bloco compartilhado (já é a default em `TeamOkrSections`).

---

## Ritos e Check-in (sem mudanças)

Confirmado por leitura de código:
- **Ritos coletivos** (Weekly, MBR Pre, QBR Pre, QBR Meeting, Team Check-in) já agregam KRs por `kr.team_id` — KRs do time contribuidor sob objetivo compartilhado **já aparecem automaticamente**.
- **Collaborator Check-in** filtra por `kr.owner_id` — KR de owner do Time B já aparece no check-in individual dele, com contexto do objetivo pai (que pode ser do Time A).
- `cross-team-scorecard-visibility-logic` já cobre esse caso.

**Nenhuma alteração em ritos é necessária.**

---

## Documentação

Atualizar/criar memórias:
- `mem://features/okrs/shared-okr-edit-hydration-standard.md` → mandar que callers de `TeamObjectiveFormDialog` hidratem `is_shared`, `responsibility_model`, `org_objective_id`.
- `mem://features/okrs/shared-okr-contributor-view-standard.md` (novo) → SSOT do bloco "OKRs Compartilhadas" no dashboard de time + 3 estados de contribuição + read-only.
- Atualizar `mem://index.md` com referência ao novo SSOT.

---

## Pré-checklist (executado)

- [x] Padrão metodológico: `mem://features/okrs/okr-methodology-standards` (objetivo único + KRs cross-team)
- [x] RLS: `mem://auth/okr-ownership-enforcement-rls` (KR.team_id independe do objetivo)
- [x] Cross-team: `mem://features/rituals/cross-team-scorecard-visibility-logic`
- [x] Agrupamento visual: `mem://features/okrs/wizard-strategic-grouping-standard`
- [x] Componentes existentes auditados: `TeamOkrSections`, `ContributingOkrCard`, `SharedOkrBadge`, `useTeamContributedOkrs`, `v_team_contributed_okrs`
- [x] Sem `select('*')`, sem novo componente duplicado, sem alteração de schema

---

## Critérios de sucesso

1. Editar OKR compartilhado mantém `is_shared=true` e contribuidores selecionados ✅
2. Time B vê o objetivo do Time A em bloco separado "OKRs Compartilhadas" abaixo dos próprios ✅
3. Card mostra badge "Compartilhado" + nome do time owner + KRs do Time B + estado de contribuição ✅
4. Time B não consegue editar/cancelar o objetivo compartilhado ✅
5. KRs do Time B em objetivo compartilhado continuam aparecendo nos ritos e no check-in individual (sem regressão) ✅

---

## Fase 3 (fora deste plano)

Drawer dedicado de detalhe cross-team (Visão geral / Relação / Contexto ampliado) — **não incluído**. Pode ser feito em rodada futura se a página/drawer atual do objetivo não for suficiente.
