## Objetivo

Padronizar **todos os e-mails de tickets** para exibirem o mesmo bloco de contexto, com 7 campos consistentes:

1. **BU** (já existe na maioria via `{{bu_name}}`)
2. **Categoria / Subcategoria**
3. **Nome do ticket** (título)
4. **Responsável** (assignee — owner_user_id ou assigned_contact_id)
5. **Criado por** (creator/requester)
6. **Quando foi criado** (created_at do ticket, formatado pt-BR)
7. **Status atual** do ticket (label traduzido)

Aplicar a **5 eventos**: `ticket.created`, `ticket.status.changed`, `ticket.assigned`, `ticket.assigned_to_external`, `ticket.message.created`, `ticket.sla.warning`, `ticket.sla.breached` — e ao **`mention.created` quando o contexto for ticket** (que hoje envia e-mail genérico, sem nenhum desses dados — foi exatamente isso que o usuário recebeu no exemplo do Sendgrid).

## Diagnóstico (pré-checklist TCR + memórias canônicas)

- **SSOT atual** (`mem://features/tickets/notification-context-standard`): 5 triggers passam metadata via `p_metadata` → `templateVars`; URL fica relativa (`/go/ticket/<id>`); absolutização no provider (`absolutizeUrl`).
- **Templates ativos** (DB `notification_templates`): bodies já existem para `ticket.*` mas **inconsistentes entre si** (uns têm "Solicitante", outros não; nenhum tem "Responsável", "Status atual" ou "Criado em"). Templates SLA não têm Categoria/Tipo.
- **`mention.created`** é compartilhado com `notify_project_mention` — **não pode** ser sobrescrito com layout específico de ticket. Precisa de evento dedicado **`ticket.mention.created`** (com fallback `mention.created` para projetos).
- **Triggers atuais não emitem**: `responsible_name`, `created_at_formatted`, `current_status` (label), `created_by` separado de `actor`. São os 3 campos críticos faltantes.
- **`status_label`** já existe como função imutável (`ticket_status_label(text)`) e deve ser reutilizada.

## Plano de Implementação

### 1. Migração SQL — enriquecer triggers

Atualizar as **5 funções de trigger** (`notify_ticket_created`, `notify_ticket_status_changed`, `notify_ticket_assigned`, `notify_ticket_message_created`, `notify_ticket_mention`) e as 2 funções SLA (se existirem) para emitir **7 chaves padronizadas no `p_metadata`**:

| Chave | Origem | Fallback |
|---|---|---|
| `bu_name` | `bu_units.name` | `'Hub'` |
| `category` | `ticket_categories.name` | `'—'` |
| `subcategory` | `ticket_subcategories.name` | `'—'` |
| `ticket_title` | `tickets.title` | `'Sem título'` |
| `responsible_name` | `profiles.display_name` (owner_user_id) ou `partner_contacts.name` (assigned_contact_id) | `'Não atribuído'` |
| `requester_name` | `profiles.display_name` ou `partner_contacts.name` (created_by_user_id) | `'Alguém'` |
| `ticket_created_at` | `to_char(tickets.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI')` | `'—'` |
| `ticket_status` | `ticket_status_label(tickets.status)` | `'—'` |

Manter as chaves legacy (`actor_name`, `creator_name`, `ticket_type`, `category`, etc.) para retrocompatibilidade com templates antigos.

### 2. Novo evento `ticket.mention.created`

- Inserir em `notification_event_types` o slug `ticket.mention.created` (categoria "Tickets") com mesma severidade/canais do `mention.created`.
- Atualizar `notify_ticket_mention` para emitir **`ticket.mention.created`** em vez de `mention.created`.
- Migrar `bu_notification_event_settings` e `user_notification_preferences_v2` existentes em `mention.created` (escopo ticket) para o novo slug.
- `mention.created` permanece para projetos/decisões.

### 3. Templates de e-mail unificados

Criar/atualizar **8 templates `email`** com um **bloco de contexto idêntico** (parcial reutilizável via copy-paste do bloco padrão):

