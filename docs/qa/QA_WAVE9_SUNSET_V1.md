# QA - Wave 9: Final V1 Sunset

> **Data:** 2026-01-08  
> **Status:** ✅ APROVADO

## Objetivo

Validar que o sistema V1 de permissões foi completamente removido e o V2 é a única fonte de verdade.

---

## Cenários de Teste

### 1. Database - Tabelas V1 Removidas

| Verificação | Query | Resultado Esperado | Status |
|-------------|-------|-------------------|--------|
| `permission_groups` não existe | `SELECT table_name FROM information_schema.tables WHERE table_name = 'permission_groups'` | 0 rows | ✅ PASS |
| `permission_group_permissions` não existe | `SELECT table_name FROM information_schema.tables WHERE table_name = 'permission_group_permissions'` | 0 rows | ✅ PASS |
| `bu_user_permission_groups` não existe | `SELECT table_name FROM information_schema.tables WHERE table_name = 'bu_user_permission_groups'` | 0 rows | ✅ PASS |
| `bu_permission_group_configs` não existe | `SELECT table_name FROM information_schema.tables WHERE table_name = 'bu_permission_group_configs'` | 0 rows | ✅ PASS |
| `permission_key_aliases` não existe | `SELECT table_name FROM information_schema.tables WHERE table_name = 'permission_key_aliases'` | 0 rows | ✅ PASS |

### 2. Database - Funções V1/Legacy Removidas

| Verificação | Query | Resultado Esperado | Status |
|-------------|-------|-------------------|--------|
| `resolve_permission_key` não existe | `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'resolve_permission_key'` | 0 rows | ✅ PASS |
| `log_legacy_key_usage` não existe | `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'log_legacy_key_usage'` | 0 rows | ✅ PASS |
| `block_v1_writes` não existe | `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'block_v1_writes'` | 0 rows | ✅ PASS |

### 3. Guardrail View - Todos Usuários com V2

| Verificação | Query | Resultado Esperado | Status |
|-------------|-------|-------------------|--------|
| Nenhum usuário sem V2 templates | `SELECT COUNT(*) FROM users_without_v2_permissions` | 0 | ✅ PASS |

### 4. Frontend - Referências V1 Removidas

| Verificação | Arquivo | Status |
|-------------|---------|--------|
| Hook `usePermissionAliases` removido | `usePermissionsV2.ts` | ✅ PASS |
| Componente `AliasesTab` removido | `components/AliasesTab.tsx` | ✅ PASS |
| Tab "Aliases" removida da UI | `GlobalPermissionsPage.tsx` | ✅ PASS |
| Tipo `template_v1` removido de `EffectivePermission.source` | `types.ts` | ✅ PASS |
| Export `usePermissionAliases` removido | `index.ts` | ✅ PASS |

### 5. Sistema V2 Operacional

| Verificação | Valor | Status |
|-------------|-------|--------|
| Templates V2 | 27 | ✅ PASS |
| Assignments V2 | 10 | ✅ PASS |
| Total Memberships | 5 | ✅ PASS |
| Permission Catalog Keys | 143 | ✅ PASS |

### 6. Funções V2-Only

| Função | Descrição | Status |
|--------|-----------|--------|
| `get_my_permissions(uuid)` | Retorna permissões V2-only, sem aliases | ✅ PASS |
| `get_effective_permissions_v2(uuid, uuid)` | Retorna permissões efetivas V2-only | ✅ PASS |

### 7. Automação Auto-Assign

| Verificação | Status |
|-------------|--------|
| Trigger `trg_auto_assign_base_template_v2` existe | ✅ PASS |
| Novos memberships recebem `collaborator_base_v2` automaticamente | ✅ PASS |

---

## Resultado Final

| Área | Testes | Pass | Fail |
|------|--------|------|------|
| Database Tables | 5 | 5 | 0 |
| Database Functions | 3 | 3 | 0 |
| Guardrail View | 1 | 1 | 0 |
| Frontend | 5 | 5 | 0 |
| V2 System | 4 | 4 | 0 |
| V2 Functions | 2 | 2 | 0 |
| Automation | 2 | 2 | 0 |
| **TOTAL** | **22** | **22** | **0** |

---

## Conclusão

**Wave 9 APROVADA** - Sistema V1 completamente descomissionado. V2 é a única fonte de verdade para permissões.
