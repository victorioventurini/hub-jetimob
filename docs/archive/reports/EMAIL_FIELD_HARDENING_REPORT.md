# Email Field Hardening Report

**Date:** 2026-01-09
**Version:** 1.0.0
**Status:** ✅ COMPLETE

## Executive Summary

This report documents the hardening of email field resolution for notifications, preventing the recurring bug of using `profiles.email` (which does not exist) instead of `profiles.work_email`.

## Problem Statement

The `profiles` table uses `work_email` as the email field, but code was incorrectly referencing `profiles.email`, causing:
- Email notifications failing with "User email not found"
- FK violations when joining incorrectly
- Silent failures in notification delivery

## Solution Implemented

### 1. Canonical Resolver Functions (SQL)

Created two SECURITY DEFINER functions:

#### `resolve_work_email(p_auth_user_id uuid) RETURNS text`
- Returns `profiles.work_email` for the given auth user ID
- Fallback: `auth.users.email` if work_email is NULL
- Returns NULL if neither exists

#### `resolve_notification_recipient(p_auth_user_id uuid) RETURNS jsonb`
- Returns complete recipient info:
  ```json
  {
    "profile_id": "uuid",
    "display_name": "string",
    "work_email": "string|null",
    "has_profile": "boolean"
  }
  ```
- Single source of truth for all notification recipient resolution

### 2. Edge Function Refactoring

**File:** `supabase/functions/process-notification-outbox/index.ts`

**Before:**
```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("email, display_name")  // ❌ email does not exist
  .eq("user_id", user_id)
```

**After:**
```typescript
const { data: recipientData } = await supabase.rpc(
  "resolve_notification_recipient",
  { p_auth_user_id: user_id }
);
// ✅ Uses canonical resolver with fallback
```

### 3. Audit Script

**File:** `scripts/audit-profiles-email.ts`

Detects:
- `profiles.email` or `profile.email` property access
- SQL queries selecting `email` from profiles
- TypeScript interfaces with incorrect email field

**Usage:**
```bash
npx tsx scripts/audit-profiles-email.ts
```

**Exit codes:**
- `0` = No issues
- `1` = Critical issues found

### 4. Documentation Updates

**DEVELOPMENT_STANDARDS.md** updated with:
- Anti-pattern: `profiles.email` is PROHIBITED
- Canonical rule: Always use `work_email` or resolver RPC
- Audit script added to mandatory checks

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/xxx_email_resolvers.sql` | Created resolver functions |
| `supabase/functions/process-notification-outbox/index.ts` | Refactored to use resolver |
| `scripts/audit-profiles-email.ts` | Created audit script |
| `docs/qa/QA_EMAIL_RESOLUTION.md` | Created QA scenarios |
| `DEVELOPMENT_STANDARDS.md` | Added convention documentation |

## Canonical Rules

| Field | Table | Usage |
|-------|-------|-------|
| `work_email` | profiles | Primary email for notifications |
| `email` | auth.users | Fallback only (via resolver) |
| ~~`email`~~ | ~~profiles~~ | **DOES NOT EXIST** |

## Resolver Usage

```typescript
// Edge Function / Backend
const { data } = await supabase.rpc("resolve_notification_recipient", {
  p_auth_user_id: authUserId
});
const email = data?.work_email;

// Simple email only
const { data: email } = await supabase.rpc("resolve_work_email", {
  p_auth_user_id: authUserId
});
```

## Verification

- [x] Edge function uses canonical resolver
- [x] Audit script created and passing
- [x] QA scenarios documented
- [x] DEVELOPMENT_STANDARDS updated
- [x] Test notification sent successfully

## QA Status

| Test | Result |
|------|--------|
| User with work_email | ✅ PASS |
| Fallback to auth email | ✅ PASS |
| No email (fails gracefully) | ✅ PASS |
| Audit script passes | ✅ PASS |

**Overall: ✅ PASS**
