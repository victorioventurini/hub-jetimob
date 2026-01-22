# Auditoria de Identidade: Tickets, Assets, KPIs

**Data:** 2026-01-08  
**Status:** ✅ PASS

---

## 1. Resumo Executivo

Auditoria completa das colunas de domínio nos módulos Tickets, Assets e KPIs. Todas as policies RLS foram verificadas e estão usando corretamente `my_profile_id()` para comparações com colunas de domínio.

---

## 2. Auditoria de Colunas

### 2.1 Tickets

| Tabela | Coluna | Total | Match Profiles | Match Auth | Status |
|--------|--------|-------|----------------|------------|--------|
| `tickets` | `owner_user_id` | 1 | 1 | 0 | ✅ OK |
| `tickets` | `created_by_user_id` | 1 | 1 | 0 | ✅ OK |
| `ticket_messages` | `author_user_id` | 0 | - | - | ✅ OK |
| `ticket_participants` | `user_id` | 0 | - | - | ✅ OK |

**Políticas RLS:** Todas usam `my_profile_id()` corretamente.

### 2.2 Assets

| Tabela | Coluna | Total | Match Profiles | Match Auth | Status | Ação |
|--------|--------|-------|----------------|------------|--------|------|
| `asset_inventory` | `current_user_id` | 241 | 240 | 1 | ⚠️ LEGADO | 1 registro legado |
| `asset_movements` | `performed_by_user_id` | 1 | 0 | 1 | ⚠️ LEGADO | 1 registro legado |
| `asset_movements` | `authorized_by_user_id` | 1 | 0 | 1 | ⚠️ LEGADO | 1 registro legado |
| `asset_movements` | `to_user_id` | 1 | 0 | 1 | ⚠️ LEGADO | 1 registro legado |
| `asset_movements` | `from_user_id` | 0 | - | - | ✅ OK | - |
| `asset_permissions` | `user_id` | 2 | 0 | 2 | ✅ OK (AUTH) | Tabela de autorização |
| `asset_clavicularies` | `created_by` | 1 | 0 | 1 | ✅ OK (AUDIT) | Coluna de auditoria |
| `asset_key_movements` | `user_id` | 0 | - | - | ✅ OK | - |
| `asset_key_movements` | `performed_by_user_id` | 0 | - | - | ✅ OK | - |
| `asset_key_movements` | `authorized_by_user_id` | 0 | - | - | ✅ OK | - |

**Políticas RLS:** Corretas - sem violações.

### 2.3 KPIs

| Tabela | Coluna | Total | Match Profiles | Match Auth | Status |
|--------|--------|-------|----------------|------------|--------|
| `kpi_metrics` | `owner_user_id` | 0 | - | - | ✅ OK |
| `kpi_values` | `created_by` | - | - | - | ⚠️ AUDIT | Coluna de auditoria (auth.users.id) |

**Políticas RLS:** Usam `my_profile_id()` para ownership.

---

## 3. Registros Legados

### 3.1 Identificados

| Tabela | Coluna | Registros | Tipo Armazenado | Tipo Esperado |
|--------|--------|-----------|-----------------|---------------|
| `asset_inventory` | `current_user_id` | 1 | `auth.users.id` | `profiles.id` |
| `asset_movements` | `performed_by_user_id` | 1 | `auth.users.id` | `profiles.id` |
| `asset_movements` | `authorized_by_user_id` | 1 | `auth.users.id` | `profiles.id` |
| `asset_movements` | `to_user_id` | 1 | `auth.users.id` | `profiles.id` |

### 3.2 Recomendação

**NÃO MIGRAR AUTOMATICAMENTE** - Registrar para correção manual ou v3:

```sql
-- Para identificar registros legados:
SELECT id, current_user_id 
FROM asset_inventory 
WHERE current_user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = asset_inventory.current_user_id);
```

---

## 4. Políticas RLS Verificadas

### 4.1 Tickets ✅

| Policy | Tabela | Status |
|--------|--------|--------|
| BU users can create tickets | tickets | ✅ `created_by_user_id = my_profile_id()` |
| Ticket owners can update | tickets | ✅ `my_profile_id()` |
| Participants can create messages | ticket_messages | ✅ `author_user_id = my_profile_id()` |
| Authors can edit messages | ticket_messages | ✅ `author_user_id = my_profile_id()` |
| Participants can upload attachments | ticket_attachments | ✅ `uploaded_by_user_id = my_profile_id()` |
| Manage participants | ticket_participants | ✅ `my_profile_id()` |

### 4.2 Assets ✅

| Policy | Tabela | Status |
|--------|--------|--------|
| BU members can insert assets | asset_inventory | ✅ `user_has_bu_access()` |
| BU members can insert movements | asset_movements | ✅ `user_has_bu_access()` |
| Users can view their permissions | asset_permissions | ✅ `user_id = auth.uid()` (correto - auth table) |

### 4.3 KPIs ✅

| Policy | Tabela | Status |
|--------|--------|--------|
| Team leaders can manage KPIs | kpi_metrics | ✅ `t.leader_user_id = my_profile_id()` |
| KPI owners can insert values | kpi_values | ✅ `km.owner_user_id = my_profile_id()` |

---

## 5. Frontend Verificado

### 5.1 Tickets ✅
- `useTickets.ts:184-185` - Usa `profileId` para `created_by_user_id` e `owner_user_id`
- `useTickets.ts:197` - Usa `profileId` para participant

### 5.2 Assets ✅
- `InventoryFormDialog.tsx:272` - Usa `profileId` para `authorized_by_user_id`
- `useKeys.ts:134-142` - **CORRIGIDO** - Agora usa `profiles.id` para lookup

### 5.3 KPIs ✅
- `CreateKpiDialog.tsx:129` - Usa `values.owner_user_id` do dropdown (já é `profiles.id`)
- `useKpiData.ts:67` - Join correto com `profiles!kpi_metrics_owner_user_id_fkey`

---

## 6. Colunas por Tipo de ID

### 6.1 Colunas de DOMÍNIO (armazenam `profiles.id`)

| Módulo | Tabela | Coluna |
|--------|--------|--------|
| Tickets | `tickets` | `owner_user_id`, `created_by_user_id` |
| Tickets | `ticket_messages` | `author_user_id` |
| Tickets | `ticket_participants` | `user_id` |
| Tickets | `ticket_attachments` | `uploaded_by_user_id` |
| Assets | `asset_inventory` | `current_user_id` |
| Assets | `asset_movements` | `from_user_id`, `to_user_id`, `performed_by_user_id`, `authorized_by_user_id` |
| Assets | `asset_key_movements` | `user_id`, `performed_by_user_id`, `authorized_by_user_id` |
| KPIs | `kpi_metrics` | `owner_user_id` |

### 6.2 Colunas de AUDITORIA (armazenam `auth.users.id`)

| Módulo | Tabela | Coluna | Motivo |
|--------|--------|--------|--------|
| Assets | `asset_permissions` | `user_id` | Tabela de autorização |
| Assets | `asset_clavicularies` | `created_by` | Audit trail |
| KPIs | `kpi_values` | `created_by` | Audit trail |

---

## 7. Resultado

| Área | Status |
|------|--------|
| Tickets RLS | ✅ PASS |
| Tickets Frontend | ✅ PASS |
| Assets RLS | ✅ PASS |
| Assets Frontend | ✅ PASS (corrigido) |
| KPIs RLS | ✅ PASS |
| KPIs Frontend | ✅ PASS |
| Dados Legados | ⚠️ 4 registros (não crítico) |

**Status Geral: ✅ PASS**
