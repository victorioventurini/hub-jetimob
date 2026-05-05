## Objetivo

Alinhar `partner_contact_capabilities.created_by` à convenção canônica de identidade (IDENTITY_CONVENTION.md §1.3 + TCR §4.10): coluna de auditoria de criação deve referenciar `profiles.id`, não `auth.users.id`.

## Estado atual (verificado no banco)

- FK atual: `created_by` → `auth.users(id)` (divergente da convenção).
- 114 registros totais; **1 único** com `created_by` preenchido (auth user `dcb85e6f-…`); 113 com `NULL` (vieram de import).
- Frontend foi temporariamente ajustado para enviar `realUserId` — será revertido para `realProfileId` após a migração.
- Nenhum consumidor de `partner_contact_capabilities` (8 arquivos) lê/filtra por `created_by` — risco de regressão é baixo.

## Plano

### 1. Migration (DB) — uma única migration atômica

1. Converter o registro existente de `auth.users.id` → `profiles.id` via subquery em `profiles.user_id`.
2. Validar que conversão resultou em valor não-nulo antes de trocar a FK (caso contrário, abortar com `RAISE EXCEPTION`).
3. `DROP CONSTRAINT partner_contact_capabilities_created_by_fkey`.
4. `ADD CONSTRAINT partner_contact_capabilities_created_by_profile_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL`.
5. `COMMENT ON COLUMN`: documentar que armazena `profiles.id` conforme IDENTITY_CONVENTION §1.3.

### 2. Frontend — `src/modules/tickets/hooks/useContactCapabilities.ts`

- Trocar `realUserId` por `realProfileId` nos dois mutations (`useCreateContactCapability`, `useSaveContactCapabilities`) e no log de `onSuccess`.
- Manter `useIdentity()` (já importado).

### 3. Documentação canônica

- **IDENTITY_CONVENTION.md** §1.2 (Tickets): adicionar linha
  `| partner_contact_capabilities | created_by | profiles.id | partner_contact_capabilities_created_by_profile_fkey | Migrado em 2026-05 |`.
- **DATA_MODEL_REGISTRY.md**: adicionar nota de identity-mapping na seção `partner_contact_capabilities`.

### 4. Validação

- Adicionar capacidade pelo dialog em `/tickets/settings?tab=capabilities` → toast de sucesso, sem FK error.
- SQL pós-migration:
  `SELECT created_by, EXISTS(SELECT 1 FROM profiles WHERE id = pcc.created_by) FROM partner_contact_capabilities pcc WHERE created_by IS NOT NULL` → todos `true`.
- Operação como admin impersonando: `created_by` reflete o profile real (não impersonado), via `realProfileId`.

## Riscos

- **Baixo.** O único registro existente tem profile correspondente (a confirmar no momento da execução). RLS, índices únicos e nenhum JOIN crítico dependem de `created_by`.
