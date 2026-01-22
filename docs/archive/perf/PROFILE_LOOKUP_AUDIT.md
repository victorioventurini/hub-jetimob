# Profile Lookup Audit Report
Generated: 2026-01-08

## Summary
- Files scanned: Pending first run
- Issues found: Pending first run

## How to Run
```bash
npx tsx scripts/audit-profile-lookup.ts
```

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

Columns that store `auth.users.id`:
- `profiles.user_id`
- `bu_user_memberships.user_id`
- `user_roles.user_id`

See: [docs/IDENTITY_CONVENTION.md](../IDENTITY_CONVENTION.md)
