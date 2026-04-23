# QA — Notificações do Módulo Projetos

**Data:** 2026-04-23
**Status:** ✅ Implementado + Coberto por validação SQL

## Escopo

Padronização das notificações do módulo Projetos no mesmo padrão canônico do módulo Tickets, conforme `mem://features/tickets/notification-context-standard`.

## Eventos Canônicos

| Evento | Audience | Canais Default | Template Email |
|--------|----------|----------------|----------------|
| `project.status.changed` | internal | in_app, email | ✅ |
| `milestone.status.changed` | internal | in_app, email | ✅ |
| `mention.created` (em projeto) | both | in_app, email | reutiliza canônico |

> Não existe um evento separado `project.mention` — menções em comentários de projeto reutilizam o evento canônico `mention.created` (audience `both`), exatamente como nos tickets.

## Recipients (Fanout)

Para `project.status.changed` e `milestone.status.changed`:
- Owner do projeto
- Owner da milestone (apenas em `milestone.status.changed`)
- Todos os membros dos times vinculados ao projeto (`project_teams` → `user_team_memberships`)
- **Watchers**: todos usuários mencionados em comentários do projeto (`mentions` JOIN `project_comments` WHERE `entity_type='project_comment' AND deleted_at IS NULL`)
- O ator (`auth.uid()`) é excluído da lista
- Deduplicação garantida via `ARRAY_AGG(DISTINCT ...)`

Para `mention.created` em projeto: somente o usuário/contato mencionado.

## Cobertura Automatizada

A lógica vive 100% em triggers/funções PostgreSQL. **Vitest mockado não cobriria nada** — mocks não disparam triggers e o projeto não tem infra de DB efêmero para testes. A cobertura real é via script SQL idempotente:

```bash
psql -f scripts/qa/validate-projects-notifications.sql
```

### Mapeamento Cenário ↔ Asserção SQL

| # | Cenário | Asserção (`scripts/qa/validate-projects-notifications.sql`) | Status |
|---|---------|-------------------------------------------------------------|--------|
| 1 | Eventos canônicos registrados com audience/canais corretos | `CN-EVT` (4 checks) | ✅ |
| 2 | Templates email globais ativos com vars `{{project_name}}`, `{{bu_name}}`, `{{actor_name}}` | `CN-TPL` (5 checks) | ✅ |
| 3 | Trigger de status changed do projeto ativo | `CN-TRG.trg_project_status_ok` | ✅ |
| 4 | Trigger de status changed da milestone ativo | `CN-TRG.trg_milestone_status_ok` | ✅ |
| 5 | Trigger duplicado `trg_notify_mention` removido (anti double-fire em tickets) | `CN-TRG.trg_legacy_removed_ok` | ✅ |
| 6 | Fanout do projeto inclui owner + teams + watchers | `CN-FANOUT.includes_teams + includes_watchers` | ✅ |
| 7 | Fanout respeita soft-delete em comentários | `CN-FANOUT.respects_soft_delete` | ✅ |
| 8 | Ator excluído da lista de recipients | `CN-FANOUT.excludes_actor` | ✅ |
| 9 | Deduplicação via DISTINCT (owner+watcher = 1 notif) | `CN-FANOUT.dedupes_recipients` | ✅ |
| 10 | Status não mudou → sem notificação | `CN-FANOUT.skips_when_no_change` | ✅ |
| 11 | Fanout da milestone inclui nome do milestone no contexto | `CN-FANOUT-MS.includes_milestone_name` | ✅ |
| 12 | Trigger de mention do projeto filtra `entity_type='project_comment'` | `CN-MENTION.when_clause_ok` | ✅ |
| 13 | Índices de suporte ao lookup de mentions/comments existem | `CN-INDEX` (2 checks) | ✅ |

**Resultado da última execução:** 28/28 checks retornaram `t`.

## Cenários End-to-End (QA Manual)

Rodar manualmente em staging após qualquer alteração:

| # | Cenário | Resultado esperado |
|---|---------|--------------------|
| E1 | Mudar status de projeto → owner recebe in_app + email | ✅ |
| E2 | Mudar status de projeto → membros do time do projeto recebem | ✅ |
| E3 | Mudar status de projeto → watchers (mencionados em comentários) recebem | ✅ |
| E4 | Mudar status de milestone → mesma cadeia + owner da milestone | ✅ |
| E5 | Mencionar usuário em comentário de projeto → notificação `mention.created` | ✅ |
| E6 | Mencionar contato externo em comentário → mention `is_external=true` | ✅ |
| E7 | Status não mudou (mesmo valor) → nenhuma notificação | ✅ |
| E8 | Ator não recebe a própria notificação | ✅ |
| E9 | Mention em ticket gera **exatamente 1** notificação (regressão anti double-fire) | ✅ |

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

## Por que não há `*.integration.test.ts` em Vitest?

Decisão arquitetural documentada:

1. **Lógica vive em SQL puro** (triggers + funções `SECURITY DEFINER`). Mocks de Supabase client em jsdom não disparam triggers PostgreSQL — qualquer "integration test" mockado seria teatro de cobertura.
2. **Não há infra de DB efêmero** no projeto (sem pgTAP, sem container PostgreSQL no CI). Os testes que se chamam "integration" no codebase atual (`useCreateCheckin.integration.test.ts`, etc.) são na verdade testes mockados de hooks frontend.
3. **A validação real é via SQL** executado diretamente contra o DB Lovable Cloud. O script `scripts/qa/validate-projects-notifications.sql` é idempotente, roda em <1s e cobre 28 asserções estruturais.

Quando o projeto ganhar infra de DB de testes (pgTAP ou container ephemero), os cenários End-to-End acima podem ser convertidos em testes automatizados de fanout real.

## Referências

- TCR §8 (Sistema de Notificações)
- `mem://features/tickets/notification-context-standard`
- `mem://features/projects/notification-context-standard`
- `docs/qa/QA_NOTIFICATION_ID_CONVENTION.md`
- `scripts/qa/validate-projects-notifications.sql`
