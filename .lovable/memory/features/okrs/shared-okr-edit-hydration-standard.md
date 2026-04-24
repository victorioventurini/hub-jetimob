---
name: Shared OKR edit hydration standard
description: Hidratação one-shot e diff de contribuidores no TeamObjectiveFormDialog para evitar perda silenciosa em edição de OKRs compartilhados
type: feature
---

O dialog `TeamObjectiveFormDialog` (hook `useTeamObjectiveForm`) edita objetivos de time, incluindo o flag `is_shared` (OKR Compartilhada) e a lista de `contributingTeamIds`. A persistência exige cuidado especial:

1. **Hidratação one-shot por `objective.id`** (via `hydratedForObjectiveRef`): o efeito que popula `contributingTeamIds` a partir de `useObjectiveContributors` só dispara UMA vez por objetivo aberto. Refetches subsequentes do React Query NÃO sobrescrevem edições manuais do usuário (anteriormente, qualquer refetch revertia a seleção).
2. **Snapshot original** (`originalContributorIdsRef`) capturado na hidratação, usado para diff no save: `manageContributors` é chamado SOMENTE quando há mudança real entre a lista original e a alvo (com `is_shared` desligado, alvo = `[]`). Isso evita um DELETE/INSERT desnecessário em `okr_team_objective_contributors` que pode falhar por RLS (`okr_team_objective_contributors_manage_v2` exige `okrs.team_objective.update:self_or_owner`) ou simplesmente bloquear o save de outros campos.
3. **Bloqueio de submit em loading**: enquanto `isLoadingContributors` for true em modo edit, o submit é bloqueado com toast informativo — evita zerar contribuidores existentes por race condition (submit antes da hidratação chegar).
4. **Reset on close**: ao fechar o dialog, `hydratedForObjectiveRef` e `originalContributorIdsRef` são limpos para que a próxima abertura reidrate corretamente.
5. **Telemetria estruturada**: logs `[TeamObjectiveForm.update]` registram diff e erros (com decodificação `42501` → "Sem permissão").

RLS relevante:
- `okr_team_objective_contributors_manage_v2`: `has_permission(my_profile_id(), o.bu_id, 'okrs.team_objective.update:self_or_owner')` — qualquer mutação (insert/update/delete) em contribuidores exige essa key V2.
- `okr_team_objectives` update segue políticas próprias (validar que o usuário pode atualizar o objetivo primário).
