## Contexto (TCR + docs canônicos consultados)

- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`, `DATA_MODEL_REGISTRY.md`, `DEVELOPMENT_STANDARDS.md`, `IDENTITY_CONVENTION.md` revisados.
- Padrão imediato de referência: migração `20260427150836_*.sql` (Tickets) — helper `_ticket_email_metadata` + atualização de triggers + templates HTML padronizados. Replicar a mesma anatomia para Projetos/Milestones (consistência de SSOT).
- Estado atual no banco:
  - **Eventos:** `project.status.changed`, `milestone.status.changed` (apenas e-mail). Menções em projetos hoje caem no `mention.created` genérico.
  - **Triggers/funções:** `notify_project_status_changed`, `notify_milestone_status_changed`, `notify_project_mention` — todas emitem metadados parciais (faltam responsável, datas, status do projeto pai, etc.).
  - **Templates `notification_templates`** (canal `email`):
    - `project.status.changed` (1.270 chars) — sem bloco de contexto padronizado.
    - `milestone.status.changed` (1.529 chars) — idem.
    - Não existe template específico de menção em projeto.
  - **Tabelas confirmadas:** `projects(id, name, owner_id, status, start_date, due_date, bu_id, ...)`, `project_milestones(id, project_id, name, owner_id, status, start_date, due_date, bu_id, ...)`. Todos os campos requeridos pelo usuário existem.

## Objetivo

Aprimorar todos os e-mails relacionados a Projetos e Milestones para exibirem um bloco de contexto consistente com os campos solicitados:

- **Projeto:** BU, Nome, Responsável, Data início / Data conclusão, Status.
- **Milestone:** Nome, Status, Responsável, Data início / Data conclusão (mais o bloco do projeto-pai como contexto).

## Mudanças propostas

### 1. Migração SQL (helpers + triggers)

Criar `supabase/migrations/<timestamp>_project_email_metadata.sql`:

1. **Helper `public._project_email_metadata(p_project_id uuid)`** (SECURITY DEFINER, search_path `public`) — retorna JSONB canônico:
   - `bu_name`
   - `project_id`, `project_name`
   - `project_owner_name`
   - `project_start_at` (formato pt-BR `DD/MM/YYYY` ou `—`)
   - `project_due_at` (idem)
   - `project_status` (label via `project_status_label`)
   - `project_url` (`/projects/{id}`)

2. **Helper `public._milestone_email_metadata(p_milestone_id uuid)`** — retorna JSONB canônico:
   - Todos os campos do projeto-pai (via merge com `_project_email_metadata`)
   - `milestone_id`, `milestone_name`
   - `milestone_owner_name`
   - `milestone_start_at` (formatado)
   - `milestone_due_at` (formatado)
   - `milestone_status` (label via `milestone_status_label`)

3. **Refatorar triggers** para reaproveitar o helper:
   - `notify_project_status_changed`: substituir `jsonb_build_object` atual por `_project_email_metadata(NEW.id) || jsonb_build_object('old_status', …, 'new_status', …, 'actor_name', …)`.
   - `notify_milestone_status_changed`: usar `_milestone_email_metadata(NEW.id) || jsonb_build_object('old_status', …, 'new_status', …, 'actor_name', …)`.
   - `notify_project_mention`: emitir novo evento `project.mention.created` (ver passo 4) com `_project_email_metadata(v_project.id) || jsonb_build_object('actor_name', …, 'is_external', …)`. Mantém compatibilidade com a notificação genérica desativando o caminho atual `mention.created` para entidade `project_comment`.

4. **Novo evento `project.mention.created`** em `notification_events` (espelho do `ticket.mention.created`).

### 2. Templates de e-mail (`notification_templates`)

Atualizar/criar via `INSERT … ON CONFLICT DO UPDATE` (canal `email` e `in_app` quando aplicável):

- `project.status.changed` (email) — manter assunto `[{{bu_name}}] {{project_name}} — {{new_status}}` e injetar bloco de contexto padrão.
- `milestone.status.changed` (email) — assunto `[{{bu_name}}] {{project_name}} / {{milestone_name}} — {{new_status}}` + bloco de contexto Projeto + bloco Milestone.
- `project.mention.created` (email + in_app — novo) — assunto `[{{bu_name}}] {{project_name}} — Você foi mencionado` + bloco de contexto Projeto.

Bloco HTML de contexto (consistente com o padrão de Tickets):

```html
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#0f172a;">
  <p style="margin:0 0 8px"><strong>BU:</strong> {{bu_name}}</p>
  <p style="margin:0 0 8px"><strong>Projeto:</strong> {{project_name}}</p>
  <p style="margin:0 0 8px"><strong>Responsável:</strong> {{project_owner_name}}</p>
  <p style="margin:0 0 8px"><strong>Início → Conclusão:</strong> {{project_start_at}} → {{project_due_at}}</p>
  <p style="margin:0"><strong>Status do projeto:</strong> {{project_status}}</p>
</div>
```

Em milestones, adicionar logo abaixo:

```html
<div style="…">
  <p><strong>Milestone:</strong> {{milestone_name}}</p>
  <p><strong>Responsável:</strong> {{milestone_owner_name}}</p>
  <p><strong>Início → Conclusão:</strong> {{milestone_start_at}} → {{milestone_due_at}}</p>
  <p><strong>Status:</strong> {{milestone_status}}</p>
</div>
```

### 3. Atualização documental

- Atualizar `docs/canonical/DB_FUNCTIONS_INDEX.md` com os novos helpers.
- Adicionar seção "Projetos & Milestones" no doc canônico de notificações (criar `docs/canonical/NOTIFICATION_CONTEXT_STANDARD.md` se ainda não existir, ou complementar `docs/qa/QA_EMAIL_CONTEXT_URL.md`).
- Memória: anotar SSOT de helpers de e-mail em `mem://standards/notifications/email-context-helpers`.

## Detalhes técnicos

- Fallbacks: `COALESCE` em todos os campos (`'—'` para datas/strings vazias, `'Não atribuído'` para responsáveis, `'Hub'` para BU). Mantém comportamento idêntico ao helper de tickets.
- Datas formatadas via `to_char(date, 'DD/MM/YYYY')` no servidor (alinhado ao helper de tickets) — evita variações de timezone no template.
- Helpers SECURITY DEFINER para preservar acesso mesmo quando o trigger roda em contexto sem permissão direta nas tabelas referenciadas (segue o padrão atual das funções de notificação).
- Eventos novos seguem RLS já existente em `notification_templates` e `notification_events` (apenas leitura para usuários, mutação via migrations).
- Idempotência: triggers continuam emitindo apenas em mudança de status (`OLD.status IS DISTINCT FROM NEW.status`).

## Fora do escopo

- Não criar e-mails para criação/edição de campos não-status (o usuário pediu "atualização de milestones e projetos" no contexto dos eventos atuais; novos eventos disparáveis ficam para um próximo plano).
- Não alterar canal in-app dos eventos de status (já cobertos hoje).

## QA

- Forçar transição de status em projeto e milestone de teste, conferir `email_send_log` e renderização do HTML.
- Mencionar usuário em comentário de projeto e validar que o evento emitido é `project.mention.created` com bloco completo.
- Verificar que tickets continuam funcionando inalterados (helpers separados).
