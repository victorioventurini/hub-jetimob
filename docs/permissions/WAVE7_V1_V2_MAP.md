# Wave 7 — V1 vs V2 Permissions Map

**Data:** 2026-01-08  
**Versão:** 1.0.0

---

## 1. Tabelas V1 (Legado — Read-Only desde Wave 7)

| Tabela | Descrição | Uso Atual | Status Wave 7 |
|--------|-----------|-----------|---------------|
| `permission_groups` | Templates globais v1 | READ | 🔒 Read-Only |
| `permission_group_permissions` | Permissões de cada template v1 | READ | 🔒 Read-Only |
| `bu_permission_group_configs` | Habilitação de groups por BU | READ/WRITE | 🔒 Read-Only |
| `bu_user_permission_groups` | Atribuição de groups a usuários | READ/WRITE | 🔒 Read-Only |

## 2. Tabelas V2 (Canônicas — Wave 6+)

| Tabela | Descrição | Uso Atual | Status Wave 7 |
|--------|-----------|-----------|---------------|
| `permission_key_aliases` | Mapeamento old_key → canonical_key | READ/WRITE | ✅ Ativo |
| `permission_templates_v2` | Templates organizados por módulo/surface | READ/WRITE | ✅ Ativo |
| `permission_template_items_v2` | Permission keys de cada template v2 | READ/WRITE | ✅ Ativo |
| `bu_user_permission_templates_v2` | Atribuição de templates v2 a usuários | READ/WRITE | ✅ Ativo |

## 3. Tabelas Compartilhadas

| Tabela | Descrição | Uso | Notas |
|--------|-----------|-----|-------|
| `permission_catalog` | Catálogo de permission keys | READ/WRITE | Continua ativo, keys resolvidas via aliases |
| `bu_user_permission_overrides` | Overrides diretos por usuário | READ/WRITE | Independente de v1/v2 |

## 4. Hooks Frontend

### V1 Hooks (Deprecados para escrita)

| Hook | Arquivo | Uso | Wave 7 |
|------|---------|-----|--------|
| `usePermissionGroups` | `usePermissionGroups.ts` | READ | ⚠️ createGroup/updateGroup bloqueados |
| `useGroupPermissions` | `usePermissionGroups.ts` | READ | ⚠️ setGroupPermissions bloqueado |
| `useBuGroupConfigs` | `useBuPermissions.ts` | READ | ⚠️ toggleGroupEnabled bloqueado |
| `useBuUserGroups` | `useBuPermissions.ts` | READ | ⚠️ setUserGroups bloqueado |

### V2 Hooks (Ativos)

| Hook | Arquivo | Uso |
|------|---------|-----|
| `usePermissionAliases` | `usePermissionsV2.ts` | READ/WRITE |
| `usePermissionTemplatesV2` | `usePermissionsV2.ts` | READ/WRITE |
| `useTemplateItemsV2` | `usePermissionsV2.ts` | READ/WRITE |
| `useUserTemplatesV2` | `usePermissionsV2.ts` | READ/WRITE |
| `useEffectivePermissionsPreview` | `usePermissionsV2.ts` | READ |

## 5. Páginas UI

| Path | Componente | V1 | V2 | Wave 7 |
|------|------------|----|----|--------|
| `/settings/permissions` | GlobalPermissionsPage | ⚠️ Read-Only | ✅ Edição | Tab "groups" apenas leitura |
| `/settings/permissions?tab=templates` | GroupsSection | ⚠️ Read-Only | — | Sem ações de criar/editar |
| `/settings/permissions?tab=templates-v2` | TemplatesV2Tab | — | ✅ | Ativo |
| `/hub/permissions` | BuPermissionsPage | ⚠️ Apenas exibição | ✅ Edição | Sheet V2 ativo |
| `/hub/permissions` (sheet) | UserPermissionsV2Sheet | Exibe v1 read-only | ✅ Edição | Migração via V2 |

## 6. Funções RPC

| Função | Versão | Descrição | Status |
|--------|--------|-----------|--------|
| `resolve_permission_key(p_key)` | V2 | Resolve alias para canonical | ✅ Ativo |
| `has_permission(...)` | Shared | Verifica permissão (suporta aliases) | ✅ Ativo |
| `get_my_permissions(p_bu_id)` | Shared | Retorna keys canônicas do usuário | ✅ Ativo |
| `get_effective_permissions_preview(...)` | V2 | Preview v1/v2/both | ✅ Ativo |

## 7. Fluxo de Compatibilidade

```
┌─────────────────────────────────────────────────────────────────┐
│                        has_permission(key)                       │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│               resolve_permission_key(key)                        │
│         (old_key → canonical_key via aliases)                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Verificar em V1 (bu_user_permission_groups)        │
│                          OU                                      │
│              Verificar em V2 (bu_user_permission_templates_v2)  │
│                          OU                                      │
│              Verificar admin/super_admin                         │
└─────────────────────────────────────────────────────────────────┘
```

## 8. Critérios de Migração Completa

1. **Por Usuário:**
   - Tem templates V2 atribuídos
   - Preview mode='both' mostra permissões equivalentes ou superiores

2. **Por BU:**
   - 100% usuários internos com V2
   - Externos com `external_contact_base_v2`

3. **Global (Wave 8):**
   - Zero escrita em tabelas V1 por 30 dias
   - Aliases com sunset_at definido
   - Pronto para DROP de tabelas V1

---

*Documento gerado para Wave 7: Sunset V1*
