
# Plano: External Companies — Entidade Unificada com Múltiplos Papéis

## 1. Documentação Validada

| Documento | Status |
|-----------|--------|
| SCHEMA_QUICK_REFERENCE.md | ✅ Analisado |
| Código-fonte (19+ arquivos) | ✅ Mapeado |

---

## 2. Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL_COMPANIES (Global)                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ id, name, legal_name, person_type, document, document_type,             │ │
│  │ allowed_domains, status, notes, created_at, updated_at, deleted_at      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                         │
│                    ▼                               ▼                         │
│  ┌─────────────────────────────────┐ ┌─────────────────────────────────┐    │
│  │ external_company_bu_associations│ │ external_company_bu_associations│    │
│  │ role = 'partner'                │ │ role = 'supplier'               │    │
│  │ + supervisor_profile_ids        │ │ (future: customer)              │    │
│  │ + supervisor_contact_ids        │ │                                 │    │
│  │ + default_contact_ids           │ │                                 │    │
│  └─────────────────────────────────┘ └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              /settings/       /settings/      (futuro)
              partners         suppliers       /settings/customers
```

### Modelo de Dados

**Uma empresa** (CPF/CNPJ único) pode ter **múltiplos papéis** em uma BU:
- Parceiro de serviços (tickets externos)
- Fornecedor (brindes, inventário)
- Cliente (futuro)

---

## 3. Estratégia de Migration

### Fase 1: Renomear Tabelas (Atomic)

```sql
-- Renomear tabela principal
ALTER TABLE partner_companies RENAME TO external_companies;

-- Renomear tabela de associações
ALTER TABLE partner_company_bu_associations 
  RENAME TO external_company_bu_associations;

-- Renomear coluna FK
ALTER TABLE external_company_bu_associations 
  RENAME COLUMN partner_company_id TO external_company_id;

-- Adicionar coluna de papel com default 'partner'
ALTER TABLE external_company_bu_associations
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'partner' NOT NULL;

-- Constraint para valores válidos
ALTER TABLE external_company_bu_associations
  ADD CONSTRAINT chk_bu_assoc_role CHECK (role IN ('partner', 'supplier', 'customer'));

-- Índice único: uma empresa só pode ter um papel por BU
CREATE UNIQUE INDEX idx_ext_company_bu_role 
  ON external_company_bu_associations(external_company_id, bu_id, role)
  WHERE deleted_at IS NULL;
```

### Fase 2: Views de Compatibilidade

Para minimizar impacto no código existente, criar views que mantêm os nomes antigos:

```sql
-- View que mapeia para código legado (pode ser removida depois)
CREATE OR REPLACE VIEW partner_companies AS
SELECT * FROM external_companies;

CREATE OR REPLACE VIEW partner_company_bu_associations AS
SELECT 
  id, external_company_id AS partner_company_id, bu_id, is_active,
  notes, created_at, created_by, updated_at, deleted_at,
  default_contact_ids, supervisor_profile_ids, supervisor_contact_ids
FROM external_company_bu_associations
WHERE role = 'partner';
```

### Fase 3: Atualizar Tabelas Relacionadas

```sql
-- partner_contacts → external_contacts (ou manter e adicionar FK)
ALTER TABLE partner_contacts 
  RENAME COLUMN partner_company_id TO external_company_id;

-- partner_service_mappings 
ALTER TABLE partner_service_mappings
  RENAME COLUMN partner_company_id TO external_company_id;

-- ticket_routing_rules
ALTER TABLE ticket_routing_rules
  RENAME COLUMN partner_company_id TO external_company_id;

-- tickets
ALTER TABLE tickets
  RENAME COLUMN partner_company_id TO external_company_id;
