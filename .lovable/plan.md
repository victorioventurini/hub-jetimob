## Objetivo

Hoje, quando um convite é revogado, ele permanece com `status = 'revoked'` e o `rpc_assessment_invite_lookup` bloqueia o acesso ao runner público (`/q/:token`). Não há UI para desfazer.

Adicionar a ação **"Reativar"** ao lado do badge `revoked` na aba **Convites**, que volta o convite para `pending` (status pré-uso), reabilitando o link existente sem gerar novo token.

## Escopo

- Apenas convites com `status = 'revoked'` ganham a ação.
- Convites `submitted` continuam imutáveis (concluídos).
- Convites `expired` ficam fora desta fatia (não foi pedido; reativar exigiria estender `expires_at`).
- Mantém o **mesmo `token`** — o link já compartilhado volta a funcionar.
- Sem migration: o RPC `rpc_assessment_invite_lookup` já libera `pending` automaticamente.

## Reuso (sem duplicar)

| Necessidade | Fonte canônica |
|---|---|
| Mutation pattern | espelha `useRevokeInvite` em `useAssessmentsData.ts` |
| Cliente Supabase | `useBuScopedSupabase` (BU isolation mandatória) |
| Identidade na escrita | `realProfileId` via `useIdentity` (campo `created_by` permanece o original; só atualizamos `status`) |
| Query key | `["assessments", "invites", buId, assessment_id]` (mesma chave já invalidada pelo revoke) |
| Permissão | mesma RLS do revoke (`assessments.invite.create:bu` / update policy já existente) |

## Mudanças

### 1. `src/modules/assessments/hooks/useAssessmentsData.ts`

Adicionar `useReactivateInvite` (espelho do `useRevokeInvite`):

- Input: `{ id: string; assessment_id: string }`.
- Update: `{ status: "pending" }` em `assessment_invites`, com `.eq("id", input.id).eq("bu_id", currentBuId).eq("status", "revoked")` (guard para não sobrescrever convites em outro estado por race).
- Invalida `["assessments", "invites", currentBuId, assessment_id]`.
- Toast: `"Convite reativado"`.

### 2. `src/modules/assessments/pages/AssessmentDetailPage.tsx` (`InvitesTab`)

Na linha do convite (já existente, ~L208-210):

- Quando `inv.status === "revoked"` → mostrar botão **"Reativar"** (`variant="ghost"`, ícone `RotateCcw` se já importado em outro lugar — senão sem ícone) que dispara a mutation.
- Botão de copiar link continua escondido para revoked (já está condicionado).
- Após reativação, badge muda para `pending` automaticamente via invalidação.

## Fora de escopo

- Reativar `expired` (precisaria UI para nova `expires_at`).
- Auditoria de reativações (já existe trigger genérico de history em `assessment_invites`? sem alterações aqui).
- Notificação ao convidado.

## Entregáveis

1. `useReactivateInvite` em `useAssessmentsData.ts` (~15 linhas, padrão idêntico ao revoke).
2. Botão "Reativar" condicional ao `status === "revoked"` em `InvitesTab`.

Sem migration. Sem alteração de RLS. Sem alteração no runner público.