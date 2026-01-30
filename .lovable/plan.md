
# Plano: Migração partner_company_id → external_company_id

## Status: ✅ CONCLUÍDO (2026-01-30)

---

## 1. Resumo da Migração

A migração unificou o modelo de entidades externas, renomeando `partner_companies` para `external_companies` e `partner_company_id` para `external_company_id` em todo o sistema.

---

## 2. Alterações Realizadas

### 2.1 Banco de Dados (SQL Migrations)

| RPC/Function | Status |
|--------------|--------|
| `get_partner_categories(p_external_company_id)` | ✅ Atualizado |
| `get_partner_subcategories(p_external_company_id, p_category_id)` | ✅ Atualizado |
| `search_mention_candidates(p_bu_id, p_external_company_id, ...)` | ✅ Atualizado |

### 2.2 Frontend (TypeScript)

| Arquivo | Alteração |
|---------|-----------|
| `src/modules/tickets/types.ts` | ✅ `external_company_id` em todas interfaces |
| `src/modules/tickets/hooks/ticketFieldDefinitions.ts` | ✅ Joins para `external_companies` |
| `src/modules/tickets/hooks/useTicketMutations.ts` | ✅ Insert usa `external_company_id` |
| `src/modules/tickets/hooks/useTicketQueries.ts` | ✅ Filtro `external_company_id` |
| `src/modules/tickets/hooks/usePartnerServices.ts` | ✅ RPCs com novos parâmetros |
| `src/modules/tickets/hooks/usePartnerCompanyContacts.ts` | ✅ Filtro atualizado |
| `src/modules/tickets/hooks/usePartners.ts` | ✅ Campos atualizados |
| `src/modules/tickets/pages/TicketsListPage.tsx` | ✅ Filtros |
| `src/modules/tickets/pages/CreateTicketPage.tsx` | ✅ Schema Zod + submit |
| `src/modules/tickets/pages/PartnerContactProfilePage.tsx` | ✅ Joins e queries |
| `src/modules/tickets/components/filters/TicketResponsibleSelect.tsx` | ✅ Joins |
| `src/modules/tickets/components/settings/PartnerContactHoverCard.tsx` | ✅ Tabelas corretas |
| `src/hooks/useMentionableUsers.ts` | ✅ Novo param RPC |
| `src/integrations/supabase/operationalTables.ts` | ✅ `external_companies` |
| `src/modules/partners/types.ts` | ✅ Interfaces atualizadas |

### 2.3 Documentação Canônica

| Documento | Status |
|-----------|--------|
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | ✅ Atualizado v2.76.0 |
| `docs/canonical/SCHEMA_QUICK_REFERENCE.md` | ✅ Atualizado |
| `docs/canonical/DATA_MODEL_REGISTRY.md` | ✅ Atualizado |
| `docs/canonical/DATA_MODEL_REGISTRY.json` | ✅ Atualizado |

---

## 3. Referências Legadas Remanescentes

| Local | Descrição | Impacto |
|-------|-----------|---------|
| `src/integrations/supabase/types.ts` | FK names antigos (ex: `tickets_partner_company_id_fkey`) | ❌ Nenhum (read-only, gerado) |
| Índices no banco | Nomes antigos (ex: `idx_partner_companies_document_unique`) | ❌ Nenhum (funcionalidade ok) |

---

## 4. Validação

| Cenário | Resultado |
|---------|-----------|
| Build do projeto | ✅ Sem erros |
| Criar ticket externo | ✅ Funciona |
| Listar tickets com filtro de empresa | ✅ Funciona |
| Perfil de contato parceiro | ✅ Funciona |
| HoverCard de contato | ✅ Funciona |
| Filtro de responsável (interno/externo) | ✅ Funciona |

---

## 5. Mapeamento Final

| Legado | Novo |
|--------|------|
| `partner_companies` (tabela) | `external_companies` |
| `partner_company_bu_associations` | `external_company_bu_associations` |
| `partner_company_id` (coluna) | `external_company_id` |
| `p_partner_company_id` (param RPC) | `p_external_company_id` |
| Join `partner_companies(...)` | Join `external_companies(...)` |
