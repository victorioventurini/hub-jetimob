# QA: Auto-Assign Base V2 Template on Membership Creation

**Date:** 2026-01-08  
**Version:** 1.0.0  
**Status:** ✅ PASS

---

## Overview

This QA document validates the automation that assigns `collaborator_base_v2` template to users when they gain BU membership via `bu_user_memberships`.

---

## Test Scenarios

### Scenario 1: New Auth User → Profile → Membership → V2 Assignment

| Step | Expected | Status |
|------|----------|--------|
| 1. Create new auth user | Auth user created in `auth.users` | ✅ |
| 2. `handle_new_user` trigger creates profile | Profile created in `public.profiles` | ✅ |
| 3. Insert into `bu_user_memberships` | Membership created | ✅ |
| 4. Trigger `trg_auto_assign_base_template_v2` fires | Trigger executed | ✅ |
| 5. `collaborator_base_v2` assigned | Entry in `bu_user_permission_templates_v2` | ✅ |
| 6. `permission_migrations` updated | Status = 'migrated' | ✅ |

**Result:** ✅ PASS

---

### Scenario 2: Existing User → New Membership

| Step | Expected | Status |
|------|----------|--------|
| 1. User already has profile | Profile exists | ✅ |
| 2. Insert new `bu_user_memberships` for different BU | Membership created | ✅ |
| 3. Trigger fires | `collaborator_base_v2` assigned for new BU | ✅ |

**Result:** ✅ PASS

---

### Scenario 3: Idempotency - Repeated Insert (ON CONFLICT)

| Step | Expected | Status |
|------|----------|--------|
| 1. User has existing V2 template | Entry exists in `bu_user_permission_templates_v2` | ✅ |
| 2. Manual call to `ensure_default_v2_template_for_membership` | No duplicate created | ✅ |
| 3. Check record count | Still 1 entry (ON CONFLICT DO NOTHING) | ✅ |

**Result:** ✅ PASS

---

### Scenario 4: External Role (Future)

| Condition | Expected | Status |
|-----------|----------|--------|
| `role_in_bu = 'external'` | Would assign `external_contact_base_v2` | ⏳ N/A |
| Current enum | No 'external' role exists | ✅ |
| Function handles gracefully | Falls back to `collaborator_base_v2` | ✅ |

**Result:** ✅ PASS (current implementation correct)

---

### Scenario 5: permission_migrations Tracking

| Step | Expected | Status |
|------|----------|--------|
| 1. New membership created | `permission_migrations` entry created | ✅ |
| 2. Status | `migrated` | ✅ |
| 3. Notes | `auto-assigned collaborator_base_v2 on membership create` | ✅ |
| 4. Existing entry | UPSERT updates, doesn't duplicate | ✅ |

**Result:** ✅ PASS

---

### Scenario 6: get_my_permissions() Returns Permissions

| Step | Expected | Status |
|------|----------|--------|
| 1. User gains membership | Membership created | ✅ |
| 2. Base V2 template assigned | Template in place | ✅ |
| 3. Call `get_my_permissions(p_bu_id)` | Returns permissions from `collaborator_base_v2` | ✅ |

**Result:** ✅ PASS

---

## Edge Cases

### Profile Not Yet Created

| Condition | Behavior | Status |
|-----------|----------|--------|
| Profile doesn't exist when trigger fires | Function returns early (RETURN) | ✅ |
| No error raised | Silent skip, safe behavior | ✅ |

**Result:** ✅ PASS

---

### Template Not Found

| Condition | Behavior | Status |
|-----------|----------|--------|
| `collaborator_base_v2` missing | RAISE WARNING, function returns | ✅ |
| No error that breaks insert | Membership insert succeeds | ✅ |

**Result:** ✅ PASS

---

## Verification Queries

```sql
-- Check trigger is enabled
SELECT t.tgname, p.proname,
       CASE WHEN t.tgenabled = 'O' THEN 'ENABLED' ELSE 'DISABLED' END
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'public.bu_user_memberships'::regclass
AND NOT t.tgisinternal;

-- Check all memberships have V2 template
SELECT COUNT(*) as memberships_without_v2
FROM bu_user_memberships m
WHERE NOT EXISTS (
  SELECT 1 FROM bu_user_permission_templates_v2 t
  JOIN profiles p ON p.id = t.user_id
  WHERE t.bu_id = m.bu_id AND p.user_id = m.user_id
);
-- Expected: 0
```

---

## Summary

| Category | Status |
|----------|--------|
| Function created | ✅ |
| Trigger created | ✅ |
| Trigger enabled | ✅ |
| Backfill complete | ✅ |
| Idempotency verified | ✅ |
| Migration tracking works | ✅ |
| Edge cases handled | ✅ |

**Overall QA Status:** ✅ **PASS**
