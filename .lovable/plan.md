

# Correção: Menções de Externos como Internos + Redirect de Perfil

## Status: ✅ CONCLUÍDO (2026-02-10)

## Problema Identificado

Antes da correção do `search_mention_candidates`, era possível mencionar usuários externos como se fossem internos. Isso gerou dois problemas:

1. **Dados corrompidos no banco**: 2 menções em `ticket_messages` armazenadas como `@[nome](internal:profileId)` quando deveriam ser `@[nome](external:contactId)`
2. **Menções na tabela `mentions`**: 2 registros com `mentioned_user_id` preenchido (profile ID) quando deveriam ter `mentioned_contact_id` preenchido
3. **Links quebrados**: Clicar nessas menções levava a `/users/{profileId}` que mostrava uma página de perfil interno para um usuário externo

## Correções Aplicadas

### Passo 1: ✅ Dados corrigidos no banco
- `body_richtext` das 2 mensagens atualizado de `internal:profileId` para `external:contactId`
- `mentions` table: 2 registros corrigidos movendo `mentioned_user_id` para `mentioned_contact_id`
- Trigger `trg_enforce_bu_scope_ticket_messages` desabilitado temporariamente para a migração

### Passo 2: ✅ Redirect defensivo implementado
- Hook `useExternalProfileRedirect` criado em `src/hooks/useExternalProfileRedirect.ts`
- Integrado na página `UserProfile` (`src/pages/UserProfile/index.tsx`)
- Verifica `profiles.user_type = 'external'`, busca `partner_contacts.id` correspondente e redireciona para `/contacts/{contactId}`

### Passo 3: ✅ Documentação atualizada
- `plan.md` atualizado com status final

