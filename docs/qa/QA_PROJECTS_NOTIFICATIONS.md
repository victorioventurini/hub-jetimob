# QA — Notificações do Módulo Projetos

**Data:** 2026-04-23
**Status:** ✅ Implementado

## Escopo

Padronização das notificações do módulo Projetos no mesmo padrão canônico do módulo Tickets, conforme `mem://features/tickets/notification-context-standard`.

## Eventos Canônicos

| Evento | Audience | Canais Default | Template Email |
|--------|----------|----------------|----------------|
| `project.status.changed` | internal | in_app, email | ✅ |
| `milestone.status.changed` | internal | in_app, email | ✅ |
| `mention.created` (em projeto) | both | in_app, email | reutiliza canônico |

## Recipients (Fanout)

Para `project.status.changed` e `milestone.status.changed`:
- Owner do projeto
- Owner da milestone (apenas em `milestone.status.changed`)
- Todos os membros dos times vinculados ao projeto (`project_teams` → `user_team_memberships`)
- **Watchers**: todos usuários mencionados em comentários do projeto (`mentions` JOIN `project_comments` WHERE `entity_type='project_comment' AND deleted_at IS NULL`)
- O ator (`auth.uid()`) é excluído da lista

Para `mention.created` em projeto: somente o usuário/contato mencionado.

## Cenários Validados

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Mudar status de projeto → owner recebe in_app + email | ✅ |
| 2 | Mudar status de projeto → membros do time do projeto recebem | ✅ |
| 3 | Mudar status de projeto → watchers (usuários mencionados em comentários) recebem | ✅ |
| 4 | Mudar status de milestone → mesma cadeia + owner da milestone | ✅ |
| 5 | Mencionar usuário em comentário de projeto → menção `mention.created` enviada | ✅ |
| 6 | Mencionar contato externo em comentário → mention `is_external=true` enviada | ✅ |
| 7 | Status não mudou (mesmo valor) → nenhuma notificação enviada | ✅ |
| 8 | Ator não recebe a própria notificação | ✅ |
| 9 | Trigger duplicado em mentions removido (sem double-fire em tickets) | ✅ |

## Variáveis de Template

| Variável | project | milestone | mention |
|----------|---------|-----------|---------|
| `{{project_name}}` | ✅ | ✅ | ✅ |
| `{{milestone_name}}` | — | ✅ | — |
| `{{old_status}}` / `{{new_status}}` | ✅ | ✅ | — |
| `{{actor_name}}` | ✅ | ✅ | ✅ |
| `{{bu_name}}` | ✅ | ✅ | ✅ |
| `{{context_url}}` | ✅ | ✅ | ✅ |
| `{{title}}` | ✅ | ✅ | ✅ |

## Trigger Cleanup

Trigger duplicado `trg_notify_mention` em `public.mentions` foi removido. Causava double-fire de `notify_ticket_mention` (uma vez direto, outra via `trg_notify_ticket_mention`). Triggers ativos atualmente:

- `trg_notify_ticket_mention` (todas as menções → handler de tickets, com filtro interno por entity_type)
- `trg_notify_project_mention` (somente quando `entity_type='project_comment'`)
- `trg_auto_add_mention_as_participant`

## Frontend

**Nenhuma alteração necessária.** `MentionInput` (de `@/components/mentions`) já está integrado em `ProjectCommentsSection`. Todo o fluxo é server-side via triggers + `emit_notification_event` + `templateVars`.

## Referências

- TCR §8 (Sistema de Notificações)
- `mem://features/tickets/notification-context-standard`
- `mem://features/projects/notification-context-standard`
- `docs/qa/QA_NOTIFICATION_ID_CONVENTION.md`
