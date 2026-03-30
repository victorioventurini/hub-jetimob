

# Plano: Notificações no Módulo de Projetos

## Pre-checklist executado

- [x] `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` — v3.20.0, Projects v1.4
- [x] `docs/canonical/IDENTITY_CONVENTION.md` — `owner_id` em `projects` = `profiles.id`; `emit_notification_event` recebe `auth.users.id` via `p.user_id`
- [x] `notification_events` — slug `mention.created` (módulo `core`, audience `both`) já existe e é reutilizável
- [x] `notify_ticket_mention` — trigger em `mentions` filtra `entity_type = 'ticket_message'`, ignora `project_comment`
- [x] `emit_notification_event` — assinatura: `(p_event_slug, p_bu_id, p_recipient_user_ids UUID[], p_actor_id, p_title, p_message, p_context_type, p_context_id, p_context_url, p_metadata)`
- [x] Templates existentes seguem padrão HTML com variáveis `{{key}}`

---

## O que será feito

1. **Registrar 2 novos eventos** no catálogo `notification_events`
2. **Criar 2 funções helper** para traduzir status de projeto/milestone para pt-BR
3. **Criar 2 triggers de status** (projeto e milestone)
4. **Criar 1 trigger de menção** para `project_comment`
5. **Criar 4 templates de email** (2 status + 2 menção por canal)
6. **Backfill** `bu_notification_event_settings` para as BUs existentes

---

## Detalhes Técnicos

### Step 1 — Migration SQL (arquivo único)

#### 1.1 Helper functions

```sql
CREATE OR REPLACE FUNCTION public.project_status_label(p_status TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_status
    WHEN 'planned'     THEN 'Planejado'
    WHEN 'in_progress' THEN 'Em andamento'
    WHEN 'paused'      THEN 'Pausado'
    WHEN 'done'        THEN 'Concluído'
    WHEN 'cancelled'   THEN 'Cancelado'
    ELSE p_status
  END;
$$;

CREATE OR REPLACE FUNCTION public.milestone_status_label(p_status TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_status
    WHEN 'todo'        THEN 'A fazer'
    WHEN 'in_progress' THEN 'Em andamento'
    WHEN 'done'        THEN 'Concluído'
    ELSE p_status
  END;
$$;
```

#### 1.2 Notification events (INSERT)

| slug | module | name | audience | severity | default_channels |
|------|--------|------|----------|----------|-----------------|
| `project.status.changed` | `projects` | Status do Projeto Alterado | `internal` | `info` | `{in_app, email}` |
| `milestone.status.changed` | `projects` | Status da Milestone Alterado | `internal` | `info` | `{in_app, email}` |

O evento `mention.created` (módulo `core`) já existe e será reutilizado.

#### 1.3 Trigger: `notify_project_status_changed`

- **Tabela:** `projects` (AFTER UPDATE)
- **Condição:** `OLD.status IS DISTINCT FROM NEW.status`
- **Destinatários:** Owner (`projects.owner_id` → `profiles.user_id`) + membros dos times vinculados (`project_teams` → `user_team_memberships` → `profiles.user_id`), excluindo o ator
- **Metadados:** `project_name`, `old_status`, `new_status` (labels pt-BR), `actor_name`, `bu_name`
- **context_url:** `/projects/{id}`
- **context_type:** `project`

#### 1.4 Trigger: `notify_milestone_status_changed`

- **Tabela:** `project_milestones` (AFTER UPDATE)
- **Condição:** `OLD.status IS DISTINCT FROM NEW.status`
- **Destinatários:** Owner do projeto + owner da milestone (se diferente) + membros dos times vinculados ao projeto
- **Metadados:** `project_name`, `milestone_name`, `old_status`, `new_status` (labels pt-BR), `actor_name`, `bu_name`
- **context_url:** `/projects/{project_id}`
- **context_type:** `milestone`

#### 1.5 Trigger: `notify_project_mention`

- **Tabela:** `mentions` (AFTER INSERT) — reutiliza a mesma tabela, novo trigger
- **Condição:** `NEW.entity_type = 'project_comment'`
- **Lógica:** Busca o `project_comment` → `project` para obter contexto (nome do projeto, BU); resolve autor via `created_by` → `profiles`
- **Metadados:** `project_name`, `actor_name`, `bu_name`
- **context_url:** `/projects/{project_id}`
- **Usa slug:** `mention.created` (já existente)

#### 1.6 Templates de email

**`project.status.changed` / email:**
- Subject: `[{{bu_name}}] {{project_name}} — {{new_status}}`
- Body: projeto, status anterior → novo, ator, link "Ver Projeto"

**`milestone.status.changed` / email:**
- Subject: `[{{bu_name}}] {{project_name}} / {{milestone_name}} — {{new_status}}`
- Body: projeto, milestone, status anterior → novo, ator, link "Ver Projeto"

(Menções reutilizam o template `mention.created` existente, com `context_type = 'project'`.)

#### 1.7 Backfill `bu_notification_event_settings`

Inserir registros para os 2 novos slugs × BUs existentes × canais (`in_app`, `email`).

### Step 2 — Sem alterações de frontend

Toda lógica é server-side via triggers. O sistema existente de notificações in-app (bell icon) e processamento de outbox (email) já consome os eventos automaticamente.

---

## Arquivos impactados

| Tipo | Arquivo |
|------|---------|
| Migration SQL | `supabase/migrations/new_migration.sql` (único arquivo) |

Nenhum arquivo TypeScript precisa ser alterado.

