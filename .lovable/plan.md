# Collaborator Check-in — Atualização de Projetos/Milestones/Iniciativas

Status: IMPLEMENTADO (2026-04-28)

## O que foi entregue
- `CollaboratorProjectsStep`: botão "Editar projeto" (owner) abre `ProjectDialog` canônico (RPC `update_project_v2`); botão lápis em cada milestone abre `MilestoneDialog` canônico (`useUpdateMilestone`). Gating row-aware via `canEditMilestoneRecord`.
- `CollaboratorInitiativesStep`: botão "Atualizar" em cada iniciativa do owner abre `InitiativeQuickUpdateDialog` (`useUpdateInitiative`). Toggle "em risco" segue local (não persiste — opcional).
- `InitiativesSummary`: nova prop opcional `onEdit` + `canEdit` para slot de edição.

## Padrões aplicados
- BU isolation, soft-delete, sem select(*), query keys canônicas, React.memo preservado.
- Mutations fora do draft (wizard-draft-isolation).
- Notas de milestone: salvar manual (governança Projects v1.7) — herdado do MilestoneDialog.
- Edição de projeto via RPC `update_project_v2` (Projects v1.8).
- Permissão de milestone: matriz canônica `milestone-permissions-row-aware` (sem caminho de delete).

## Fora do escopo (não entregue)
- Bloco "atualizações desta sessão" no CollaboratorSummary.
- Edição por líder dentro do step (líder edita pelo módulo de Projetos — evita 1 RPC `is_leader_of_project_owner` por linha).
