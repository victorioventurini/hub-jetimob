

# Plano: Contextualizar Notificações do Módulo Tickets

## Diagnóstico

O problema está nos **5 trigger functions** do banco de dados que emitem notificações de tickets. Eles passam informações genéricas e insuficientes para o template resolver corretamente:

| Trigger | Problema |
|---------|----------|
| `notify_ticket_status_changed` | `p_title` = "Status do ticket alterado" (genérico). Não passa tipo, categoria, subcategoria, nem quem alterou de fato (usa `owner_user_id` como ator, não quem fez a ação). |
| `notify_ticket_created` | Não passa tipo (interno/externo), categoria, subcategoria. |
| `notify_ticket_assigned` | Não passa tipo, categoria, quem atribuiu (ator é `NULL`). |
| `notify_ticket_message_created` | Mais completo, mas falta tipo e categoria. |
| `notify_ticket_mention` | Falta tipo e categoria do ticket. |

**Exemplo concreto do bug reportado:**
- Subject template: `[{{bu_name}}] Status alterado: {{title}} - {{current_datetime}}`
- `{{title}}` resolve para `payload.title` = "Status do ticket alterado" (a string genérica passada em `p_title`)
- Resultado: "Status alterado: Status do ticket alterado" (redundante e sem contexto)

## Solução

### Etapa 1 — Migração SQL: Reescrever os 5 triggers com dados contextuais

Cada trigger será enriquecido para buscar e passar:

- `ticket_title` — título real do ticket
- `ticket_type` — "Interno" ou "Externo"
- `category_name` — nome da categoria (JOIN em `ticket_categories`)
- `subcategory_name` — nome da subcategoria (JOIN em `ticket_subcategories`)
- `actor_name` — nome de quem executou a ação
- `old_status` / `new_status` — labels traduzidos (ex: "Em andamento", não "in_progress")

**Mapeamento de status para labels pt-BR:**
```text
waiting     → Aguardando
paused      → Pausado
in_progress → Em andamento
done        → Concluído
discarded   → Descartado
```

**Mudança chave no `p_title` e `p_message`:**
```text
ANTES:
  p_title = 'Status do ticket alterado'
  p_message = 'Ticket "Título" foi alterado para in_progress'

DEPOIS:
  p_title = 'Meu Ticket Exemplo'  (título real do ticket)
  p_message = 'João Silva alterou o status de Aguardando para Em andamento'
  p_metadata = { ticket_title, ticket_type, category, subcategory, old_status, new_status, actor_name }
```

Isso faz `{{title}}` no template do email resolver para o **título real do ticket**, corrigindo o subject.

### Etapa 2 — Atualizar templates de email no banco

Atualizar os `notification_templates` para usar as novas variáveis:

**`ticket.status.changed`:**
- Subject: `[{{bu_name}}] {{ticket_title}} — {{new_status}} - {{current_datetime}}`
- Body: inclui tipo, categoria, quem alterou, status anterior → novo

**`ticket.created`:**
- Subject: `[{{bu_name}}] Novo ticket: {{ticket_title}} - {{current_datetime}}`
- Body: inclui tipo (interno/externo), categoria/subcategoria, solicitante

**`ticket.assigned`:**
- Subject: `[{{bu_name}}] Ticket atribuído: {{ticket_title}} - {{current_datetime}}`
- Body: inclui tipo, categoria, quem atribuiu

**`ticket.message.created`:**
- Subject: `[{{bu_name}}] {{actor_name}} respondeu: {{ticket_title}} - {{current_datetime}}`
- Body: inclui tipo, categoria, snippet da mensagem

### Etapa 3 — Validação

- Nenhuma alteração no front-end é necessária (o sistema de templates é server-side)
- Nenhuma alteração em Edge Functions (o `process-notification-outbox` já faz spread de `...payload` no `templateVars`)
- As variáveis novas ficam disponíveis automaticamente via `p_metadata` → `payload.metadata` → `templateVars`

## Detalhes Técnicos

**Funções afetadas (DB triggers):**
1. `notify_ticket_status_changed()` — rewrite completo
2. `notify_ticket_created()` — enriquecer metadata
3. `notify_ticket_assigned()` — enriquecer metadata + resolver ator
4. `notify_ticket_message_created()` — enriquecer metadata
5. `notify_ticket_mention()` — enriquecer metadata

**Tabelas consultadas nos JOINs adicionais:**
- `ticket_categories` (name)
- `ticket_subcategories` (name)
- `profiles` (display_name para actor)
- `bu_units` (name para bu_name no metadata)

**Templates atualizados (UPDATE em `notification_templates`):**
- 4 registros (ticket.status.changed, ticket.created, ticket.assigned, ticket.message.created)

**Conformidade TCR:**
- Identity Convention: mantém `profiles.id` → `auth.users.id` resolution
- Notification Templates v2 Standard: segue padrão `[{{bu_name}}] Subject - {{current_datetime}}`
- Query Keys: nenhum impacto
- Permissions: triggers são `SECURITY DEFINER`, sem alteração de permissões

