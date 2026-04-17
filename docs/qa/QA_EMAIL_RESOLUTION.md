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

---

## Magic Link Troubleshooting (URL Detonation) — v3.25.0

### Symptoms
User reports one of:
- "Recebi o e-mail mas ao clicar no link dá erro"
- "Failed to fetch" no console
- "Link inválido / expirado" mesmo no primeiro clique
- Login funcionava normalmente até poucos dias atrás e parou de repente

### Diagnostic Flow

**Step 1: Confirm email delivery**
- Check Edge Function logs for `request-magic-link`: search for the user's email
- Verify success log: `[<requestId>] Magic link sent successfully to: <email>`
- Ask user to confirm email arrived (check spam/quarantine)

**Step 2: Identify gateway / domain pattern**
Check the email domain (`@dominio.com.br`). High-risk domains:
- Law firms (`advogados`, `advocacia`, `legal`)
- Accounting firms (`contabilidade`, `contadores`)
- Healthcare (`saude`, `medico`, `hospital`)
- Government (`gov.br`, `mp.br`)
- Banks / financial institutions

These typically run Mimecast, Proofpoint, or Microsoft Defender ATP — all of which detonate URLs.

**Step 3: Verify the symptom matches detonation**
- ✅ Token consumed before user clicks → first real click returns `otp_expired`
- ✅ "Failed to fetch" → indicates CORS/network block OR consumed token (verifyOtp throws fetch error when token already used in some cases)

**Step 4: Apply mitigation**
Add the domain to `URL_DETONATION_DOMAINS` in `supabase/functions/request-magic-link/index.ts`:

```ts
const URL_DETONATION_DOMAINS = [
  "ferrigoloadvogados.com.br",
  "<novo-dominio.com.br>",
];
```

After deploy, the user's next magic link will route to `/auth/confirm` (manual click required) instead of `/auth/callback`.

**Step 5: Validate**
- Ask user to request a new magic link
- Verify the URL in the email points to `/auth/confirm` (not `/auth/callback`)
- User clicks link → sees "Acessar o Hub" button → clicks → redirects to `/auth/callback` → session established

### Verification Checklist

| Check | Status |
|-------|--------|
| Domain added to `URL_DETONATION_DOMAINS` | [ ] |
| Edge function `request-magic-link` redeployed | [ ] |
| New magic link points to `/auth/confirm` | [ ] |
| User successfully authenticated after manual click | [ ] |

### Fallback Diagnostics (if mitigation insufficient)

If user still cannot authenticate after adding domain:
1. Ask user to open link in **incognito/anonymous window** (rules out browser extensions)
2. Ask user to try from a **different network** (e.g., mobile 4G — rules out corporate firewall blocking `*.supabase.co`)
3. Check `AuthCallback.tsx` console log for the specific error category (`network` vs `expired` vs `generic`)
4. If `network` persists across networks: investigate corporate DNS / certificate pinning
5. As a last resort, instruct user's IT to allowlist `*.supabase.co` and the project subdomain

### Reference
- TCR §1.2.1 URL Detonation Mitigation (v3.25.0)
- Memory: `mem://features/auth/url-detonation-mitigation`

