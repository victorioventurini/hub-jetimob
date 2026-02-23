

## Correcao Completa do Fluxo de E-mail de Resumo do Check-in

### Pre-Checklist Executado

| Doc | Consultado | Impacto |
|-----|-----------|---------|
| TECHNICAL_CONTEXT_REGISTRY.md v3.8.0 | Sim | Stack, hooks canonicos, Multi-LLM Gateway |
| IDENTITY_CONVENTION.md v2.2.0 | Sim | `emit_notification_event` recebe `auth.users.id` em `p_recipient_user_ids` e `p_actor_id` |
| PERMISSIONS_AND_RBAC_MODEL.md v1.5.0 | Sim | Sem impacto direto (Edge Function usa service client) |
| DATA_MODEL_REGISTRY.md v1.2.2 | Sim | Tabela real: `kpi_metrics` (nao `kpis`), sem `current_value`/`is_primary` |

---

### Problemas Identificados (5 bugs)

| # | Bug | Gravidade | Local |
|---|-----|-----------|-------|
| 1 | Agentes chamados via `invoke-vic` HTTP (requer JWT de usuario valido) | Critico | `invokeVicAgent()` linhas 294-324 |
| 2 | Tabela `kpis` nao existe; tabela real e `kpi_metrics` | Critico | `loadTeamData()` linha 393 |
| 3 | `kpi_metrics` nao possui colunas `current_value`, `is_primary`, `owner_team_id` | Critico | `loadTeamData()` linhas 393-397 |
| 4 | RPC `get_team_member_auth_ids` nao existe (fallback funciona mas e fragil) | Medio | `loadTeamData()` linha 376 |
| 5 | Template de e-mail nao usa `{{user_name}}` para personalizacao | Baixo | Template no banco |
| 6 | Modelos dos agentes sao legacy (`gpt-4-turbo`, `gpt-4o-mini`) | Info | Tabela `ai_agents` |

---

### Plano de Execucao (5 passos)

#### Passo 1: Refatorar `invokeVicAgent` para chamada direta (sem HTTP)

Substituir a funcao `invokeVicAgent` (linhas 294-324) por `invokeAgentDirect` que usa os modulos compartilhados `agent-loader.ts` e `llm-client.ts` diretamente, eliminando a dependencia de JWT de usuario.

**Arquivo:** `supabase/functions/team-checkin-summary/index.ts`

**Mudancas:**
- Adicionar imports: `loadAgent`, `buildSystemPrompt`, `resolveLLMConfig`, `llmComplete` dos modulos `_shared`
- Criar funcao `invokeAgentDirect(serviceClient, agentSlug, userPromptContent, buId, requestId)` que:
  1. Chama `loadAgent(serviceClient, agentSlug, buId, requestId)`
  2. Chama `resolveLLMConfig(serviceClient, agent.model_name)`
  3. Chama `buildSystemPrompt(serviceClient, agent, effectiveSystemPrompt, buId, requestId)`
  4. Chama `llmComplete(config, messages, { maxTokens, temperature })`
  5. Retorna `content`
- Atualizar `orchestrateAgents` para usar `invokeAgentDirect` em vez de `invokeVicAgent`
- Remover parametros `supabaseUrl` e `authHeader` de `orchestrateAgents` (nao mais necessarios)

**Conformidade:** Respeita o padrao Multi-LLM Gateway (memory `ai-multi-llm-gateway-standard`). Usa `resolveLLMConfig` que roteia automaticamente para o provedor correto conforme configurado nas integracoes.

#### Passo 2: Corrigir query de KPIs (`kpis` -> `kpi_metrics` + `kpi_values`)

**Arquivo:** `supabase/functions/team-checkin-summary/index.ts`

**Mudancas em `loadTeamData()`:**
- Linha 393: `kpis` -> `kpi_metrics`
- Remover colunas inexistentes: `current_value`, `is_primary`
- Usar `team_id` em vez de `owner_team_id`
- Adicionar join com `kpi_values` para obter o valor mais recente
- Ajustar filtro de status: `.eq('status', 'active')` em vez de `.is('deleted_at', null)`

Query corrigida:
```text
serviceClient
  .from('kpi_metrics')
  .select('id, name, target_value, updated_at, team_id, direction, kpi_values(value, reference_date, rag_status)')
  .eq('team_id', teamId)
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('reference_date', { referencedTable: 'kpi_values', ascending: false })
  .limit(1, { referencedTable: 'kpi_values' })
```

Processamento:
- `currentValue` vira do `kpi_values[0].value`
- `isPrimary` sera determinado via join com `okr_kr_metrics` (role = 'primary')
- `status` usa `rag_status` do ultimo valor ou 'desatualizado' se sem valor recente

#### Passo 3: Remover RPC inexistente e usar fallback direto

**Arquivo:** `supabase/functions/team-checkin-summary/index.ts`

**Mudancas em `loadTeamData()`:**
- Remover a chamada ao RPC `get_team_member_auth_ids` (nao existe)
- Usar diretamente a query de fallback com `user_team_memberships` + `profiles`
- Garantir que o lider do time tambem e incluido
- Manter deduplicacao via `new Set()`

Seguindo IDENTITY_CONVENTION: `user_team_memberships.user_id` armazena `profiles.id`, e precisamos de `profiles.user_id` (auth.users.id) para `emit_notification_event.p_recipient_user_ids`.

#### Passo 4: Atualizar template de e-mail para personalizacao

**Migracao SQL:**

```text
UPDATE notification_templates
SET body_template = 'Ola, {{user_name}}!

' || body_template
WHERE event_slug = 'team.checkin.summary'
  AND channel = 'email';
```

A variavel `{{user_name}}` ja e resolvida pelo `process-notification-outbox` (linha 132: `user_name: recipient.display_name || "Usuario"`). Cada destinatario recebe seu proprio nome na saudacao.

#### Passo 5: Resetar sessao e verificar

**Migracao SQL:**

```text
UPDATE okr_wizard_sessions 
SET summary_sent_at = NULL 
WHERE id = '3a0e6b9c-dcfd-4bc2-a664-e626f0b40cc0';
```

Apos deploy, re-invocar `team-checkin-summary` para validar o fluxo completo.

---

### Nota sobre Modelos dos Agentes

Os 4 agentes usam modelos legacy:
- `analista-kpis`: `gpt-4-turbo`
- `facilitador-decisoes`: `gpt-4-turbo`
- `cultura`: `gpt-4o-mini`
- `revisor-comunicacao`: `gpt-4-turbo`

Estes nao sao modelos suportados pelo Lovable AI Gateway. O `resolveLLMConfig` ja trata isso corretamente fazendo fallback para `google/gemini-3-flash-preview` via Gateway. Os agentes funcionarao sem necessidade de atualizar os modelos no banco — mas recomenda-se que o usuario atualize via Hub UI (`/hub/integrations/chatgpt?tab=agents`) para modelos suportados como `google/gemini-3-flash-preview` ou `google/gemini-2.5-flash`.

---

### Resumo de Arquivos Alterados

| Arquivo | Tipo de Mudanca |
|---------|----------------|
| `supabase/functions/team-checkin-summary/index.ts` | Refatoracao: agentes diretos, KPIs, membros |
| SQL Migration | Template personalizado + reset de sessao |

