# Profile Lookup System Fix Report

**Date:** 2026-01-08  
**Issue:** Inconsistent profile lookups using `user_id` instead of `id`  
**Status:** ✅ FIXED

---

## Summary

Fixed systematic issues where profile lookups were incorrectly using `profiles.user_id` instead of `profiles.id` when resolving domain columns that store `profiles.id`.

---

## Root Cause

The codebase has two distinct identifiers:
- **`profiles.user_id`** → Maps to `auth.users.id` (authentication identity)
- **`profiles.id`** → Used for domain logic (ownership, assignments, etc.)

Domain columns like `current_user_id`, `owner_user_id`, `from_user_id` store `profiles.id`, but some queries were incorrectly looking up profiles by `user_id`.

---

## Files Changed

### Assets Module

#### `src/modules/assets/hooks/useInventory.ts`

| Function | Before | After |
|----------|--------|-------|
| `items` query (bulk) | `.in('user_id', userIds)` | `.in('id', profileIds)` |
| `getItem` (by UUID) | No location/user loading | Full loading with `.in('id', profileIds)` |
| `getItemByCode` | `.in('user_id', userIds)` | `.in('id', profileIds)` |
| `getMovements` | `.in('user_id', userIds)` | `.in('id', profileIds)` |

**Changes:**
1. Renamed `userIds` variable to `profileIds` for clarity
2. Changed select from `user_id, first_name...` to `id, first_name...`
3. Changed `.in('user_id', ...)` to `.in('id', ...)`
4. Changed Map key from `p.user_id` to `p.id`
5. Added comments referencing `docs/IDENTITY_CONVENTION.md`

#### `src/modules/assets/components/inventory/InventoryDetailView.tsx`

- Added `LoanStatusCard` component to display active loan details
- Shows: holder name, loan date, duration, due date, authorized by
- Visual indicator for overdue loans

---

## New Scripts

### `scripts/audit-profile-lookup.ts`

New audit script to detect incorrect profile lookups:

```bash
npm run audit:profile-lookup
```

**Detects:**
- `.in('user_id', profileIds)` patterns
- Maps keyed by `user_id` when resolving domain columns
- Variable naming issues (`userIds` from domain columns)

**Output:**
- Console report with findings
- Markdown report at `docs/perf/PROFILE_LOOKUP_AUDIT.md`

---

## Modules Verified

| Module | Status | Notes |
|--------|--------|-------|
| Assets/Inventory | ✅ Fixed | Full DTO unification |
| Assets/Movements | ✅ Fixed | All user references corrected |
| Assets/Permissions | ✅ Correct | Uses `auth.users.id` intentionally |
| OKRs | ✅ Correct | Uses FK joins properly |
| Tickets | ✅ Correct | Uses `profileId` from `useIdentity()` |
| KPIs | ✅ Correct | Uses FK joins properly |
| Notifications | ✅ Correct | Uses `auth.users.id` intentionally |

---

## Identity Convention Reference

### Domain Columns (store `profiles.id`)

| Column | Tables |
|--------|--------|
| `owner_user_id` | okr_*, kpi_metrics, tickets |
| `leader_user_id` | teams, squads |
| `current_user_id` | asset_inventory, asset_keyrings |
| `from_user_id` | asset_movements, asset_key_movements |
| `to_user_id` | asset_movements, asset_key_movements |
| `performed_by_user_id` | asset_*, ticket_messages |
| `authorized_by_user_id` | asset_movements |
| `created_by_user_id` | tickets |

### Infrastructure Columns (store `auth.users.id`)

| Column | Tables |
|--------|--------|
| `user_id` | bu_user_memberships, user_roles, profiles |
| `actor_id` | notifications |

---

## QA Checklist

See: `docs/qa/QA_PROFILE_ID_LOOKUP_FIX.md`

---

## Prevention

1. **Audit Scripts:** Run `npm run audit:profile-lookup` in CI/pre-commit
2. **Naming Convention:** Use `profileIds` for domain IDs, `authUserIds` for auth IDs
3. **Documentation:** Reference `docs/IDENTITY_CONVENTION.md` in comments
4. **Code Review:** Check profile lookups match column FK definitions

---

## Related Documentation

- `docs/IDENTITY_CONVENTION.md` - Complete identity mapping
- `docs/engineering/DEVELOPMENT_STANDARDS.md` - Development guidelines
- `scripts/audit-identity-usage.ts` - Existing identity audit script
