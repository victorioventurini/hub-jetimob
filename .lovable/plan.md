> **Pré-checklist:** ✅ TCR, IDENTITY_CONVENTION, DATA_MODEL_REGISTRY, SCHEMA_QUICK_REFERENCE, PERMISSIONS_AND_RBAC_MODEL e PRE_CHECKLIST consultados. CPF é dado de domínio → fica em `public.profiles` (nunca em `auth.users`). `assessment_invites.invitee_cpf` e `assessment_runs.respondent_cpf` já existem e serão a ponte para o vínculo futuro.

## Objetivo

Adicionar **CPF** como identificador único de **usuários internos** do Hub. Nesta fatia: schema + validação + obrigatoriedade no cadastro. **Sem** vínculo retroativo com assessments (fica para a próxima fatia).

---

## 1. Schema (migration)

Em `public.profiles`:

- Coluna `cpf TEXT NULL` — armazenado **somente dígitos** (11 chars), sem máscara.
- Índice único parcial:
  ```
  UNIQUE (cpf)
  WHERE cpf IS NOT NULL
    AND user_type = 'internal'
    AND deleted_at IS NULL
  ```
  Garante unicidade **global** entre internos vivos; não conflita com externos, soft-deleted ou legados sem CPF.
- Trigger `validate_profile_cpf` (BEFORE INSERT/UPDATE) — **sem CHECK constraint** (proibido pelo padrão):
  - Normaliza removendo não-dígitos antes de gravar.
  - Se `user_type = 'internal'` e `cpf IS NOT NULL`: exige 11 dígitos + valida dígitos verificadores + rejeita sequências repetidas.
  - Se `user_type = 'external'`: força `cpf = NULL` (CPF é só para internos).
  - **Não** torna NOT NULL no DB nesta fatia (perfis legados ficam NULL; obrigatoriedade é no app).
- **Não** mexer em `assessment_invites` / `assessment_runs` agora — apenas garantir que o normalizador frontend grave os mesmos 11 dígitos lá quando for o caso (próxima fatia).

---

## 2. Validação (SSOT frontend)

`src/lib/validation/cpf.ts`:

- `normalizeCpf(input)` — só dígitos.
- `formatCpf(digits)` — máscara `000.000.000-00` para exibição.
- `isValidCpf(digits)` — 11 dígitos + algoritmo dos verificadores + rejeita repetidos.
- `cpfZodSchema` — `z.string().transform(normalizeCpf).refine(isValidCpf, "CPF inválido")`.
- Testes Vitest com casos válidos/inválidos.

---

## 3. UI — `src/components/users/JetimoberDialog.tsx`

- Adicionar `cpf` ao `jetimoberSchema` como **obrigatório no fluxo de criação** de interno.
- Novo `Input` com máscara visual `000.000.000-00` (`inputMode="numeric"`, `maxLength=14`).
- Validação no blur: formato + verificadores via `cpfZodSchema`.
- Check de unicidade no blur (debounced) usando `useBuScopedSupabase`:
  - `select id, display_name from profiles where cpf=$1 and user_type='internal' and deleted_at is null limit 1`.
  - Erro inline: "CPF já cadastrado em [nome]".
  - Query key nova: `profilesKeys.cpfCheck(cpf)` em `src/lib/queryKeys/auth.ts`.
- No submit: enviar `cpf` normalizado (11 dígitos) no `insert` em `profiles`.
- Tratar `23505` (unique violation) com toast amigável caso a corrida vença o check.
- **Edição** de internos existentes: campo aparece **opcional** nesta fatia (permite preencher quando vazio; mantém valor existente). Não obrigatório em UPDATE para não bloquear edição de perfis legados.
- Fluxo de **externos** não muda.

---

## 4. Exibição

- `UsersTable`, `UserGlobalSheet`, `UserProfile`: exibir CPF formatado via `formatCpf`, **somente** para `user_type = 'internal'`.
- Visibilidade reaproveita gate existente para dados sensíveis do perfil (admins de BU + o próprio usuário) — sem nova permission key.

---

## 5. Fora de escopo (próximas fatias)

- Vínculo automático `assessment_runs.respondent_cpf` ↔ `profiles.cpf` (view/RPC + UI no detalhe do usuário listando assessments respondidos antes da contratação).
- Tornar CPF NOT NULL no DB após backfill dos perfis legados.
- Importação em massa via CSV com CPF.
- Histórico de alterações de CPF (audit log dedicado).

---

## Detalhes técnicos (resumo)

- **Migração**: `supabase--migration` idempotente — `ALTER TABLE`, índice único parcial, função PL/pgSQL + trigger.
- **Identidade**: CPF fica em `profiles` (domínio), nunca em `auth.users` — alinhado com `IDENTITY_CONVENTION.md`.
- **BU isolation**: unicidade é **global**; uma pessoa física = um CPF na empresa toda. Leitura para o check de duplicidade depende da RLS atual de `profiles` (v3.24.0 com cross-BU OR EXISTS) — caso a verificação retorne vazio para um CPF que existe em outra BU invisível ao usuário, o `23505` da unique cobre.
- **Tipos**: `src/integrations/supabase/types.ts` é regenerado automaticamente após a migração ser aprovada.
- **Sem** `select('*')`, query-keys via SSOT, sem CHECK constraint, sem mexer em `auth`.

---

## Entregáveis

1. Migration: coluna `cpf` + índice único parcial + trigger de validação.
2. `src/lib/validation/cpf.ts` + testes.
3. Atualização do `JetimoberDialog` (schema, input mascarado, check de unicidade, submit, tratamento de 23505).
4. Exibição de CPF em `UsersTable`, `UserGlobalSheet`, `UserProfile`.
5. Nova query key `profilesKeys.cpfCheck` em `src/lib/queryKeys/auth.ts`.
