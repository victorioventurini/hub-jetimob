
# Plano: Correção Urgente - Migração partner_company_id → external_company_id

## 1. Diagnóstico Confirmado

**Erro:** `Could not find the 'partner_company_id' column of 'tickets' in the schema cache`

**Causa raiz:** A migração para o modelo unificado `external_companies` foi aplicada no banco de dados, mas o código frontend **ainda usa os nomes antigos das colunas**.

### Schema atual do banco (MIGRADO):

| Tabela | Coluna Atual |
|--------|--------------|
| `tickets` | `external_company_id` |
| `partner_contacts` | `external_company_id` |
| `partner_service_mappings` | `external_company_id` |
| `ticket_routing_rules` | `external_company_id` |
| `partner_contact_capabilities` | `external_company_id` |
| `v_partner_services` (view) | `external_company_id`, `external_company_name` |

### Código frontend (DESATUALIZADO - causando erro):

O código ainda referencia `partner_company_id` em ~25 arquivos.

---

## 2. Pré-requisitos Consultados

| Documento | Status |
|-----------|--------|
| Memory: `external-entities-unified-model` | ✅ Confirma migração concluída |
| Tabelas Supabase | ✅ Schema verificado com queries |
| DATA_MODEL_REGISTRY v2.51.0 | ✅ Alinhado |

---

## 3. Escopo da Correção

### Categoria A: Tipos e Definições (Crítico)

| Arquivo | Alterações |
|---------|------------|
| `src/modules/tickets/types.ts` | Renomear `partner_company_id` → `external_company_id` em interfaces (`Ticket`, `TicketFilters`, `CreateTicketData`, `TicketRoutingRule`, `PartnerServiceMapping`, `PartnerContact`) |
| `src/modules/tickets/hooks/ticketFieldDefinitions.ts` | Atualizar campos de query e joins (`external_company:external_companies`) |

### Categoria B: Hooks de Mutação/Query (Alta Prioridade)

| Arquivo | Alterações |
|---------|------------|
| `src/modules/tickets/hooks/useTicketMutations.ts` | Insert usa `external_company_id` |
| `src/modules/tickets/hooks/useTicketQueries.ts` | Filtro usa `external_company_id` |
| `src/modules/tickets/hooks/useRoutingRules.ts` | Select/Insert/Update com `external_company_id` |
| `src/modules/tickets/hooks/usePartnerServices.ts` | Tipos e queries com `external_company_id`, `external_company_name` |
| `src/modules/tickets/hooks/useContactCapabilities.ts` | Campos e queries |
| `src/modules/tickets/hooks/usePartners.ts` | Campos de partner_contacts |
| `src/modules/tickets/hooks/usePartnerCompanyContacts.ts` | Filtro de company |
| `src/modules/tickets/hooks/ticketQueryUtils.ts` | Normalização de relações |

### Categoria C: Componentes de UI

| Arquivo | Alterações |
|---------|------------|
| `src/modules/tickets/pages/TicketsListPage.tsx` | Filtro `partnerId` → usa `external_company_id` |
| `src/modules/tickets/pages/TicketDetailPage.tsx` | Props e dados |
| `src/modules/tickets/components/settings/PartnerServicesTab.tsx` | Props |
| Dialogs de criação/edição | Forms e dados |

---

## 4. Padrão de Renomeação

```typescript
// ANTES (incorreto - causa erro)
partner_company_id: data.partner_company_id || null,
partner_company:partner_companies(id, name),

// DEPOIS (correto)
external_company_id: data.external_company_id || null,
external_company:external_companies(id, name),
```

### Mapeamento completo:

| Código Antigo | Código Novo |
|---------------|-------------|
| `partner_company_id` (campo) | `external_company_id` |
| `partner_company:partner_companies(...)` (join) | `external_company:external_companies(...)` |
| `partner_company_name` (view) | `external_company_name` |

**Importante:** As tabelas `partner_contacts` e `partner_companies` ainda existem como entidades, mas **a FK em tickets e tabelas relacionadas** agora aponta para `external_companies`.

---

## 5. Ordem de Execução

1. **Tipos** (`types.ts`) — Base para TypeScript
2. **Field Definitions** (`ticketFieldDefinitions.ts`) — Queries centralizadas
3. **Mutations** (`useTicketMutations.ts`) — **Resolve o erro de criação**
4. **Queries** (`useTicketQueries.ts`, `useRoutingRules.ts`, `usePartnerServices.ts`)
5. **Hooks auxiliares** (`usePartners.ts`, `useContactCapabilities.ts`, `usePartnerCompanyContacts.ts`)
6. **Utils** (`ticketQueryUtils.ts`)
7. **Pages** (`TicketsListPage.tsx`, `TicketDetailPage.tsx`)
8. **Componentes** (dialogs, tabs, forms)

---

## 6. Arquivos Afetados (25 arquivos)

Baseado na busca, os principais arquivos com `partner_company_id`:

- `src/modules/tickets/types.ts`
- `src/modules/tickets/hooks/ticketFieldDefinitions.ts`
- `src/modules/tickets/hooks/useTicketMutations.ts`
- `src/modules/tickets/hooks/useTicketQueries.ts`
- `src/modules/tickets/hooks/useRoutingRules.ts`
- `src/modules/tickets/hooks/usePartnerServices.ts`
- `src/modules/tickets/hooks/usePartners.ts`
- `src/modules/tickets/hooks/useContactCapabilities.ts`
- `src/modules/tickets/hooks/usePartnerCompanyContacts.ts`
- `src/modules/tickets/hooks/ticketQueryUtils.ts`
- `src/modules/tickets/pages/TicketsListPage.tsx`
- `src/modules/tickets/pages/TicketDetailPage.tsx`
- `src/modules/tickets/components/settings/*.tsx` (vários)
- `src/modules/tickets/components/filters/*.tsx`

---

## 7. Validação Pós-Implementação

| Cenário | Esperado |
|---------|----------|
| Criar ticket externo | ✅ Sem erro de coluna |
| Listar tickets | ✅ Empresa externa exibida |
| Filtrar por empresa | ✅ Funciona |
| Editar routing rules | ✅ Funciona |
| Partner services tab | ✅ Lista corretamente |
| Contact capabilities | ✅ Funciona |

---

## 8. Impacto

| Aspecto | Valor |
|---------|-------|
| Arquivos modificados | ~25 |
| Linhas alteradas | ~300-400 |
| Risco de regressão | Baixo (renomeação consistente) |
| Urgência | **CRÍTICA** (bloqueando criação de tickets) |
