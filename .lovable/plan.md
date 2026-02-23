

# Correcoes do E-mail de Resumo do Check-in do Time

## Pre-checklist

- **TCR v3.8.0**: Consultado. Confirmada arquitetura de memberships, identity convention, notification pipeline.
- **IDENTITY_CONVENTION**: Consultado. `user_team_memberships.user_id` = PROFILE_ID, `profiles.user_id` = AUTH_USER_ID.
- **MEMBERSHIP_SCHEMA_CHECK**: Consultado. `user_team_memberships` nao possui `deleted_at`; existencia = ativo.
- **DATA_MODEL_REGISTRY**: Consultado. `profiles.team_id` e a fonte atual de vinculo time-membro.
- **PERMISSIONS_AND_RBAC**: Nao aplicavel (edge function usa service client).

## Diagnostico Completo

Foram identificados **5 bugs** que impediram o envio do resumo:

| # | Bug | Severidade | Impacto |
|---|-----|-----------|---------|
| 1 | `user_team_memberships` vazia (0 registros globalmente) | Critico | 0 membros encontrados, fluxo abortado |
| 2 | Filtro `.is('deleted_at', null)` em tabela sem coluna `deleted_at` | Critico | Query falha silenciosamente |
| 3 | Actor (lider) excluido pelo RPC `emit_notification_event` | Alto | Lider nunca recebe proprio resumo |
| 4 | Andressa sem `user_id` (auth) | Medio | Impossivel entregar notificacao |
| 5 | Agentes de IA retornam JSON com markdown backticks | Medio | `JSON.parse` falha, conteudo fallback |

### Evidencias do Banco

```text
user_team_memberships: 0 registros (tabela vazia globalmente)
profiles com team_id Marketing: 2 (Andressa sem auth, Vitor com auth)
teams.leader_user_id: 110f72b1 (profile_id do Vitor)
Vitor auth_user_id: 0519fa0e
session summary_sent_at: 2026-02-23 17:22:06 (ja marcada)
notifications para a sessao: 0
notification_outbox para a sessao: 0
```

## Plano de Correcoes

### Correcao 1: Fallback de membros via `profiles.team_id`

**Arquivo**: `supabase/functions/team-checkin-summary/index.ts`
**Funcao**: `loadTeamData` (linhas 383-456)

A tabela `user_team_memberships` esta vazia. O vinculo real de membros e feito via `profiles.team_id`. A correcao adiciona um fallback:

1. Tentar `user_team_memberships` primeiro (sem filtro de `deleted_at`, pois a coluna nao existe)
2. Se vazio, buscar via `profiles.team_id` (fonte canonica atual)
3. Garantir que o lider seja sempre incluido

### Correcao 2: Remover filtro `deleted_at` invalido

**Arquivo**: `supabase/functions/team-checkin-summary/index.ts`
**Linha**: 388

Remover `.is('deleted_at', null)` pois `user_team_memberships` nao possui essa coluna (TCR v3.8.0, MEMBERSHIP_SCHEMA_CHECK confirmam).

### Correcao 3: Lider recebe o proprio resumo

**Arquivo**: `supabase/functions/team-checkin-summary/index.ts`
**Linhas**: 820-833

O RPC `emit_notification_event` exclui o `p_actor_id` dos destinatarios (logica "nao notificar a si mesmo"). Para o resumo de check-in, o lider DEVE receber. Solucao: passar `p_actor_id` como NULL para que nenhum destinatario seja excluido.

### Correcao 4: Sanitizacao de JSON dos agentes de IA

**Arquivo**: `supabase/functions/team-checkin-summary/index.ts`
**Funcao**: `orchestrateAgents` (linhas 662-702)

Adicionar funcao `sanitizeJsonResponse` que remove backticks markdown (` ```json ... ``` `) antes do `JSON.parse`. Agentes de IA frequentemente envolvem respostas JSON em blocos de codigo.

### Correcao 5: Reset da sessao para re-disparo

**Acao**: Migration SQL para limpar `summary_sent_at` da sessao `f4048c33-d96c-40ef-9bde-5f087d35596c`, permitindo re-processamento apos deploy das correcoes.

## Detalhes Tecnicos

### Novo codigo de carregamento de membros (Correcao 1 + 2)

```typescript
// Try user_team_memberships first (no deleted_at filter - column doesn't exist)
const membersResult = await serviceClient
  .from('user_team_memberships')
  .select('profiles!inner(user_id)')
  .eq('team_id', teamId);

let memberAuthIds: string[] = [];
if (membersResult.data && membersResult.data.length > 0) {
  memberAuthIds = membersResult.data
    .map((m: any) => m.profiles?.user_id)
    .filter(Boolean);
} else {
  // Fallback: profiles.team_id (canonical source when junction table is empty)
  const { data: profileMembers } = await serviceClient
    .from('profiles')
    .select('user_id')
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .not('user_id', 'is', null);
  
  if (profileMembers) {
    memberAuthIds = profileMembers.map((p: any) => p.user_id).filter(Boolean);
  }
}
```

### Funcao de sanitizacao JSON (Correcao 4)

```typescript
function sanitizeJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  // Remove markdown code fences: ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  return cleaned.trim();
}
```

### Actor ID nulo para resumo (Correcao 3)

```typescript
// Pass null actor_id so leader receives their own summary
p_actor_id: null,
```

## Arquivos Modificados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `supabase/functions/team-checkin-summary/index.ts` | Edge Function | Correcoes 1-4 |
| Migration SQL | DB | Reset `summary_sent_at` (Correcao 5) |

## Verificacao Pos-Deploy

Apos as correcoes, o fluxo esperado sera:

```text
1. Session re-processavel (summary_sent_at = NULL)
2. loadTeamData encontra Vitor via profiles.team_id (Andressa excluida: sem auth)
3. Agentes de IA geram conteudo, JSON parseado corretamente
4. emit_notification_event com actor_id = NULL → Vitor recebe
5. Email enviado via SendGrid/Resend com BCC para hub@jetimob.com
6. summary_sent_at atualizado (idempotencia restaurada)
```

