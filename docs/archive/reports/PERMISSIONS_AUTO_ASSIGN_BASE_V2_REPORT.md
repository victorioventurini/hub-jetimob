# Permissions V2: Auto-Assign Base Template Report

**Date:** 2026-01-08  
**Version:** 1.0.0  
**Author:** System  
**TCR Version:** v2.12.0  
**Status:** ✅ **COMPLETE**

---

## Executive Summary

Implemented permanent automation to assign `collaborator_base_v2` template when users gain BU membership. This ensures all new users automatically receive base permissions without manual intervention.

---

## Migrations Applied

### 1. Canonical Function

```sql
CREATE OR REPLACE FUNCTION public.ensure_default_v2_template_for_membership(
  p_auth_user_id uuid,
  p_bu_id uuid,
  p_role_in_bu text DEFAULT NULL
) RETURNS void
```

**Features:**
- SECURITY DEFINER (bypasses RLS for system operations)
- Resolves `profile_id` from `auth.users.id`
- Assigns `collaborator_base_v2` template
- Idempotent via `ON CONFLICT DO NOTHING`
- Updates `permission_migrations` tracking
- Safe search_path setting

### 2. Trigger Function

```sql
CREATE OR REPLACE FUNCTION public.trg_handle_membership_created_assign_v2()
RETURNS trigger
```

**Wrapper that:**
- Extracts `NEW.user_id`, `NEW.bu_id`, `NEW.role_in_bu`
- Calls canonical function

### 3. Trigger

```sql
CREATE TRIGGER trg_auto_assign_base_template_v2
AFTER INSERT ON public.bu_user_memberships
FOR EACH ROW
EXECUTE FUNCTION public.trg_handle_membership_created_assign_v2();
```

**Status:** ✅ ENABLED

---

## Backfill Results

| Metric | Count |
|--------|-------|
| Total memberships | 5 |
| Memberships with V2 (before) | 3 |
| Memberships without V2 (before) | 2 |
| Backfilled | 2 |
| Memberships without V2 (after) | **0** |

**All existing memberships now have base V2 template assigned.**

---

## Current State

### V2 Assignments After Migration

| Profile ID | Role | Template | Migration Status |
|------------|------|----------|------------------|
| 110f72b1-... | collaborator | collaborator_base_v2 | migrated |
| 110f72b1-... | collaborator | okrs_view_v2 | migrated |
| 110f72b1-... | collaborator | okrs_operate_v2 | migrated |
| 110f72b1-... | collaborator | kpis_view_v2 | migrated |
| 110f72b1-... | collaborator | kpis_operate_v2 | migrated |
| 110f72b1-... | collaborator | tickets_operate_v2 | migrated |
| f375b494-... | admin | collaborator_base_v2 | migrated |
| f8afaa82-... | admin | collaborator_base_v2 | migrated |

---

## Identity Convention Compliance

| Column | Table | ID Type | Status |
|--------|-------|---------|--------|
| `bu_user_memberships.user_id` | Input | `auth.users.id` | ✅ Correct |
| `bu_user_permission_templates_v2.user_id` | Output | `profiles.id` | ✅ Correct |
| `permission_migrations.user_id` | Tracking | `profiles.id` | ✅ Correct |

**Conversion:** Function resolves `profiles.id` from `auth.users.id` via `profiles.user_id` FK.

---

## Security

| Aspect | Status |
|--------|--------|
| Function is SECURITY DEFINER | ✅ |
| search_path set to 'public' | ✅ |
| Not exposed as RPC | ✅ |
| Only callable via trigger | ✅ |
| Bypasses RLS for system ops | ✅ |

---

## QA Status

| Test | Status |
|------|--------|
| New user → membership → template | ✅ PASS |
| Existing user → new membership | ✅ PASS |
| Idempotency (no duplicates) | ✅ PASS |
| permission_migrations tracking | ✅ PASS |
| get_my_permissions() works | ✅ PASS |
| Edge: profile not found | ✅ PASS |
| Edge: template not found | ✅ PASS |

**Overall QA:** ✅ **PASS**

See: `docs/qa/QA_AUTO_ASSIGN_BASE_V2.md`

---

## Idempotency & Rollback

### Idempotency

- `ON CONFLICT DO NOTHING` prevents duplicate template assignments
- `ON CONFLICT (...) DO UPDATE` for migration tracking upserts
- Safe to run backfill multiple times

### Rollback (if needed)

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS trg_auto_assign_base_template_v2 ON public.bu_user_memberships;

-- Remove functions
DROP FUNCTION IF EXISTS public.trg_handle_membership_created_assign_v2();
DROP FUNCTION IF EXISTS public.ensure_default_v2_template_for_membership(uuid, uuid, text);

-- Note: Assigned templates and migration records remain (no data loss)
```

---

## Future Enhancements

1. **External Role Support**
   - When `app_role` enum gains 'external' value
   - Create `external_contact_base_v2` template
   - Function already has logic placeholder

2. **Reactivation Trigger**
   - If membership has `is_active` or `deleted_at` column
   - Add AFTER UPDATE trigger for reactivation scenarios

3. **Role-Specific Templates**
   - Assign admin/super_admin specific templates
   - Extend function logic based on `p_role_in_bu`

---

## Files Created

- `docs/qa/QA_AUTO_ASSIGN_BASE_V2.md` - QA test scenarios
- `docs/PERMISSIONS_AUTO_ASSIGN_BASE_V2_REPORT.md` - This report

---

## Conclusion

✅ **Automation successfully implemented and verified.**

All new users gaining BU membership will automatically receive `collaborator_base_v2` template, ensuring they have base permissions from day one without manual intervention.
