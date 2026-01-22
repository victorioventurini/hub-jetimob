# Profile Lookup System Fix Report

**Date:** 2026-01-08  
**Issue:** Inconsistent profile lookups using `user_id` instead of `id`  
**Status:** ✅ COMPLETE - 0 CRITICAL FINDINGS

---

## Audit Results

### Before Fix
- Multiple incorrect lookups using `.in('user_id', ...)` for domain columns
- Inconsistent DTO shapes between `getItem` and `getItemByCode`

### After Fix
- **0 CRITICAL findings**
- All domain column lookups use `profiles.id`
- Unified DTO for all asset item queries

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

---

## Modules Verified

| Module | Status | Notes |
|--------|--------|-------|
| Assets/Inventory | ✅ Fixed | Full DTO unification |
| Assets/Movements | ✅ Fixed | All user references corrected |
| Assets/Keys | ✅ Correct | Uses `profiles.id` |
| Assets/Permissions | ✅ Correct | Uses `auth.users.id` intentionally |
| OKRs | ✅ Correct | Uses `profiles.id` joins |
| Tickets | ✅ Correct | Uses `profileId` from `useIdentity()` |
| KPIs | ✅ Correct | Uses FK joins properly |
| Notifications | ✅ Correct | Uses `auth.users.id` intentionally |

---

## Documented Exceptions (auth.users.id Tables)

These tables intentionally store `auth.users.id` and are NOT violations:

| Table | Column | Reason |
|-------|--------|--------|
| `notifications` | `user_id` | Target user (auth identity) |
| `notifications` | `actor_id` | Acting user (auth identity) |
| `bu_user_memberships` | `user_id` | BU membership (auth identity) |
| `user_roles` | `user_id` | Role assignment (auth identity) |
| `audit_logs` | `user_id` | Audit trail (session identity) |
| `profiles` | `user_id` | Link auth→domain |

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

## Audit Script

Run audit anytime:
```bash
npx tsx scripts/audit-profile-lookup.ts
```

---

## QA Results

See: `docs/qa/QA_PROFILE_ID_LOOKUP_FIX.md`

| Area | Status |
|------|--------|
| Assets getItem (UUID) | ✅ PASS |
| Assets getItemByCode | ✅ PASS |
| Assets items list | ✅ PASS |
| Assets movements | ✅ PASS |
| audit:profile-lookup | ✅ PASS |

**Overall:** ✅ PASS

---

## Prevention

1. **Audit Scripts:** Run `npx tsx scripts/audit-profile-lookup.ts` in CI/pre-commit
2. **Naming Convention:** Use `profileIds` for domain IDs, `authUserIds` for auth IDs
3. **Documentation:** Reference `docs/IDENTITY_CONVENTION.md` in comments
4. **Code Review:** Check profile lookups match column FK definitions

---

## Related Documentation

- `docs/IDENTITY_CONVENTION.md` - Complete identity mapping
- `docs/engineering/DEVELOPMENT_STANDARDS.md` - Development guidelines
- `scripts/audit-identity-usage.ts` - Existing identity audit script
- `scripts/audit-profile-lookup.ts` - Profile lookup audit script
