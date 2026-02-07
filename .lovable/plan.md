
# Plano V2.1 — E-mail de Resumo do Check-in do Time

## Resumo Executivo

Implementar o envio automático de um e-mail de resumo após a conclusão do check-in de time, reutilizando exclusivamente:
- Sistema de wizards existente (`okr_wizard_sessions`)
- Sistema canônico de notificações (`emit_notification_event` → `notification_outbox` → `process-notification-outbox`)
- Agentes de IA existentes no Hub (4 agentes confirmados)
- Infraestrutura de edge functions com `withMiddleware`

---

## Validações do Pré-Checklist (Completas)

| Doc Canônico | Status | Observações |
|--------------|--------|-------------|
| TCR v3.0.0 | Consultado | Edge functions usam `withMiddleware`, padrão de clientes |
| IDENTITY_CONVENTION v2.1.1 | Consultado | `profiles.user_id` → `auth.users.id` para notificações |
| DATA_MODEL_REGISTRY v3.0.0 | Consultado | `okr_wizard_sessions` tem 16 colunas, sem `summary_sent_at` |
| WIZARD_DEVELOPMENT_GUIDE v1.0.0 | Consultado | Wizards são rituais de gestão |
| Agentes existentes | Verificados | 4 agentes confirmados no banco com slugs ativos |

---

## Agentes de IA Disponíveis (Confirmados no Banco)

| Slug | Nome | Função no E-mail |
|------|------|------------------|
| `analista-kpis` | Analista de KPIs | Objetivos, KRs, indicadores em destaque |
| `facilitador-decisoes` | Facilitador de Decisões | Riscos, bloqueios, iniciativas, próximos focos |
| `cultura` | Guardião da Cultura | Mensagem cultural curta |
| `revisor-comunicacao` | Revisor de comunicação interna | Abertura e encerramento |

**NOTA:** O agente `Coach de produtividade` existe no banco mas com `slug: null`, portanto não pode ser invocado. O e-mail será gerado com os 4 agentes que possuem slugs ativos.

---

## Arquitetura de Fluxo

```text
Frontend                                Backend
────────                                ───────
TeamCheckinPage
    │
    ├─► handleComplete()
    │     ├─► clearDraft()  ──────────► okr_wizard_sessions.status = 'completed'
    │     ├─► toast.success()
    │     ├─► navigate('/okrs')
    │     │
    │     └─► supabase.functions.invoke('team-checkin-summary')
    │              │                              ▲ best-effort, não bloqueante
    │              ▼
    │        team-checkin-summary (Edge Function)
    │              │
    │              ├─► withMiddleware(requireAuth, requireBu)
    │              │
    │              ├─► Verificar idempotência:
    │              │     - Buscar sessão por id
    │              │     - IF summary_sent_at NOT NULL → return { skipped: true }
    │              │
    │              ├─► Carregar dados em paralelo:
    │              │     - Team info
    │              │     - Membros (auth.users.id via profiles.user_id)
    │              │     - Objetivos + KRs do ciclo
    │              │     - KPIs do time
    │              │
    │              ├─► Filtrar exceções (gestão por exceção):
    │              │     - KRs fora da trilha, superados, estagnados
    │              │     - KPIs primários ou com alertas
    │              │
    │              ├─► Orquestrar 4 agentes via invoke-vic (paralelo):
    │              │     Promise.allSettled([
    │              │       invokeVic('analista-kpis', ...),
    │              │       invokeVic('facilitador-decisoes', ...),
    │              │       invokeVic('cultura', ...),
    │              │       invokeVic('revisor-comunicacao', ...),
    │              │     ])
    │              │
    │              ├─► Consolidar outputs com fallbacks neutros
    │              │
    │              ├─► emit_notification_event(
    │              │       p_event_slug: 'team.checkin.summary',
    │              │       p_bu_id: uuid,
    │              │       p_recipient_user_ids: [auth.users.id, ...],
    │              │       p_actor_id: uuid,
    │              │       p_title: text,
    │              │       p_message: text,
    │              │       p_context_type: 'team_checkin',
    │              │       p_context_id: uuid,
    │              │       p_context_url: text,
    │              │       p_metadata: jsonb
    │              │   )
    │              │
    │              └─► UPDATE okr_wizard_sessions
    │                    SET summary_sent_at = NOW()
    │                    WHERE id = sessionId
    │
    ▼
notification_outbox (pipeline existente)
    │
    └─► process-notification-outbox → SendGrid (com BCC silencioso já implementado)
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/team-checkin-summary/index.ts` | **Criar** | Edge function de orquestração |
| `supabase/config.toml` | **Editar** | Adicionar `[functions.team-checkin-summary]` com `verify_jwt = false` |
| `src/modules/okrs/pages/TeamCheckinPage.tsx` | **Editar** | Disparar edge function em `handleComplete` |
| `src/modules/okrs/hooks/useGenericWizardDraft.ts` | **Editar** | Expor `sessionId` no retorno do hook |
| Migration SQL | **Criar** | Evento + template + coluna `summary_sent_at` |

