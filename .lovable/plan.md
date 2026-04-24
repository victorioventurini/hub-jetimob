# Correção — Links quebrados em emails de notificação

## Contexto

Email de menção (`Uriel Canfield mencionou você`) chegou com link "Ver detalhes" inline quebrado. O CTA "Ver no Hub" funciona porque é concatenado com `SITE_URL` no wrapper HTML, mas o `{{context_url}}` injetado **dentro do markdown do template** vira href relativo (`/go/ticket/...`), que clientes de email (Gmail, Outlook) não resolvem.

## Diagnóstico (pré-checklist canônico revisado)

- **SSOT**: triggers SQL gravam `payload.context_url` como path relativo (`/go/:entity/:id` via `getShareableUrl`). Confirmado em `lib/shareableLinks.ts` e nas migrations de `notify_*`.
- **Provider Slack/Webhook**: já consomem URLs corretamente (Slack monta link absoluto, Webhook entrega payload bruto). **Sem regressão esperada nesses canais.**
- **Provider Email**: `renderTemplate` em `_shared/notification-providers/templates.ts` faz substituição literal de `{{var}}`. Quando o template markdown contém `[Ver detalhes]({{context_url}})`, o resultado é `<a href="/go/ticket/abc">` — quebrado em email.
- **Wrapper `buildNotificationEmailHtmlFromTemplate`**: já concatena `${SITE_URL}${contextUrl}` para o botão CTA, mas assume relativo (vai duplicar `https://` se o input já for absoluto).

## Estratégia

**Absolutizar no ponto de renderização**, mantendo o banco como SSOT de paths relativos. Zero migrations SQL, zero alteração nas ~10 triggers existentes.

## Mudanças

### 1. `supabase/functions/_shared/notification-providers/templates.ts`

- Adicionar helper `absolutizeUrl(url)`:
  - Retorna a própria URL se já for absoluta (`/^https?:\/\//i.test(url)`).
  - Retorna `${SITE_URL}${url}` (com `/` garantido) se relativa.
  - Retorna string vazia para `null/undefined`.
- Atualizar `renderTemplate`: antes de substituir `{{key}}`, se `key` for `context_url` ou terminar em `_url`, aplicar `absolutizeUrl` ao valor.
- Atualizar `buildNotificationEmailHtmlFromTemplate`: usar `absolutizeUrl(contextUrl)` no href do CTA em vez de `${SITE_URL}${contextUrl}` cru (idempotente — não duplica protocolo se já absoluto).

### 2. `supabase/functions/_shared/tcr/notifications.ts`

Adicionar seção 8.4 documentando o padrão de URL absolutization no canal email (SSOT relativo no banco, absolutização no provider).

### 3. Memória técnica

- Criar `mem://standards/notifications/email-url-absolutization`: regra de que SQL grava relativo, providers absolutizam.
- Atualizar `.lovable/memory/features/projects/notification-context-standard.md` e `tickets/notification-context-standard.md` referenciando a nova regra.
- Atualizar `mem://index.md` com a nova entrada.

### 4. QA

- Criar `docs/qa/QA_EMAIL_CONTEXT_URL.md` com:
  - Cenários: menção em ticket, status de projeto, status de milestone, OKR check-in, mention reuse.
  - Validação: link do email abre direto (sem `localhost`, sem 404, sem path relativo no inbox).
  - Regressão: Slack e Webhook continuam recebendo o `context_url` no formato esperado (relativo no payload bruto; Slack monta link via wrapper próprio).
- Criar `scripts/qa/validate-email-context-urls.sql`: query no `notification_outbox` recente confirmando que `payload->>'context_url'` é relativo no DB (SSOT preservado) — falha se algum provider gravou absoluto por engano.

### 5. Deploy

- Redesplegar `process-notification-outbox` (consome `_shared/notification-providers/templates.ts`).

## Arquivos

**Editados**:
- `supabase/functions/_shared/notification-providers/templates.ts`
- `supabase/functions/_shared/tcr/notifications.ts`
- `.lovable/memory/index.md`
- `.lovable/memory/features/projects/notification-context-standard.md`
- `.lovable/memory/features/tickets/notification-context-standard.md`

**Criados**:
- `.lovable/memory/standards/notifications/email-url-absolutization.md`
- `docs/qa/QA_EMAIL_CONTEXT_URL.md`
- `scripts/qa/validate-email-context-urls.sql`

**Deploy**:
- `supabase/functions/process-notification-outbox`

## Critério de aceite

- [ ] Email de menção (e demais events) chega com link "Ver detalhes" absoluto e clicável.
- [ ] CTA "Ver no Hub" continua funcionando (não duplica `https://`).
- [ ] `context_url` no `notification_outbox` permanece relativo (SSOT preservado).
- [ ] Slack e Webhook sem regressão.
- [ ] TCR e memórias atualizados; QA doc com cenários.
