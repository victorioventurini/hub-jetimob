## Problema

Ao definir role global "colaborador" para `eduarda.oliveira@jetxp.com.br` em `/hub/users`, o backend retorna:

> there is no unique or exclusion constraint matching the ON CONFLICT specification

## Pré-checklist (revisado)

- `docs/canonical/core/INDEX.md` + `TCR_CORE.md` — OK.
- `PERMISSIONS_AND_RBAC_MODEL.md` — `user_roles.role` é a role global única por usuário (super_admin/admin/collaborator/external).
- `IDENTITY_CONVENTION.md` — `user_roles` é keyed por `user_id` (auth id). Atendido.
- Schema real: única UNIQUE em `public.user_roles` é `(user_id, role)`. Não há unique em `user_id` sozinho.

## Causa raiz

A RPC `public.update_user_global_role` faz:

```sql
INSERT INTO user_roles (user_id, role)
VALUES (target_user_id, new_role::app_role)
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

Como não existe unique em `user_id` sozinho, o `ON CONFLICT (user_id)` falha sempre. O erro só aparece quando o usuário ainda não tem nenhuma row (no caso de Eduarda já existe pelo menos uma).

## Correção (única migration alterando o corpo da RPC)

Reescrever `update_user_global_role` preservando validações atuais (`is_platform_admin`, restrição a `super_admin`) e a semântica "role global única":

1. Se `new_role` vazio/null → `DELETE FROM user_roles WHERE user_id = target_user_id` (já funciona).
2. Caso contrário:
   - `DELETE FROM user_roles WHERE user_id = target_user_id AND role <> new_role::app_role;`
   - `INSERT INTO user_roles (user_id, role) VALUES (target_user_id, new_role::app_role) ON CONFLICT (user_id, role) DO NOTHING;`

Idempotente, usa a constraint real `(user_id, role)`, sem alterar schema, RLS, frontend, ou outras RPCs. Mantém `SECURITY DEFINER` e `SET search_path = public`.

## Validação

1. `/hub/users?q=@jetxp` → abrir Eduarda → Role Global = "Colaborador" → salva sem erro; UI já reflete (invalidação canônica em `useUpdateGlobalRole`).
2. Repetir a mesma seleção → sem erro (idempotência).
3. Selecionar "Sem acesso global" → role removida.
4. Usuário sem role prévia → primeira atribuição funciona.
