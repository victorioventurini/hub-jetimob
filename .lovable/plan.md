## Problema

Ao adicionar uma capacidade de contato em `/tickets/settings?tab=capabilities`, o insert em `partner_contact_capabilities` falha por violação de chave estrangeira.

**Causa raiz:** a coluna `partner_contact_capabilities.created_by` tem FK para `auth.users(id)`, mas o hook `useCreateContactCapability` envia `profile?.id` (ID do **profile**, não do **auth user**). Profile ID ≠ auth user ID no Hub da Jet.

## Correção

Arquivo: `src/modules/tickets/hooks/useContactCapabilities.ts` (linha ~127–144)

1. Substituir `useAuth().profile.id` por `useIdentity()` e usar `authUserId` (ou ler `supabase.auth.getUser()` no momento do insert) para preencher `created_by`.
2. Padrão equivalente já usado em outros mutations do módulo Tickets (verificar `useCreateTicket` para consistência).
3. Manter fallback `null` se por algum motivo `authUserId` não estiver disponível (a coluna é nullable).

## Validação

- Adicionar nova capacidade pelo dialog → toast "Capacidade adicionada", linha visível na lista.
- Linha aparece com `created_by` = auth.users.id válido.
- Operação como admin impersonando: `created_by` reflete o auth user real (não o impersonado), evitando FK error.

## Observação adicional

Não alterar a regra de unique index nem RLS — ambas estão corretas. Apenas o valor enviado em `created_by` está incorreto.
