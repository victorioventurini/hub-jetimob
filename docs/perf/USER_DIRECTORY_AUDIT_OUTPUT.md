# User Directory Audit Output

> **Data:** 2026-01-09  
> **Comando:** `npx tsx scripts/audit-user-directory.ts`

---

## Resultado: ✅ PASS

```
========================================
  USER DIRECTORY GLOBAL AUDIT REPORT
========================================

Scanning for User Directory violations...

  Scanning src/hooks...
  Scanning src/components...
  Scanning src/modules...
  Scanning supabase/migrations...

✅ No violations found!

All user directory queries follow the canonical pattern:
  - Using v_bu_active_profiles view
  - Using useBuUsersDirectory hook
  - Memberships used only for auth validation
```

---

## Findings Iniciais (Antes das Correções)

| Arquivo | Linha | Severity | Problema |
|---------|-------|----------|----------|
| `src/hooks/useHomeData.ts` | 52-56 | ERROR | `.eq("employment_status", "active")` em profiles |
| `src/hooks/useHomeData.ts` | 158-160 | ERROR | `.eq("employment_status", "active")` em profiles |
| `src/hooks/useHomeData.ts` | 225-227 | ERROR | `.eq("employment_status", "active")` em profiles |
| `src/hooks/useHomeData.ts` | 289 | ERROR | `.eq("employment_status", "active")` em profiles |
| `src/pages/settings/SettingsHome.tsx` | 153-158 | WARNING | Contagem com filtro active |
| `src/components/users/JetimoberDialog.tsx` | 123-128 | WARNING | `.neq("employment_status", "terminated")` |
| `supabase/functions/global-search/index.ts` | 82-89 | ERROR | `.eq("employment_status", "active")` |
| `src/hooks/useNotificationAdmin.ts` | 315-332 | ERROR | Memberships first, then profiles |
| `src/modules/assets/components/settings/InventoryImportDialog.tsx` | 202-220 | ERROR | Memberships para resolver usuários |
| `src/modules/okrs/components/initiatives/InitiativeDialog.tsx` | 46 | WARNING | useProfilesList deprecated |
| `src/modules/teams/components/AddSquadMemberDialog.tsx` | 39 | WARNING | useProfilesList deprecated |

**Total: 11 findings (7 ERROR, 4 WARNING)**

---

## Arquivos Corrigidos

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useHomeData.ts` | Migrado para `v_bu_active_profiles` |
| `src/pages/settings/SettingsHome.tsx` | Migrado para `v_bu_active_profiles` |
| `src/components/users/JetimoberDialog.tsx` | Migrado para `v_bu_active_profiles` |
| `supabase/functions/global-search/index.ts` | Migrado para `v_bu_active_profiles` |
| `src/hooks/useNotificationAdmin.ts` | Removido membership query, usa view |
| `src/modules/assets/components/settings/InventoryImportDialog.tsx` | Migrado para `v_bu_active_profiles` |
| `src/modules/okrs/components/initiatives/InitiativeDialog.tsx` | Migrado para `useBuUsersDirectory` |
| `src/modules/teams/components/AddSquadMemberDialog.tsx` | Migrado para `useBuUsersDirectory` |

---

## Resultado Final

```
✅ 0 violations found
```

**Status:** PASS