---

## Detalhes Técnicos

### 1. Migration SQL

A migration adiciona:
1. Coluna `summary_sent_at` em `okr_wizard_sessions` para idempotência
2. Evento `team.checkin.summary` em `notification_events`
3. Template de e-mail em `notification_templates` com variáveis para as seções geradas pelos agentes

O template segue o padrão existente com variáveis como:
- `{{bu_name}}`, `{{team_name}}`, `{{cycle_name}}`, `{{current_datetime}}`
- `{{opening_text}}`, `{{objectives_summary}}`, `{{krs_highlight}}`
- `{{kpis_summary}}`, `{{risks_summary}}`, `{{next_focus}}`
- `{{culture_message}}`, `{{closing_text}}`, `{{context_url}}`

### 2. Edge Function: team-checkin-summary

A função será criada seguindo o padrão `withMiddleware` do TCR v3.0.0:

**Responsabilidades:**
- Validar JWT + BU via `withMiddleware({ requireAuth: true, requireBu: true, validateBuAccess: true })`
- Verificar idempotência via `summary_sent_at`
- Carregar dados em paralelo (time, membros, OKRs, KRs, KPIs)
- Filtrar exceções (gestão por exceção)
- Orquestrar agentes via chamadas internas à `invoke-vic`
- Chamar `emit_notification_event` com `p_recipient_user_ids` contendo `auth.users.id`
- Marcar sessão como enviada

**Resolução de Destinatários (IDENTITY_CONVENTION):**
```sql
-- Membros do time (retorna auth.users.id)
SELECT DISTINCT p.user_id  -- Este é auth.users.id!
FROM user_team_memberships utm
JOIN profiles p ON p.id = utm.user_id  -- utm.user_id referencia profiles.id
WHERE utm.team_id = :team_id
  AND p.deleted_at IS NULL
  AND p.global_status = 'active'

UNION

-- Líder do time
SELECT p.user_id
FROM teams t
JOIN profiles p ON p.id = t.leader_user_id
WHERE t.id = :team_id
  AND p.deleted_at IS NULL
```

**Orquestração de Agentes (Resiliente):**
```typescript
// Paralelo com tratamento de falhas
const agentResults = await Promise.allSettled([
  invokeVic('analista-kpis', 'checkin_summary', agentContext),
  invokeVic('facilitador-decisoes', 'risks_focus', agentContext),
  invokeVic('cultura', 'culture_message', agentContext),
  invokeVic('revisor-comunicacao', 'opening_closing', agentContext),
]);

// Extrair com fallbacks neutros
const sections = {
  objectives_summary: extractOrFallback(agentResults[0], 'Sem objetivos em destaque.'),
  krs_highlight: extractOrFallback(agentResults[0], ''),
  kpis_summary: extractOrFallback(agentResults[0], ''),
  risks_summary: extractOrFallback(agentResults[1], 'Nenhum risco identificado.'),
  next_focus: extractOrFallback(agentResults[1], 'Manter o foco na execução.'),
  culture_message: extractOrFallback(agentResults[2], 'Juntos construímos resultados.'),
  opening_text: extractOrFallback(agentResults[3], 'Resumo do check-in do time.'),
  closing_text: extractOrFallback(agentResults[3], 'Bom trabalho!'),
};
```

