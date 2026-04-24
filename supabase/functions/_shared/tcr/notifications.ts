import type { TcrSection } from "./types.ts";

export const notificationsSection: TcrSection = {
  title: "8. Sistema de Notificações",
  content: `
### 8.1 Arquitetura

1. **Evento** dispara insert em \`notification_outbox\`
2. **Cron** ou **trigger** processa a outbox
3. Edge function \`process-notification-outbox\` envia para canais

### 8.2 Canais Suportados

| Canal | Implementação |
|-------|---------------|
| \`in_app\` | Tabela \`notifications\` |
| \`email\` | SendGrid |
| \`slack\` | Webhook |
| \`webhook\` | HTTP POST |

### 8.3 Preferências

Usuários configuram preferências por evento e canal:

\`\`\`typescript
// user_notification_preferences
{
  user_id: 'uuid',
  event_slug: 'okr.checkin.created',
  channel: 'email',
  is_enabled: false, // opt-out
}
\`\`\`

### 8.4 Convenção de URLs em Templates

**SSOT no banco**: triggers SQL (\`notify_*\`) gravam \`payload.context_url\`
como **path relativo** seguindo o padrão canônico de
\`src/lib/shareableLinks.ts\` — ex.: \`/go/ticket/<id>\`, \`/projects/<id>\`.
Isso preserva BU-resolution via \`/go/:entity/:id\` e mantém o banco
agnóstico de domínio (suporta múltiplos ambientes).

**Absolutização em render-time**: clientes de email (Gmail, Outlook,
Apple Mail) **não resolvem paths relativos** no inbox — links inline ficam
quebrados. Por isso, \`renderTemplate()\` em
\`supabase/functions/_shared/notification-providers/templates.ts\` aplica
\`absolutizeUrl()\` automaticamente em qualquer variável cujo nome seja
exatamente \`context_url\` ou termine com \`_url\`. O helper:

- Retorna a URL inalterada se já absoluta (\`/^https?:\\/\\//i\`) → idempotente.
- Prefixa com \`SITE_URL\` se relativa.
- Retorna string vazia para null/undefined.

**Por canal**:

| Canal | Comportamento |
|-------|---------------|
| \`email\` | Auto-absolutiza via \`renderTemplate\` + CTA wrapper |
| \`slack\` | Já monta links absolutos via wrapper próprio |
| \`webhook\` | Entrega \`context_url\` no payload bruto (consumidor decide) |
| \`in_app\` | Frontend resolve via \`react-router\` (path relativo OK) |

**Regra inquebrável**: nunca grave URL absoluta em \`payload.context_url\`
no banco. A absolutização é responsabilidade exclusiva do provider.

Ver: \`docs/qa/QA_EMAIL_CONTEXT_URL.md\`,
\`mem://standards/notifications/email-url-absolutization\`.
`,
};
