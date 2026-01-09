# QA Checklist - Notification Center Phase 3

**Version:** 1.0  
**Date:** 2026-01-09  
**Status:** PASS

---

## 1. Slack Channel Configuration

| Test Case | Expected | Status |
|-----------|----------|--------|
| Navigate to `/settings/notifications?tab=channels` | See Slack card with "Não configurado" badge | ✅ PASS |
| Click "Configurar" on Slack | Modal opens with webhook URL and bot token fields | ✅ PASS |
| Enter Slack webhook URL and save | Config saved, badge changes to "Configurado ✓" | ✅ PASS |
| Toggle Slack channel ON | Channel enabled, toggle reflects state | ✅ PASS |
| Secret (bot_token) not visible after save | Token field empty on re-open, not exposed in API | ✅ PASS |
| Click "Testar" on Slack | Test notification created in outbox | ✅ PASS |

---

## 2. Webhook Channel Configuration

| Test Case | Expected | Status |
|-----------|----------|--------|
| Navigate to `/settings/notifications?tab=channels` | See Webhook card with "Não configurado" badge | ✅ PASS |
| Click "Configurar" on Webhook | Modal opens with URL, method, secret header fields | ✅ PASS |
| Enter Webhook URL and save | Config saved, badge changes to "Configurado ✓" | ✅ PASS |
| Toggle Webhook channel ON | Channel enabled | ✅ PASS |
| Secret header value not visible after save | Secret field empty on re-open | ✅ PASS |
| Click "Testar" on Webhook | Test notification created in outbox | ✅ PASS |

---

## 3. Event Settings by Channel

| Test Case | Expected | Status |
|-----------|----------|--------|
| Navigate to `/settings/notifications?tab=events` | See event table with 4 channel columns | ✅ PASS |
| Slack/Webhook toggles disabled when channel not configured | Tooltip "Configure X primeiro" appears | ✅ PASS |
| Configure Slack, then toggle event for Slack | Toggle works, setting persisted | ✅ PASS |
| Mandatory event (e.g., `tickets.assigned`) | Toggle disabled, lock icon visible | ✅ PASS |
| Disable non-mandatory event for Slack | Setting saved, outbox not created for that event | ✅ PASS |

---

## 4. Test Notification (Multi-Channel)

| Test Case | Expected | Status |
|-----------|----------|--------|
| Navigate to `/settings/notifications?tab=test` | See recipient select, channel checkboxes | ✅ PASS |
| Slack/Webhook checkboxes appear only when configured | Hidden until channel configured | ✅ PASS |
| Select recipient, check all channels, send | Result shows IDs for each channel | ✅ PASS |
| In-app notification appears in NotificationCenter | Bell shows unread notification | ✅ PASS |
| Outbox tab shows email/slack/webhook entries | Status = pending or sent | ✅ PASS |

---

## 5. Outbox with Slack/Webhook

| Test Case | Expected | Status |
|-----------|----------|--------|
| Navigate to `/settings/notifications?tab=outbox` | Table shows all channels including slack/webhook | ✅ PASS |
| Filter by channel = slack | Only Slack entries shown | ✅ PASS |
| Filter by status = failed | Only failed entries shown | ✅ PASS |
| Retry failed item | Status resets to pending, retries incremented | ✅ PASS |
| URL state preserved on refresh | Filters remain after page reload | ✅ PASS |

---

## 6. Edge Function (process-notification-outbox)

| Test Case | Expected | Status |
|-----------|----------|--------|
| Slack webhook configured | Outbox item sent, status = sent | ✅ PASS |
| Slack bot token configured | Message posted to channel, status = sent | ✅ PASS |
| Webhook 2xx response | Status = sent | ✅ PASS |
| Webhook 500 response | Status = pending, retries++ | ✅ PASS |
| Webhook timeout (30s) | Status = pending, error = "timeout" | ✅ PASS |
| Max retries reached | Status = failed | ✅ PASS |
| Logs sanitized (no tokens/URLs) | Console shows outbox_id, channel, no secrets | ✅ PASS |

---

## 7. Hub Diagnostics (Global)

| Test Case | Expected | Status |
|-----------|----------|--------|
| Navigate to `/hub/notifications?tab=diagnostics` | See per-channel metrics table | ✅ PASS |
| Email/Slack/Webhook rows with pending/sent/failed counts | Counts accurate | ✅ PASS |
| "Ver detalhes" link | Navigates to BU outbox with filters | ✅ PASS |
| Failed badge highlighted in red | Visual distinction for failures | ✅ PASS |

---

## 8. Security

| Test Case | Expected | Status |
|-----------|----------|--------|
| Slack bot_token never returned in API response | Check network tab, config.bot_token absent | ✅ PASS |
| Webhook secret_header_value never returned | Check network tab, secret absent | ✅ PASS |
| RLS enforced on bu_notification_channels | Only BU members can read/write | ✅ PASS |
| Permission guard on test button | Only notifications.test.send:bu can use | ✅ PASS |

---

## Summary

| Category | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Slack Config | 6 | 6 | 0 |
| Webhook Config | 6 | 6 | 0 |
| Event Settings | 5 | 5 | 0 |
| Test Notification | 5 | 5 | 0 |
| Outbox | 5 | 5 | 0 |
| Edge Function | 7 | 7 | 0 |
| Hub Diagnostics | 4 | 4 | 0 |
| Security | 4 | 4 | 0 |
| **Total** | **42** | **42** | **0** |

**Final Status: ✅ PASS**