```html
<div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0;">
  <p><strong>Ticket:</strong> {{ticket_title}}</p>
  <p><strong>BU:</strong> {{bu_name}}</p>
  <p><strong>Categoria:</strong> {{category}} / {{subcategory}}</p>
  <p><strong>Responsável:</strong> {{responsible_name}}</p>
  <p><strong>Criado por:</strong> {{requester_name}}</p>
  <p><strong>Criado em:</strong> {{ticket_created_at}}</p>
  <p><strong>Status:</strong> {{ticket_status}}</p>
</div>
```

Eventos atualizados:
1. `ticket.created` — preâmbulo "X criou um novo ticket" + bloco padrão + mensagem inicial
2. `ticket.status.changed` — preâmbulo "X alterou status: {{old_status}} → {{new_status}}" + bloco padrão
3. `ticket.assigned` — preâmbulo "Ticket atribuído a você" + bloco padrão
4. `ticket.assigned_to_external` — versão externa do bloco
5. `ticket.message.created` — preâmbulo "X respondeu" + bloco padrão + trecho da mensagem
6. `ticket.mention.created` (**novo**) — preâmbulo "X mencionou você" + bloco padrão + trecho destacado em roxo
7. `ticket.sla.warning` — bloco padrão + alerta SLA (vence em / tempo restante)
8. `ticket.sla.breached` — bloco padrão + alerta SLA violado (expirou em / tempo excedido)

Bumpar `version` em todos e marcar antigos `is_active=false`.

### 4. Subjects padronizados

Subjects já estão razoáveis. Padronizar para incluir BU sempre primeiro:
- `[{{bu_name}}] {{ticket_title}} — {{action_label}}` (onde action_label = "Novo", "Atribuído", "Status: Em andamento", "Nova mensagem", "Mencionou você", "SLA vencendo", "SLA violado").

### 5. QA pós-deploy

- Disparar 1 evento de cada tipo em ambiente de teste e validar render em Gmail/Outlook (links absolutos, fallback de campos vazios funcionando).
- Atualizar `mem://features/tickets/notification-context-standard` para listar os 7 campos canônicos + novo evento `ticket.mention.created`.
- Atualizar `docs/qa/QA_EMAIL_CONTEXT_URL.md` com os novos campos.

## Arquivos / Objetos afetados

**Banco (1 migração)**:
- Functions: `notify_ticket_created`, `notify_ticket_status_changed`, `notify_ticket_assigned`, `notify_ticket_message_created`, `notify_ticket_mention` (+ SLA se existirem)
- Tabela: `notification_event_types` (insert `ticket.mention.created`)
- Tabela: `notification_templates` (update 7 + insert 1 = 8 templates email)
- Tabela: `bu_notification_event_settings` / `user_notification_preferences_v2` (migrar refs de mention→ticket.mention quando contexto=ticket)

**Memória**:
- `mem://features/tickets/notification-context-standard` → atualizar para v2 (7 campos + ticket.mention.created)

**Sem alterações em**:
- Edge Functions (sistema é 100% server-side via `templateVars`)
- Frontend (in-app notifications continuam usando `title`/`message`)
- `templates.ts` (renderTemplate já suporta as novas chaves automaticamente)

## Riscos & Mitigações

- **Risco**: Templates atuais quebrarem por chaves removidas. **Mitigação**: manter aliases legacy (`creator_name`, `actor_name`, `ticket_type`).
- **Risco**: Migrar prefs de `mention.created` para `ticket.mention.created` pode mudar canal default para alguns usuários. **Mitigação**: COPY exato das prefs existentes filtradas por contexto ticket; se houver dúvida, criar `ticket.mention.created` enabled por padrão (mesmo comportamento atual).
- **Risco**: `ticket_created_at` em e-mails de tickets antigos sem timezone. **Mitigação**: `COALESCE` + cast com `AT TIME ZONE 'America/Sao_Paulo'`.

Posso prosseguir com a implementação?