

# Cobertura de testes — Notificações de Projetos

## Contexto

A migration `20260423233016` adicionou lógica server-side de fanout (owner + teams + watchers via mentions) sem testes acompanhantes. Como o projeto não tem pgTAP configurado, a cobertura será via **testes de integração com Vitest** executando as funções SQL contra o banco Lovable Cloud, mais um teste de QA manual documentado.

## Escopo

### 1. Testes de integração SQL (Vitest + Supabase client)

Arquivo novo: `src/modules/projects/__tests__/notifications.integration.test.ts`

Cobre 6 cenários executando contra o banco real (com cleanup via transação/rollback de fixtures):

- **CN-1**: Mudança de status em projeto notifica owner + membros de `project_teams`, excluindo o actor
- **CN-2**: Watchers (usuários mentionados em `project_comments`) são incluídos na audiência de status change
- **CN-3**: Comentários com `deleted_at IS NOT NULL` não geram watchers (respeita soft-delete)
- **CN-4**: Mudança de status em `project_milestones` dispara `milestone.status.changed` e cria notificações
- **CN-5**: Deduplicação — usuário que é owner + watcher recebe 1 notificação apenas
- **CN-6**: Mention em comentário de projeto cria notificação `project.mention` para o mencionado

### 2. Teste de regressão — Tickets (anti-double-fire)

Arquivo novo: `src/modules/tickets/__tests__/mention-no-duplicates.integration.test.ts`

- **CN-7**: Mention em comentário de ticket cria exatamente **1** notificação (valida remoção do `trg_notify_mention` redundante)

### 3. Teste unitário — Query keys (se aplicável)

Verificar se `notificationsKeys` precisa de namespace para project/milestone notifications. Se sim, estender `src/lib/queryKeys/notifications.test.ts`.

### 4. Validação de schema

Arquivo novo: `src/modules/projects/__tests__/notification-events-registration.test.ts`

- Query SELECT em `notification_events` confirmando que `project.status.changed`, `milestone.status.changed` e `project.mention` estão registrados, com `default_channels` corretos e `audience` apropriada.

### 5. Atualização do QA doc

Atualizar `docs/qa/QA_PROJECTS_NOTIFICATIONS.md` adicionando:
- Comandos para rodar os novos testes
- Mapeamento cenário ↔ teste automatizado
- Marcar cenários antes "manuais" como "automatizados"

## Detalhes técnicos

**Padrão de fixtures**: Cada teste cria seus próprios `bu_id`/`project_id`/`profile_id` com prefixo `test-notif-{uuid}` e limpa via `afterEach` com DELETE em cascata. Não usa banco de testes separado — usa o Lovable Cloud com isolamento por BU sintética.

**Identidade**: Segue `IDENTITY_CONVENTION.md` — `notifications.user_id` = `auth.users.id`. Testes asserem por `user_id` resolvido a partir de `profiles.user_id`.

**RLS bypass**: Testes de fanout usam o `service_role` client (já disponível em fixtures de teste do projeto) para inspecionar `notifications` independente de quem disparou.

**Performance**: Conjunto roda em ~8-12s (estimado) — aceitável para CI, mas marcamos com `describe.concurrent` quando possível.

## Comandos

```bash
npm run test -- src/modules/projects/__tests__/notifications.integration.test.ts
npm run test -- src/modules/tickets/__tests__/mention-no-duplicates.integration.test.ts
npm run test -- --coverage src/modules/projects src/modules/tickets
```

## Arquivos

**Criados**:
- `src/modules/projects/__tests__/notifications.integration.test.ts`
- `src/modules/projects/__tests__/notification-events-registration.test.ts`
- `src/modules/tickets/__tests__/mention-no-duplicates.integration.test.ts`

**Atualizados**:
- `docs/qa/QA_PROJECTS_NOTIFICATIONS.md` (mapeamento de cobertura)
- `.lovable/memory/features/projects/notification-context-standard.md` (referência aos testes)

## Critério de aceite

- [ ] 7 cenários novos passando localmente e no CI (`.github/workflows/test.yml`)
- [ ] Suite total do módulo projects continua verde
- [ ] Suite total do módulo tickets continua verde (sem regressão de double-fire)
- [ ] QA doc reflete cobertura automatizada vs manual