```

### Fase 4: Atualizar RLS Policies

Recriar policies com novos nomes de tabela.

---

## 4. Impacto no Código

### 4.1 Arquivos que Precisam Ser Atualizados

| Módulo | Arquivos | Mudança |
|--------|----------|---------|
| **Partners** | `useGlobalPartners.ts`, `usePartnerBuAssociations.ts`, tipos | Trocar nomes de tabela |
| **Tickets** | `usePartners.ts`, `usePartnerSupervisors.ts`, `useAvailableExternalContacts.ts` | Trocar nomes de tabela |
| **External** | `request-magic-link/index.ts` | Trocar nomes de tabela |
| **Components** | `ContactHoverCard.tsx`, `PartnerContactHoverCard.tsx` | Trocar nomes de tabela |

### 4.2 Abordagem: Views ou Refactor Completo?

**Opção A - Views (Incremental):**
- Criar views com nomes antigos
- Código continua funcionando
- Gradualmente migrar para novos nomes
- Remover views quando migração estiver completa

**Opção B - Refactor Completo (Recomendado):**
- Atualizar todos os arquivos de uma vez
- Mais limpo a longo prazo
- Maior risco de bugs temporários

**Decisão sugerida:** Opção B — refactor completo com find/replace cuidadoso.

---

## 5. Novo Módulo: Suppliers

### 5.1 Estrutura de Arquivos

```
src/modules/suppliers/
├── hooks/
│   ├── useSuppliers.ts          # Lista suppliers da BU
│   ├── useSupplierDetail.ts     # Detalhe de um supplier
│   └── index.ts
├── pages/
│   ├── SuppliersPage.tsx        # Lista /settings/suppliers
│   ├── SupplierDetailPage.tsx   # Detalhe /settings/suppliers/:id
│   └── index.ts
├── types.ts
└── index.ts
```

### 5.2 Hook Principal

```typescript
// useSuppliers.ts
export function useSuppliers() {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: suppliersKeys.list(currentBuId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_company_bu_associations")
        .select(`
          id, is_active, notes,
          external_company:external_companies(
            id, name, legal_name, person_type, document, document_type, status
          )
        `)
        .eq("bu_id", currentBuId)
        .eq("role", "supplier")  // ← Filtro por papel
        .is("deleted_at", null);

      if (error) throw error;
      return data;
    },
  });
}
```

### 5.3 UI — SuppliersPage

Reutilizar estrutura do PartnersPage com ajustes:
- Título: "Fornecedores"
- Filtro de role fixo em 'supplier'
- Botão "Novo Fornecedor" que:
  1. Busca por CNPJ
  2. Se encontrar empresa existente → Ativar como supplier na BU
  3. Se não encontrar → Criar empresa + associação com role='supplier'

---

## 6. Fluxo de Cadastro de Fornecedor para Brindes

```text
┌─────────────────────────────────────────────────────────────────┐
│  Cadastrar Brinde                                               │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Fornecedor                                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [Buscar por CNPJ...]                                      │  │
│  │                                                           │  │
│  │ ┌─────────────────────────────────────────────────────┐   │  │
│  │ │ Empresa ABC Ltda - 12.345.678/0001-90             │   │  │
│  │ │ ✓ Já cadastrada como Parceiro                      │   │  │
│  │ │ [Usar este fornecedor]                             │   │  │
│  │ └─────────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │ OU                                                        │  │
│  │                                                           │  │
│  │ ┌─────────────────────────────────────────────────────┐   │  │
│  │ │ CNPJ não encontrado                                │   │  │
│  │ │ [Cadastrar nova empresa]                           │   │  │
│  │ └─────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Ordem de Implementação

### Sprint 1: Foundation (Migration + Refactor)
1. **Migration SQL** — Renomear tabelas e adicionar coluna role
2. **Refactor código** — Find/replace em todos os arquivos
3. **Testes** — Validar que Partners continua funcionando

### Sprint 2: Suppliers Module
4. **Query Keys** — `src/lib/queryKeys/suppliers.ts`
5. **Hooks** — `useSuppliers`, `useCreateSupplier`, etc.
6. **Pages** — `SuppliersPage`, `SupplierDetailPage`
7. **Rotas** — Adicionar em `/settings/suppliers`

### Sprint 3: Integration com Gifts
8. **GiftItemDialog** — Adicionar campo Fornecedor com autocomplete de suppliers
9. **Atualizar `asset_gift_items`** — Adicionar `supplier_id UUID REFERENCES external_companies(id)`

---

## 8. Arquivos a Criar/Modificar

| Arquivo | Operação | Propósito |
|---------|----------|-----------|
| Migration SQL | **Criar** | Renomear tabelas, adicionar role |
| `src/lib/queryKeys/suppliers.ts` | **Criar** | Query keys para suppliers |
| `src/lib/queryKeys/externalCompanies.ts` | **Criar** | Query keys globais |
| `src/modules/suppliers/` | **Criar** | Novo módulo completo |
| `src/modules/partners/hooks/*.ts` | **Modificar** | Trocar nomes de tabela |
| `src/modules/tickets/hooks/*.ts` | **Modificar** | Trocar nomes de tabela |
| `src/modules/external/hooks/*.ts` | **Modificar** | Trocar nomes de tabela |
| `src/components/contact/*.tsx` | **Modificar** | Trocar nomes de tabela |
| `supabase/functions/request-magic-link/index.ts` | **Modificar** | Trocar nomes de tabela |
| `docs/canonical/SCHEMA_QUICK_REFERENCE.md` | **Modificar** | Documentar mudanças |
| Rotas | **Modificar** | Adicionar /settings/suppliers |

---

## 9. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Quebra de queries existentes | Views de compatibilidade temporárias |
| RLS quebrada | Recriar todas as policies na mesma migration |
| Triggers quebrados | Atualizar função do trigger de supervisores |
| Edge function quebrada | Atualizar request-magic-link |

---

## 10. Validação Pós-Implementação

| Cenário | Esperado |
|---------|----------|
| Criar parceiro existente | ✅ Partners continua funcionando |
| Ativar empresa como supplier | ✅ Cria associação com role='supplier' |
| Mesma empresa como partner E supplier | ✅ Duas associações distintas |
| Buscar por CNPJ existente | ✅ Retorna empresa única |
| Cadastrar brinde com fornecedor | ✅ Seleciona supplier da BU |
