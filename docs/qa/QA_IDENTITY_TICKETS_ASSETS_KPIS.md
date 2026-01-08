# QA Checklist - Identidade: Tickets, Assets, KPIs

**Data:** 2026-01-08  
**Status:** ✅ PASS

---

## Tickets

### 1. Criação de Ticket ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| `created_by_user_id` recebe `profileId` | Sim | ✅ PASS |
| `owner_user_id` recebe `profileId` | Sim | ✅ PASS |
| Participant recebe `profileId` | Sim | ✅ PASS |

**Código verificado:**
```tsx
// src/modules/tickets/hooks/useTickets.ts:184-185
created_by_user_id: profileId,
owner_user_id: profileId,
```

### 2. Visualização de Tickets ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| "Meus tickets" filtra por `profileId` | Sim | ✅ PASS |
| Criador vê próprio ticket | Sim | ✅ PASS |
| Owner vê próprio ticket | Sim | ✅ PASS |
| Usuário não envolvido não vê | Não | ✅ PASS |

**RLS Policy:**
```sql
-- tickets: Ticket owners and admins can update
(created_by_user_id = my_profile_id()) OR (owner_user_id = my_profile_id())
```

### 3. Mensagens ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| `author_user_id` recebe `profileId` | Sim | ✅ PASS |
| Autor pode editar mensagem | Sim | ✅ PASS |
| Não-autor não pode editar | Não | ✅ PASS |

---

## Assets

### 4. Empréstimo de Ativo ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| `current_user_id` recebe `profileId` | Sim | ✅ PASS |
| `authorized_by_user_id` recebe `profileId` | Sim | ✅ PASS |
| Holder vê ativo emprestado | Sim | ✅ PASS |

**Código verificado:**
```tsx
// src/modules/assets/components/inventory/InventoryFormDialog.tsx:272
authorized_by_user_id: !isEditing && data.assigned_to_user_id ? profileId : undefined,
```

### 5. Lookup de Profiles ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| `getKeyMovements` busca por `profiles.id` | Sim | ✅ PASS (corrigido) |
| ProfileMap usa `profiles.id` como chave | Sim | ✅ PASS |

**Código corrigido:**
```tsx
// src/modules/assets/hooks/useKeys.ts:135-141
const { data: profiles } = profileIds.length > 0
  ? await supabase.from("profiles").select("id, ...").in("id", profileIds)
  : { data: [] };

const profileMap = new Map((profiles || []).map(p => [p.id, { ... }]));
```

### 6. Permissões de Inventário ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| `asset_permissions.user_id` = `auth.users.id` | Sim | ✅ PASS |
| Policy usa `auth.uid()` | Sim | ✅ PASS (correto para auth table) |

---

## KPIs

### 7. Criação de KPI ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| `owner_user_id` selecionado do dropdown | `profiles.id` | ✅ PASS |
| Dropdown lista `profiles.id` | Sim | ✅ PASS |

**Código verificado:**
```tsx
// src/modules/kpis/components/CreateKpiDialog.tsx:107
.select("id, display_name") // profiles.id
```

### 8. Gestão de KPIs pelo Líder ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| Líder de time pode gerenciar KPIs do time | Sim | ✅ PASS |
| Policy usa `my_profile_id()` | Sim | ✅ PASS |

**RLS Policy:**
```sql
-- kpi_metrics: Team leaders can manage their team KPIs
(t.leader_user_id = my_profile_id())
```

### 9. Inserção de Valores ✅

| Cenário | Esperado | Resultado |
|---------|----------|-----------|
| Owner pode inserir valores | Sim | ✅ PASS |
| Policy verifica ownership via `my_profile_id()` | Sim | ✅ PASS |

**RLS Policy:**
```sql
-- kpi_values: KPI owners can insert values
(km.owner_user_id = my_profile_id())
```

---

## Cross-Module

### 10. View de Violações ✅

```sql
SELECT COUNT(*) FROM identity_rls_violations;
-- Resultado: 0
```

### 11. Audit Script ✅

```bash
npm run audit:identity
# Resultado: PASS (0 violations)
```

### 12. Funções Canônicas ✅

| Função | Status |
|--------|--------|
| `my_profile_id()` | ✅ Existe e funciona |
| `my_profile_id_strict()` | ✅ Existe e funciona |
| `profile_id_from_user_id(uuid)` | ✅ Existe e funciona |
| `user_id_from_profile_id(uuid)` | ✅ Existe e funciona |
| `assert_profile_identity(uuid)` | ✅ Existe e funciona |

---

## Resultado Final

| Módulo | RLS | Frontend | Dados | Status |
|--------|-----|----------|-------|--------|
| Tickets | ✅ | ✅ | ✅ | PASS |
| Assets | ✅ | ✅ | ⚠️ 4 legados | PASS |
| KPIs | ✅ | ✅ | ✅ | PASS |

**Status Geral: ✅ PASS**

---

## Observações

1. **Dados legados em Assets**: 4 registros antigos armazenam `auth.users.id` em vez de `profiles.id`. Não foram migrados para evitar quebras. Documentar para v3.

2. **Colunas de auditoria**: `asset_clavicularies.created_by` e `kpi_values.created_by` armazenam `auth.users.id` corretamente (padrão de auditoria).

3. **`asset_permissions.user_id`**: Armazena `auth.users.id` corretamente (tabela de autorização).
