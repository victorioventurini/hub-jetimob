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
`,
};
