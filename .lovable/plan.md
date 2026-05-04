
## Problema

Gabriel (`gabriel@ferrigoloadvogados.com.br`), externo, envia mensagens no ticket `4cf94492…b563`, mas falha ao **anexar arquivos**. Postgres logs:

```
ERROR: new row violates row-level security policy for table "ticket_attachments"
```

## Causa raiz (canônica — vale para todos os externos)

A policy `ticket_attachments_insert_v4` exige **2 condições** com AND:
1. `is_current_bu(bu_id)` — TRUE
2. (permissão OU participante interno OU participante externo) — TRUE

A condição (2) passa para Gabriel (validado: ele é `ticket_participants` ativo via `partner_contact_id` com `pc.user_id = auth.uid()`).
A condição (1) **falha** para externos. Hoje `is_current_bu()` resolve `current_bu_id()`, que para externos só reconhece BUs presentes em `bu_user_memberships`. Como externos resolvem BU via `partner_contact_bu_associations` (não têm membership na BU do parceiro), `current_bu_id()` cai no fallback "primeira membership ativa" (BU de onboarding) ≠ `bu_id` do ticket → `is_current_bu(bu_id)` retorna FALSE → RLS recusa o INSERT.

Mensagens passam porque `ticket_messages_insert_v3` também exige `is_current_bu(bu_id)`, mas o ticket do Gabriel está exatamente na BU de onboarding dele (`a0000000…0001`). Em outras BUs onde ele é só partner_contact, o problema também afeta `ticket_messages` — então o fix é canônico para o módulo inteiro.

Adicionalmente, as policies de Storage do bucket `ticket-attachments` estão duplicadas/legadas e a de DELETE só reconhece `bu_user_memberships`, deixando externos sem rollback de upload.

## Mudanças (1 migration SQL — sem código de UI/hooks/edge)

### A) Estender `current_bu_id()` para reconhecer BUs do externo

Adicionar à resolução do header `x-current-bu-id` e ao fallback uma condição que aceite BUs presentes em `partner_contact_bu_associations` ativas do `auth.uid()` (via `partner_contacts.user_id = auth.uid()`, `pc.deleted_at IS NULL`, `pcba.deleted_at IS NULL`, `pcba.is_active = true`).

- Mantém `SECURITY DEFINER` + `SET search_path = public` + `STABLE`.
- Privilégio NÃO se expande: a função continua restrita ao próprio `auth.uid()`.
- Isso conserta `is_current_bu()` automaticamente (que delega a `current_bu_id()`), e qualquer policy que use `is_current_bu()` (incluindo `ticket_messages_insert_v3` e `ticket_attachments_insert_v4`) passa a aceitar externos na BU correta.

### B) Limpar e canonizar policies do bucket `ticket-attachments` em `storage.objects`

Hoje há 6 policies, duas duplicatas frouxas. Substituir por 4 canônicas:

- **INSERT** (`Upload ticket attachments — canonical`): `bucket_id = 'ticket-attachments' AND auth.uid() IS NOT NULL`. A autorização real fica no INSERT em `public.ticket_attachments` (que já valida participação). Mantemos no Storage apenas o gate de "autenticado", evitando duplicação de regras.
- **SELECT** (`Read ticket attachments — canonical`): mesmo gate de autenticado; download real é via **signed URL** (já implementado em `useAttachmentUrl`), e o acesso ao registro é gateado por `ticket_attachments_select_v3` (`can_view_ticket`).
- **DELETE — interno**: dono do upload (`uploaded_by_user_id = my_profile_id()`) OU `is_platform_admin(auth.uid())`.
- **DELETE — externo (cleanup de upload falho)**: `partner_contacts.user_id = auth.uid()` E objeto pertence a ticket no qual ele é participante ativo. Isso preserva o rollback do `useTicketMessageMutations.uploadAttachments` quando o INSERT no DB falha após o upload no storage.
- DROP das 2 policies legadas duplicadas (`Authenticated users can upload ticket attachments`, `Users can upload ticket attachments`, `Users can read ticket attachments`, `Users can view ticket attachments they have access to`, e a `Users can delete their own ticket attachments` antiga baseada só em `bu_user_memberships`).

### C) Reafirmar `ticket_attachments_insert_v4` como `TO authenticated`

Não muda lógica — só garante o role e mantém a policy explícita após cleanup.

## Validação pós-deploy

1. Logado como Gabriel, abrir ticket `4cf94492…b563`, anexar arquivo → 200, linha em `ticket_attachments`, attachment visível para ambos os lados.
2. Logada como Andressa em outra BU onde é externa → consegue anexar.
3. Internos (Andre, etc.): comportamento preservado — anexar/baixar/deletar continuam funcionando.
4. Conferir Postgres logs: nenhum `RLS violation` novo em `ticket_attachments`.
5. `cross-bu-isolation`: tentar anexar em ticket de BU onde NÃO é participante → permanece bloqueado.

## Pré-checklist canônico (consultado)

- TCR / DEVELOPMENT_STANDARDS / BU_SCOPED_SUPABASE_RULES — regras 1, 3, 8 preservadas.
- IDENTITY_CONVENTION.md — interno via `my_profile_id()`, externo via `partner_contacts.user_id = auth.uid()`.
- PERMISSIONS_AND_RBAC_MODEL / RBAC_TEMPLATES_V3 — `tickets.attachment.create:bu` continua sendo o gate de internos; externos via participação.
- `mem://auth/external-user-identity-unification-v3`, `mem://auth/identity-rbac-master`, `mem://standards/bu-isolation-master` — sem vazamento cross-BU.
- `mem://architecture/security-privilege-policy` — função `current_bu_id` mantém SECURITY DEFINER + search_path; sem expansão de privilégio.
- `mem://features/tickets/cross-bu-isolation` — RLS continua restringindo por participação ativa.

## Não-mudanças

- Nada em UI / hooks / edge functions.
- `useTicketMessageMutations.uploadAttachments` permanece usando `buScopedSupabase`.
- `useExternalUser` e BU-switcher inalterados.
