# User Directory Global v2 Report

> **Data:** 2026-01-09  
> **Status:** ✅ CONCLUÍDO - Audit retorna 0 findings

---

## Correções Realizadas

| Arquivo | Problema | Correção |
|---------|----------|----------|
| `useHomeData.ts` | `.eq("employment_status", "active")` | Migrado para `v_bu_active_profiles` |
| `SettingsHome.tsx` | Contagem com filtro active | Migrado para view |
| `JetimoberDialog.tsx` | `.neq("employment_status", "terminated")` | Migrado para view |
| `global-search/index.ts` | `.eq("employment_status", "active")` | Migrado para view |
| `useNotificationAdmin.ts` | Memberships first | Migrado para view |
| `InventoryImportDialog.tsx` | Memberships para usuários | Migrado para view |
| `InitiativeDialog.tsx` | useProfilesList deprecated | useBuUsersDirectory |
| `AddSquadMemberDialog.tsx` | useProfilesList deprecated | useBuUsersDirectory |

---

## Componentes Padronizados

- `BuUserSelect` - Seleção de usuário único
- `BuUserMultiSelect` - Seleção de múltiplos
- `useBuUsersDirectory` - Hook canônico

---

## Audit Script

```bash
npx tsx scripts/audit-user-directory.ts
```

**Resultado:** ✅ 0 findings

---

**Status Final:** ✅ CONCLUÍDO
