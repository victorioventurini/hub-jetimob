# QA — URLs absolutas em emails de notificação

**Data:** 2026-04-24
**Escopo:** `supabase/functions/_shared/notification-providers/templates.ts`
**Incidente reportado:** Email de menção (`Uriel Canfield mencionou você`) recebido por `victorio@jetimob.com` com link inline "Ver detalhes" quebrado (href relativo `/go/ticket/...`). Botão CTA "Ver no Hub" funcionava normalmente.

---

## Diagnóstico

### Causa raiz
Triggers SQL (`notify_ticket_mention`, `notify_project_mention`, `notify_*_status_changed`, etc.) gravam `payload.context_url` como **path relativo** (`/go/:entity/:id`) — comportamento correto, alinhado ao SSOT em `src/lib/shareableLinks.ts`.

O `renderTemplate()` em `_shared/notification-providers/templates.ts` fazia substituição literal de `{{context_url}}`, gerando markdown como:
```markdown
[Ver detalhes](/go/ticket/abc-123)
```
Convertido para HTML:
```html
<a href="/go/ticket/abc-123">Ver detalhes</a>
```
Clientes de email (Gmail, Outlook, Apple Mail) **não** resolvem paths relativos no inbox → link quebrado.

### Por que o CTA funcionava
`buildNotificationEmailHtmlFromTemplate` já concatenava `${SITE_URL}${contextUrl}` no botão "Ver no Hub" → URL absoluta → ok.

---

## Mudanças aplicadas

### `supabase/functions/_shared/notification-providers/templates.ts`
- **Adicionado** helper `absolutizeUrl(url)`:
  - Idempotente: retorna inalterado se já absoluto (`/^https?:\/\//i`).
  - Prefixa `SITE_URL` se relativo (garante `/` inicial).
  - Retorna string vazia para null/undefined.
- **Atualizado** `renderTemplate()`: aplica `absolutizeUrl` automaticamente em variáveis cujo nome seja `context_url` ou termine com `_url`.
- **Atualizado** `buildNotificationEmailHtmlFromTemplate()`: usa `absolutizeUrl(contextUrl)` no CTA (idempotente, evita futura duplicação de protocolo).

### TCR — `supabase/functions/_shared/tcr/notifications.ts`
Adicionada seção 8.4 "Convenção de URLs em Templates" documentando o padrão.

### Memória
- Criada: `mem://standards/notifications/email-url-absolutization`.
- Atualizadas: `features/projects/notification-context-standard`, `features/tickets/notification-context-standard` referenciando a regra.

---

## Cenários de validação manual

### Cenário 1 — Menção em ticket
1. Em `/tickets/:id`, criar comentário mencionando `@usuario`.
2. Verificar email recebido pelo mencionado.
3. **Esperado:**
   - Subject: `[BU] {ticket_title} — Você foi mencionado` (ou similar).
   - Botão CTA "Ver no Hub" → `https://hub.jetimob.com/go/ticket/<id>` ✅
   - Link inline "Ver detalhes" no body → `https://hub.jetimob.com/go/ticket/<id>` ✅ (antes era `/go/ticket/<id>` quebrado).

### Cenário 2 — Menção em projeto
1. Em `/projects/:id`, criar comentário mencionando `@usuario`.
2. **Esperado:** mesmo comportamento do Cenário 1, com URL `https://hub.jetimob.com/projects/<id>`.

### Cenário 3 — Mudança de status de projeto
1. Alterar status de um projeto em `/projects/:id`.
2. Owner + watchers + membros recebem email.
3. **Esperado:** todos os links absolutos.

### Cenário 4 — Mudança de status de milestone
1. Alterar status de uma milestone.
2. **Esperado:** links absolutos para `/projects/<project_id>`.

### Cenário 5 — OKR check-in / KPI target
1. Triggers de `okrs.checkin.created`, `kpis.target_reached`, etc.
2. **Esperado:** links absolutos.

### Cenário 6 — Idempotência (anti-regressão)
1. Verificar `notification_outbox.payload->>'context_url'` em registros recentes.
2. **Esperado:** todos relativos (SSOT preservado). Nenhum começando com `https://`.

### Cenário 7 — Slack (anti-regressão)
1. Disparar uma notificação que vá para Slack.
2. **Esperado:** link no Slack continua funcionando (provider Slack já absolutizava por conta própria).

### Cenário 8 — Webhook (anti-regressão)
1. Disparar uma notificação que vá para Webhook configurado.
2. **Esperado:** payload contém `context_url` relativo (consumidor decide como tratar).

---

## Validação automatizada

### `scripts/qa/validate-email-context-urls.sql`
Script SQL idempotente (<1s) que verifica:
1. `notification_outbox` recente (últimos 7 dias) — todos `context_url` são relativos (começam com `/`).
2. Triggers conhecidos (`notify_ticket_mention`, `notify_project_mention`, `notify_*_status_changed`) existem e estão ativos.
3. Templates ativos para `mention.created`, `ticket.*`, `project.*`, `milestone.*`.

Executar: `psql -f scripts/qa/validate-email-context-urls.sql`.

---

## Regressões a observar

- **Magic link emails**: gerenciados por `auth-email-hook` (templates separados em `_shared/email-templates/`), não usam `renderTemplate`. **Não afetados**.
- **Transactional emails**: se houver, usam pipeline próprio. **Não afetados**.
- **In-app notifications**: frontend resolve via react-router. **Não afetados**.

---

## Cobertura automatizada

Script SQL acima cobre o estrutural. Testes Vitest do `templates.ts` em si seriam puro Deno (não roda no jsdom do projeto). Quando o CI ganhar runner Deno dedicado, adicionar `templates.test.ts` cobrindo:
- `absolutizeUrl('/go/x')` → `https://hub.jetimob.com/go/x`
- `absolutizeUrl('https://hub.jetimob.com/x')` → inalterado
- `absolutizeUrl('')` → `''`
- `absolutizeUrl(null)` → `''`
- `renderTemplate('[x]({{context_url}})', { context_url: '/go/x' })` → contém `https://hub.jetimob.com/go/x`
- `renderTemplate('Olá {{user_name}}', { user_name: 'Bob' })` → não-URL não é tocado

Cenários manuais (1-8 acima) cobrem o end-to-end no provider real.