### 3. Modificação do Frontend

**Expor sessionId no hook (useGenericWizardDraft.ts):**
O hook já gerencia internamente o `sessionId` (linha 88), mas não o expõe no retorno. Será adicionado ao interface `UseGenericWizardDraftReturn` e ao objeto de retorno.

**Modificar handleComplete (TeamCheckinPage.tsx):**
```typescript
const handleComplete = useCallback(async () => {
  // 1. Primeiro: limpar draft e navegar (não bloqueia)
  await clearDraft();
  toast.success('Check-in do time concluído!');
  navigate('/okrs');

  // 2. Depois: disparar resumo (best-effort, não bloqueia)
  try {
    await supabase.functions.invoke('team-checkin-summary', {
      body: {
        teamId: teamIdParam,
        cycleId: quarterlyCycle?.id,
        bu_id: currentBu?.id,
        sessionId: sessionId,
      }
    });
  } catch (e) {
    console.warn('Summary email failed (non-blocking):', e);
  }
}, [clearDraft, navigate, supabase, teamIdParam, quarterlyCycle, currentBu, sessionId]);
```

---

## Estrutura do E-mail Final

**Assunto:**
`[{{bu_name}}] Check-in do time {{team_name}} — {{current_datetime}}`

**Corpo (10 seções):**
1. **Abertura** — Texto curto contextualizando o fechamento (Revisor)
2. **Objetivos do Time** — Status consolidado por objetivo (Analista)
3. **KRs e Métricas em Destaque** — Apenas exceções (Analista)
4. **Indicadores Relevantes** — KPIs primários ou com gates (Analista)
5. **Iniciativas e Decisões** — Resumo do ciclo (Facilitador)
6. **Riscos e Bloqueios** — Até 3 itens (Facilitador)
7. **Sinais que Dependem de Atualização** — Condicional (Analista + Facilitador)
8. **Próximos Focos** — 2-4 bullets práticos (Facilitador)
9. **Mensagem Cultural** — Mensagem curta (Cultura)
10. **Encerramento + CTA** — Link para o Hub (Revisor)

---

## Conformidade com Padrões do Hub

| Padrão | Status |
|--------|--------|
| PRE-BU vs POST-BU | Edge function usa `withMiddleware({ requireBu: true })` |
| IDENTITY_CONVENTION | `p_recipient_user_ids` recebe `auth.users.id` via `profiles.user_id` |
| Edge Function Standard | Usa `withMiddleware`, `corsHeaders`, `successResponse` |
| notification-templates-v2 | Subject com `[{{bu_name}}]` e `{{current_datetime}}` |
| Zero novas tabelas | Reutiliza `okr_wizard_sessions` + apenas 1 coluna nova |
| Zero novos agentes | Usa apenas os 4 existentes com slugs ativos |
| BCC para auditoria | Já implementado globalmente em `email-sender.ts` e `notification-providers/email.ts` |
| Best-effort | Frontend não bloqueia em caso de falha |
| Idempotência | Via `summary_sent_at` na sessão |

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Agente falha | `Promise.allSettled` + fallback neutro por seção |
| Timeout na edge function | Limite de 30s; agentes em paralelo reduzem latência |
| E-mail duplicado | Idempotência via `summary_sent_at` |
| sessionId não disponível | Expor no hook; fallback para não disparar |
| Usuário navega antes de completar | `clearDraft()` executa primeiro, email é assíncrono |

---

## Critérios de Sucesso

- Membros do time recebem e-mail em até 5 minutos após conclusão
- Leitura rápida (2-3 min) focada em exceções
- Zero bloqueio do fluxo do usuário
- Idempotência garantida (nunca envia duas vezes)
- Fallbacks neutros se agentes falharem
- Tom não avaliativo, não punitivo, orientado a aprendizado
