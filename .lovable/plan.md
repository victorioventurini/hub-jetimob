## Objetivo

Corrigir de forma canônica o trigger `public.handle_new_user()` que está falhando com erro de cast de enum (`employment_status`), bloqueando a criação de **qualquer novo usuário** (interno ou externo) no momento do magic link — incluindo `gabriel@ferrigoloadvogados.com.br`.

## Causa raiz

`handle_new_user()` insere expressões `text` (`CASE WHEN ... THEN 'external' ELSE 'active' END`) em colunas tipadas como enum (`public.employment_status`, `public.app_role`). Postgres rejeita em runtime com:

> `column "employment_status" is of type employment_status but expression is of type text`

Resultado: `/admin/generate_link` retorna 500, `auth.users` não é criado, magic link nunca é enviado.

## Escopo

**1 migration apenas.** Sem mudanças em UI, hooks, edge functions (`request-magic-link`, `auth-email-hook`) ou schema.

## Alterações na migration

`CREATE OR REPLACE FUNCTION public.handle_new_user()` mantendo:

- `SECURITY DEFINER` + `SET search_path = public`
- `set_config('app.internal_call', 'true', true)` (bypass de guards internos)
- Detecção canônica de externo via `partner_contacts` + `partner_contact_bu_associations` (ativos: `deleted_at IS NULL`)
- Prioridade ao `bu_id` pré-existente (deterministic onboarding — `mem://auth/deterministic-onboarding-logic`)
- Vínculo `partner_contacts.user_id = NEW.id` (sem `profile_id`, coluna inexistente)

**Correções:**
- `employment_status` → cast explícito `::public.employment_status` (`'external'` ou `'active'`)
- `role_in_bu` em `bu_user_memberships` → cast explícito `::public.app_role` (`'member'`)
- `work_mode` → cast explícito `::public.work_mode` quando inserido
- `user_type` → cast explícito `::public.user_type`

## Validação pós-migration

1. Reexecutar `request-magic-link` para `gabriel@ferrigoloadvogados.com.br`.
2. Confirmar via `auth_logs` que `/admin/generate_link` retorna 200.
3. Confirmar em `auth.users` que o registro foi criado.
4. Confirmar em `profiles`: `employment_status='external'`, `user_type='external'`.
5. Confirmar em `partner_contacts`: `user_id` populado.
6. Confirmar em `bu_user_memberships`: 3 associações criadas (Jetimob / Victorio Venturini / Jet Experience) com `role_in_bu='member'`.
7. Confirmar entrega do magic link.

## Riscos e mitigação

- **Risco:** quebrar criação de usuários internos. **Mitigação:** lógica de detecção externa preservada 1:1; só os casts mudam.
- **Risco:** afetar usuários já existentes. **Mitigação:** trigger só roda em `INSERT` em `auth.users` (novos signups).
- **Rollback:** reaplicar versão anterior da função via nova migration.

## Pré-checklist (consultado)

- TCR v3.29.1 — fluxo Magic Link
- `IDENTITY_CONVENTION.md` — `user_id` vs `profile_id`
- `PERMISSIONS_AND_RBAC_MODEL.md` — persona `external`, `app_role`
- `mem://auth/external-user-identity-unification-v3`
- `mem://auth/deterministic-onboarding-logic`
- `mem://architecture/security-privilege-policy` — `SECURITY DEFINER` + `search_path`
