---
name: Collaborator Initiatives Step — Scope
description: Step de Iniciativas do collaborator check-in busca por owner OR contributor no ciclo ativo; KRs derivados das iniciativas
type: feature
---

# Escopo do step `Iniciativas` no Collaborator Check-in

## Regra

`CollaboratorInitiativesStep` (`/rituals/collaborator-checkin?step=initiatives`)
busca iniciativas **centradas no colaborador**, no ciclo trimestral ativo:

- `owner_user_id = effectiveUserId` **OR** `contributors @> [effectiveUserId]`.
- Join `okr_team_key_results!inner → okr_team_objectives!inner` filtrando
  `cycle_id` ativo e excluindo `cancelled_at` / `deleted_at`.
- Soft-delete obrigatório na própria iniciativa
  (`is('deleted_at', null).is('cancelled_at', null)`).

Os KRs exibidos como agrupadores são **derivados** do conjunto de iniciativas
retornadas — não vêm do array `krs` (`useUserKrsForWizard`). O array `krs`
é usado apenas para enriquecimento (badges/projetos vinculados) e como
fallback de título via map auxiliar.

## Por quê

`useUserKrsForWizard` traz KRs onde o usuário é owner / co-resp /
owner-de-iniciativa (TCR §4.8 — Filtro de KRs). Mas isso **não cobre**
iniciativas em que o colaborador é apenas `contributors[]`. Antes da
correção, a query do step usava `kr_id IN krIds` derivado de `krs`, então
iniciativas do usuário sumiam sempre que o KR não entrava nessa lista
(ex.: KR de outro dono onde ele só contribui em uma iniciativa).

## Edição

`canEdit` permanece restrito ao owner
(`init.owner_user_id === effectiveUserId`). Contributors visualizam mas não
editam — coerente com RLS (`okrs.initiative.read:team_tree` cobre leitura;
mutações continuam exigindo ownership).

## Como aplicar

- **Query key:** `queryKeys.okrs.initiativesForCollaborator(buId, cycleId, profileId)`.
- **Cliente:** `useBuScopedSupabase` (BU isolation).
- **Empty state:** `EmptyState` canônico + `WizardStepFooter` com
  `Voltar / Pular / Continuar` (não alterar layout).
- **Não duplicar componentes:** reutilizar `InitiativesSummary`,
  `InitiativeQuickUpdateDialog`, `WizardStepScaffold/Header/Footer`,
  `EmptyState`.
- **Não alterar `useUserKrsForWizard`** — o escopo de KR (TCR §4.8 — Filtro
  de KRs) permanece o mesmo.

## Referências

- TCR §4.8 — Collaborator Check-in / **Filtro de Iniciativas do Step**.
- `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx`.
- `src/lib/queryKeys/okrs.ts` → `initiativesForCollaborator`.
