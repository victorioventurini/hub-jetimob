---
name: features/projects/notification-context-standard
description: Padrão de notificações do módulo Projetos espelhando Tickets — triggers contextuais, watchers via mentions e templates de email
type: feature
---

# Memory: features/projects/notification-context-standard
Updated: 2026-04-23

As notificações do módulo de Projetos seguem o mesmo padrão canônico do módulo Tickets. Três gatilhos de banco (`notify_project_status_changed`, `notify_milestone_status_changed`, `notify_project_mention`) capturam contexto e passam metadados contextuais via `p_metadata`: `project_name`, `milestone_name`, `actor_name`, `bu_name`, `old_status`, `new_status`. O `p_title` no `emit_notification_event` é o nome real do projeto (ou `Projeto / Milestone`), garantindo que o assunto do email siga o padrão `[{{bu_name}}] {{project_name}} — {{new_status}}` (ou `[{{bu_name}}] {{project_name}} / {{milestone_name}} — {{new_status}}`).

**Recipients (fanout)**: owner do projeto + owner da milestone + membros dos times do projeto (`project_teams` → `user_team_memberships`) + **watchers** = todos os usuários mencionados em comentários não-deletados do projeto (`mentions` JOIN `project_comments` WHERE `entity_type='project_comment' AND deleted_at IS NULL`). O ator (`auth.uid()`) é sempre excluído da lista para não receber a própria notificação.

**Templates de email** registrados para `project.status.changed` e `milestone.status.changed` (channel=`email`, version=1, is_active=true). Mentions reutilizam o evento canônico `mention.created` (audience=`both`).

**Trigger duplicado removido**: `trg_notify_mention` em `public.mentions` foi dropado (chamava `notify_ticket_mention` sem WHEN clause, gerando notificações em dobro). Restam: `trg_notify_ticket_mention`, `trg_notify_project_mention` (com WHEN `entity_type='project_comment'`) e `trg_auto_add_mention_as_participant`.

Nenhuma alteração de frontend foi necessária — `MentionInput` já está em `ProjectCommentsSection` e todo o fluxo é server-side via `p_metadata` → `templateVars`.

**Cobertura automatizada**: `scripts/qa/validate-projects-notifications.sql` (idempotente, <1s, 28 asserções estruturais cobrindo eventos, templates, triggers, fanout, soft-delete, dedup, exclusão do actor e índices). Não há `*.integration.test.ts` em Vitest porque a lógica vive 100% em triggers PostgreSQL — mocks no jsdom não disparariam triggers. Quando o projeto ganhar pgTAP/container DB no CI, os cenários E2E do `docs/qa/QA_PROJECTS_NOTIFICATIONS.md` poderão ser automatizados.
