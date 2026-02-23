

# Exibir dados do ultimo check-in do colaborador nos wizards Leader Prep e Team Check-in

## Contexto

Quando um colaborador faz check-in pelo wizard `/collaborator-checkin`, ele preenche:
- **Valor atual** (numerico)
- **Confianca** (alta/media/baixa)
- **Comentario** (o que fez o KR avancar)
- **Bloqueadores** (opcional)

Esses dados ficam na tabela `okr_checkins` com campos `current_value`, `confidence`, `comments`, `blockers`, `user_id`, `date`. Porem, nos wizards `/leader-prep` e `/team-checkin`, o lider e o time **so veem metricas agregadas** (progresso, status, dias sem check-in) -- sem acesso ao contexto qualitativo reportado pelo colaborador.

## Pre-checklist Canonico

Documentos consultados:
- **TCR v3.8.0** -- Stack, modelo de auth, padroes confirmados
- **IDENTITY_CONVENTION v2.2.0** -- `user_id` em `okr_checkins` e `profiles.id` (profile_id de dominio)
- **DATA_MODEL_REGISTRY** -- Tabela `okr_checkins` confirmada com RLS e BU-scoped
- **SCHEMA_QUICK_REFERENCE** -- Campos: `id, kr_id, date, previous_value, current_value, confidence, blockers, comments, user_id, created_at, team_id, bu_id`
- **OKR_FIELDS.checkin** -- Select explicito ja definido: `id, kr_id, kr_type, user_id, date, previous_value, current_value, confidence, comments, blockers, created_at`

## Abordagem

Enriquecer o tipo `WizardKr` com dados do ultimo check-in (batch query unica), criar componente visual compartilhado, e injetar nos steps de revisao dos dois wizards.

## Alteracoes

### 1. Estender tipo `WizardKr` em `useTeamPendingKrs.ts`

Adicionar campo opcional ao tipo:

```typescript
latest_checkin?: {
  confidence: 'high' | 'medium' | 'low';
  comments: string | null;
  blockers: string | null;
  author_name: string | null;
  author_photo: string | null;
  date: string;
} | null;
```

### 2. Enriquecer dados no `useTeamPendingKrs` (batch, sem N+1)

Apos obter os KR IDs, fazer uma unica query batch:

```typescript
const krIds = (data || []).map(kr => kr.id);
const { data: checkins } = await supabase
  .from('okr_checkins')
  .select('kr_id, confidence, comments, blockers, date, user_id')
  .in('kr_id', krIds)
  .order('date', { ascending: false });

// Agrupar: primeiro registro por kr_id = ultimo check-in
const latestCheckinMap = new Map();
for (const c of (checkins || [])) {
  if (!latestCheckinMap.has(c.kr_id)) {
    latestCheckinMap.set(c.kr_id, c);
  }
}
```

Os profiles dos autores serao resolvidos extendendo o `ownerMap` existente com quaisquer `user_id` de checkins que nao estejam la.

### 3. Aplicar mesmo enriquecimento em `useUserKrsForWizard.ts`

Mesma logica de batch query para consistencia do tipo `WizardKr` compartilhado.

### 4. Novo componente `LatestCheckinSummary`

Local: `src/modules/okrs/components/wizards/shared/LatestCheckinSummary.tsx`

Card compacto que exibe:
- Avatar + nome do autor (usando `OptimizedAvatar`)
- Data formatada (`formatDistanceToNow` com locale ptBR)
- Badge de confianca com cores semanticas (Alta = verde, Media = amarelo, Baixa = vermelho)
- Comentario (com truncamento e expand via Collapsible)
- Bloqueador com icone de alerta (se houver)

### 5. Integrar no `LeaderPrepStep.tsx`

Dentro do `CollapsibleContent` (linhas 253-267), apos os dados de progresso existentes, renderizar `LatestCheckinSummary` quando `kr.latest_checkin` existir. Isso da ao lider o contexto qualitativo ao decidir o que discutir em grupo vs 1:1.

### 6. Integrar no `TeamKrReviewStep.tsx`

Dentro do card de revisao de cada KR (linhas 300-307, apos "Ultimo check-in"), renderizar `LatestCheckinSummary` quando `currentKr.latest_checkin` existir. Isso permite ao time ver o que o colaborador reportou durante a revisao conjunta.

### 7. Exportar componente no barrel

Adicionar `LatestCheckinSummary` ao barrel `src/modules/okrs/components/wizards/shared/index.ts`.

## Detalhes Tecnicos

- **BU Isolation**: Query de checkins usa `useBuScopedSupabase` (ja em uso nos hooks)
- **Select explicito**: `select('kr_id, confidence, comments, blockers, date, user_id')` -- sem `select('*')`
- **Batch unica**: Uma query para todos os KR IDs retornados, agrupamento em memoria
- **Identity**: Campo `user_id` em `okr_checkins` e `profiles.id` (profile_id de dominio, conforme IDENTITY_CONVENTION)
- **Profile resolution**: Reusar `ownerMap` existente + complementar com autores de checkin ausentes
- **Performance**: Nenhuma query adicional se nao houver KRs; profiles extras so se houver autores nao presentes no ownerMap
- **Sem alteracao de schema**: Tabela `okr_checkins` ja tem todos os campos necessarios

