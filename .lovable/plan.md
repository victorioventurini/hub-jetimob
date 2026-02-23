

# Correções no Fluxo de E-mail de Resumo do Check-in

## Pre-checklist Executado

| Documento | Versao | Resultado |
|-----------|--------|-----------|
| TCR | v3.8.0 | Edge Functions usam `serviceClient` (service role) - OK |
| IDENTITY_CONVENTION | v2.2.0 | `user_team_memberships.user_id` = `profiles.id`; `teams.leader_user_id` = `profiles.id` - OK |
| DATA_MODEL_REGISTRY | v3.0.0 | `user_team_memberships` sem `is_active` (existencia = ativo); `notification_outbox` com `sent_at` e `processed_at` - OK |
| SCHEMA_QUICK_REFERENCE | - | Confirmado schema de `user_team_memberships` e `teams` - OK |

## Diagnostico Confirmado

| Problema | Causa Raiz | Status |
|----------|-----------|--------|
| Apenas 1 destinatario no outbox | `user_team_memberships` vazia, fallback `profiles.team_id` encontrou 1 membro. Codigo de subtimes ja implementado, mas nao estava deployado no momento do check-in | Resolvido (deploy automatico) |
| `sent_at` sempre NULL | `process-notification-outbox` seta `processed_at` mas nunca `sent_at` (linha 254-257) | Correcao necessaria |

## Correcao Unica Necessaria

**Arquivo**: `supabase/functions/process-notification-outbox/index.ts` (linha 254-257)

Adicionar `sent_at` ao objeto de update quando o item e processado com sucesso:

```text
// ANTES (linha 254-257)
const updateData: Record<string, unknown> = { 
  status: "sent",
  processed_at: new Date().toISOString(),
};

// DEPOIS
const updateData: Record<string, unknown> = { 
  status: "sent",
  processed_at: new Date().toISOString(),
  sent_at: new Date().toISOString(),
};
```

## Conformidade

- `serviceClient` usado corretamente (service role, bypassa RLS)
- Identity convention respeitada: `leader_user_id` (profiles.id) resolvido para auth user_id via `profiles.select('user_id').eq('id', ...)`
- Nenhum `select('*')` — queries especificas
- Nenhuma comparacao direta de `auth.uid()` com colunas de dominio
- Logica de subtimes (linhas 478-547) ja esta implementada e conforme ao plano aprovado anteriormente

## O que NAO muda

- Logica de subtimes (ja deployada)
- Orquestracao dos 4 agentes de IA
- Idempotencia via `summary_sent_at`
- Provider de email (SendGrid/Resend com BCC para hub@jetimob.com)
- Estrutura do `emit_notification_event`

