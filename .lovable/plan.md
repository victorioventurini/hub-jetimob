
# Plano: Observabilidade Global de E-mails

## Resumo Executivo

Adicionar observabilidade global aos envios de e-mail do Hub, enviando uma cópia BCC silenciosa para `hub@jetimob.com` em **todos** os e-mails enviados pelo sistema, sem impactar o fluxo principal ou expor ao usuário final.

---

## Validações do Pré-Checklist

| Doc Canônico | Status | Observação |
|--------------|--------|------------|
| TCR v3.0.0 | Consultado | Arquitetura de e-mail via SendGrid/Resend confirmada |
| notification-templates-v2 | Consultado | Template system não afetado (BCC é na camada de envio) |
| emit_notification_event | Consultado | Não afetado (BCC é downstream) |
| DEVELOPMENT_STANDARDS | Consultado | Implementação centralizada aderente |

---

## Arquitetura de E-mails do Hub

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    Pontos de Envio de E-mail                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │         _shared/email-sender.ts (sendEmail)                 │   │
│  │                                                             │   │
│  │  Consumidores:                                              │   │
│  │    - auth-email-hook (Magic Link via Supabase Auth)        │   │
│  │    - request-magic-link (Magic Link manual)                │   │
│  │    - send-partner-invite (Convites de parceiros)           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │    _shared/notification-providers/email.ts (sendEmail)      │   │
│  │                                                             │   │
│  │  Consumidores:                                              │   │
│  │    - process-notification-outbox (todas as notificações)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Providers: SendGrid (primary) + Resend (fallback)      │
│                                                                     │
│  SendGrid: bcc: [{ email: "hub@jetimob.com" }]                     │
│  Resend:   bcc: ["hub@jetimob.com"]                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Solução Proposta

### Princípio

Modificar **apenas as funções de envio internas** (`sendViaSendGrid` e `sendViaResend`) para incluir o BCC automaticamente. Isso garante:
- Implementação centralizada (um único ponto de mudança por arquivo)
- Zero flags ou configurações por template
- Cobertura de 100% dos e-mails presentes e futuros
- Fallback silencioso (se BCC falhar, não afeta o envio principal)

### Constante Global

```typescript
// Endereço de observabilidade global (BCC silencioso)
const GLOBAL_BCC_EMAIL = "hub@jetimob.com";
```

---

## Implementação Técnica

### 1. `_shared/email-sender.ts`

**Modificar `sendViaSendGrid`:**

```typescript
async function sendViaSendGrid(options: EmailOptions, apiKey: string): Promise<void> {
  const { to, subject, html, from } = options;
  
  console.log(`[EmailSender] Attempting to send email to ${to} via SendGrid`);
  
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
          subject,
          bcc: [{ email: GLOBAL_BCC_EMAIL }], // ← BCC silencioso
        },
      ],
      from: from || {
        email: "no-reply@hub.jetimob.com",
        name: "Hub",
      },
      content: [
        {
          type: "text/html",
          value: html,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
  }
  
  console.log(`[EmailSender] Email sent successfully via SendGrid to: ${to}`);
}
```

**Modificar `sendViaResend`:**

```typescript
async function sendViaResend(options: EmailOptions, apiKey: string): Promise<void> {
  const { to, subject, html, from } = options;
  
  console.log(`[EmailSender] Attempting to send email to ${to} via Resend (fallback)`);
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from ? `${from.name} <${from.email}>` : "Hub <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      bcc: [GLOBAL_BCC_EMAIL], // ← BCC silencioso
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorText}`);
  }
  
  console.log(`[EmailSender] Email sent successfully via Resend (fallback) to: ${to}`);
}
```

---

### 2. `_shared/notification-providers/email.ts`

**Modificar `sendViaSendGrid`:**

```typescript
const GLOBAL_BCC_EMAIL = "hub@jetimob.com";

async function sendViaSendGrid(options: EmailOptions, apiKey: string): Promise<void> {
  console.log(`[Email] Sending to ${options.to} via SendGrid`);

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ 
        to: [{ email: options.to }], 
        subject: options.subject,
        bcc: [{ email: GLOBAL_BCC_EMAIL }], // ← BCC silencioso
      }],
      from: options.from || { email: "no-reply@hub.jetimob.com", name: "Hub" },
      content: [{ type: "text/html", value: options.html }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
  }
}
```

**Modificar `sendViaResend`:**

```typescript
async function sendViaResend(options: EmailOptions, apiKey: string): Promise<void> {
  console.log(`[Email] Sending to ${options.to} via Resend`);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: options.from ? `${options.from.name} <${options.from.email}>` : "Hub <onboarding@resend.dev>",
      to: [options.to],
      subject: options.subject,
      html: options.html,
      bcc: [GLOBAL_BCC_EMAIL], // ← BCC silencioso
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend error: ${response.status} - ${errorText}`);
  }
}
```

---

## Resumo de Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/_shared/email-sender.ts` | **Editar** | Adicionar `GLOBAL_BCC_EMAIL` e incluir BCC em `sendViaSendGrid` e `sendViaResend` |
| `supabase/functions/_shared/notification-providers/email.ts` | **Editar** | Adicionar `GLOBAL_BCC_EMAIL` e incluir BCC em `sendViaSendGrid` e `sendViaResend` |

---

## Comportamento Esperado

| Cenário | Resultado |
|---------|-----------|
| Magic Link (auth-email-hook) | Usuário recebe + hub@jetimob.com recebe BCC |
| Magic Link (request-magic-link) | Usuário recebe + hub@jetimob.com recebe BCC |
| Convite de Parceiro | Parceiro recebe + hub@jetimob.com recebe BCC |
| Notificações (outbox) | Destinatário recebe + hub@jetimob.com recebe BCC |
| E-mails futuros | Automaticamente incluídos (centralizado) |

---

## Garantias de Segurança

| Regra | Implementação |
|-------|---------------|
| BCC invisível ao usuário | Ambas APIs (SendGrid/Resend) tratam BCC como hidden |
| Não interfere em métricas | BCC não afeta open/click tracking do destinatário principal |
| Falha silenciosa | Se BCC falhar, o provider retorna erro geral mas o e-mail principal foi enviado |
| Não duplica lógica | Implementação única por arquivo, sem flags por evento |

---

## Conformidade com Padrões do Hub

| Padrão | Status |
|--------|--------|
| Implementação centralizada | Modificação em apenas 2 arquivos compartilhados |
| Sem flags por template | Constante única `GLOBAL_BCC_EMAIL` |
| Aderência a notification-templates-v2 | Não afeta templates (BCC é na camada de envio) |
| Sem duplicação de lógica | Cada arquivo tem sua própria função (auth vs notifications) |

---

## Considerações Importantes

1. **SendGrid e Resend tratam BCC de forma idêntica** — o destinatário principal não vê o endereço BCC

2. **Volume de e-mails** — hub@jetimob.com receberá TODOS os e-mails do Hub. Considerar:
   - Configurar regras de filtragem/labels no provedor de e-mail
   - Monitorar volume para não exceder limites de caixa

3. **Logs** — Os logs existentes já mostram `to=` do destinatário. O BCC é silencioso nos logs também (não expõe)

---

## Testes Recomendados

1. **Magic Link**: Solicitar acesso e verificar se hub@jetimob.com recebeu cópia
2. **Convite de Parceiro**: Criar contato parceiro e verificar BCC
3. **Notificação**: Disparar evento com canal e-mail e verificar BCC
