# QA: Email Resolution for Notifications

## Objective
Verify that email notifications use the correct email field (`work_email`) and that the canonical resolver handles all edge cases.

## Test Scenarios

### Scenario 1: User with work_email
**Preconditions:**
- Profile exists with `work_email` filled

**Steps:**
1. Go to `/settings/notifications?tab=test`
2. Select user with work_email
3. Select "Email" channel
4. Click "Enviar teste"

**Expected Result:**
- ✅ Toast de sucesso
- ✅ Outbox shows `status: sent`
- ✅ Email received at work_email address

**Status:** [ ] PASS / [ ] FAIL

---

### Scenario 2: User without work_email (auth.users.email fallback)
**Preconditions:**
- Profile exists but `work_email` is NULL
- User has email in `auth.users.email`

**Steps:**
1. Go to `/settings/notifications?tab=test`
2. Select user without work_email
3. Select "Email" channel
4. Click "Enviar teste"

**Expected Result:**
- ✅ Toast de sucesso (fallback usado)
- ✅ Outbox shows `status: sent`
- ✅ Email received at auth.users.email address

**Status:** [ ] PASS / [ ] FAIL

---

### Scenario 3: User without any email
**Preconditions:**
- Profile exists but `work_email` is NULL
- User has no email in `auth.users` (rare case)

**Steps:**
1. Go to `/settings/notifications?tab=test`
2. Select user without any email
3. Select "Email" channel
4. Click "Enviar teste"

**Expected Result:**
- ⚠️ Outbox shows `status: failed`
- ⚠️ `last_error: "NO_WORK_EMAIL: Recipient has no work_email and no auth email fallback"`
- ⚠️ Toast may show success initially (async processing), but outbox reflects failure

**Status:** [ ] PASS / [ ] FAIL

---

### Scenario 4: Audit script passes
**Steps:**
1. Run `npx tsx scripts/audit-profiles-email.ts`

**Expected Result:**
- ✅ Exit code 0
- ✅ "AUDIT PASSED: No critical issues"
- ✅ No findings of `profiles.email` usage

**Status:** [ ] PASS / [ ] FAIL

---

### Scenario 5: Edge function uses canonical resolver
**Steps:**
1. Review `supabase/functions/process-notification-outbox/index.ts`
2. Verify it calls `resolve_notification_recipient` RPC

**Expected Result:**
- ✅ Uses `supabase.rpc("resolve_notification_recipient", ...)`
- ✅ Does NOT directly query `profiles.email`
- ✅ Only uses `work_email` from resolver response

**Status:** [ ] PASS / [ ] FAIL

---

## Summary

| Scenario | Status |
|----------|--------|
| User with work_email | [ ] |
| Fallback to auth email | [ ] |
| No email (fails gracefully) | [ ] |
| Audit script passes | [ ] |
| Edge function uses resolver | [ ] |

**Overall:** [ ] PASS / [ ] FAIL

**Tester:** _______________
**Date:** _______________
