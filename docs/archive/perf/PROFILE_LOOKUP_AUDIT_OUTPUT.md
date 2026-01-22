# Profile Lookup Audit Output
Generated: 2026-01-08T12:00:00Z

## Summary
- Files scanned: ~200+
- Issues found: 0 CRITICAL

## Result: ✅ PASS

No profile lookup violations found!

All profile lookups correctly use:
- `profiles.id` for domain column resolution
- `profiles.user_id` only for auth user conversion

---

## Scan Details

### Files Verified as Correct

| File | Pattern | Status |
|------|---------|--------|
| `src/modules/assets/hooks/useInventory.ts` | `.in('id', profileIds)` | ✅ Correct |
| `src/modules/assets/hooks/useKeys.ts` | `.in('id', profileIds)` | ✅ Correct |
| `src/modules/okrs/hooks/useKrHistory.ts` | `.in('id', userIds)` | ✅ Correct |
| `src/hooks/useAuth.tsx` | `.eq('user_id', userId)` for auth→profile | ✅ Correct (auth conversion) |
| `src/pages/Profile.tsx` | `.eq('user_id', user.id)` for auth→profile | ✅ Correct (auth conversion) |
| `src/components/notifications/NotificationCenter.tsx` | `.in('user_id', actorIds)` | ✅ Correct (actor_id = auth.users.id) |

### Documented Exceptions (Tables using auth.users.id)

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

## Convention Reference

Domain columns that store `profiles.id`:

- `owner_user_id`
- `leader_user_id`
- `current_user_id`
- `assigned_user_id`
- `cancelled_by`
- `from_user_id`
- `to_user_id`
- `performed_by_user_id`
- `authorized_by_user_id`
- `mentioned_user_id`
- `author_user_id`
- `created_by_user_id`
- `created_by`
- `updated_by`

See: [docs/IDENTITY_CONVENTION.md](../IDENTITY_CONVENTION.md)
