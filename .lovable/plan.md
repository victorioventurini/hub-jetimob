
## Diagnóstico

O Step 1 do Pré-Weekly hoje só mostra `nome do rito + N sessões` + um campo "Reflexão livre" que não pertence a este step. O líder não consegue se preparar para destilar a Weekly olhando apenas a tela.

Pré-checklist confirmou:
- **`SnapshotReportView` + renderers existem** (`team-checkin`, `leader-prep`, `collaborator`). Reuso direto, sem duplicar UI.
- **`reflection_data.data` no banco** já contém o estado completo de cada wizard (validado em amostras reais Jetimob).
- **Canônico Pré-Weekly v2** confirma: Step 1 = revisão; Step 2 = produção. Reflexão livre não cabe aqui.
- **`okr_wizard_sessions` não tem `deleted_at`** (já corrigido).

## Mudanças

### 1. `useWeeklySources` (em `PreWeeklySourcesStep.tsx`) — query enriquecida

- Estender o `select` para incluir `reflection_data, structure_version, started_by, profiles!started_by(full_name)`.
- Manter o filtro dual `team_id` / `started_by` já consagrado em `pre-weekly-v2-sources-scope`.
- Calcular um `summary` por sessão em TS puro (sem AI), com contadores específicos por `wizard_type`:
  - **team-checkin:** decisões totais, KRs revisados, blockers (de `decisions[].sourceStep === 'kr-review'` + texto contendo "blocker" — fallback simples), pedidos de apoio (`category === 'next_step'`).
  - **leader-prep:** highlights (count de `highlights[]` por priority), KPIs em alerta (`kpisForFollowup.length + kpisForDiscussion.length`), ações de KR (`krActions.length`).
  - **collaborator:** `hasReflection` (boolean), KRs com `confidence` preenchida, blockers individuais (`results[].blocker`).
- Retornar também `completedAt` e `startedByName` no shape de cada sessão.

### 2. Novo `SourceCard` (interno ao Step, com `React.memo`)

Cada sessão concluída vira um card com:
- **Cabeçalho:** ícone do rito + label via `getRitualLabel()` + nome do autor + timestamp humanizado em pt-BR (`formatDistanceToNow` com `addSuffix` para < 24h; senão `format` "ontem às 17h" / "sexta às 16h").
- **Corpo:** 3-5 chips/badges com contadores do `summary`. Zero exibido em estilo discreto (`text-muted-foreground`).
- **Ação:** botão **"Ver conteúdo"** abre `<Dialog>` (ScrollArea) com `<SnapshotReportView wizardType={...} data={reflectionData.data} structureVersion={...} />`.

### 3. Tratamento de fontes pendentes

Definir conjunto **esperado** desta semana para o time:
- `team-checkin` — sempre esperado.
- `leader-prep` — sempre esperado.
- `collaborator` — esperado apenas quando o `realProfileId` do usuário logado é membro do `team_id` ativo (não para admin observando outro time).

Para cada esperado **sem sessão concluída na semana**:
- Card "Pendente" com mensagem clara ("Pré Check-in do Time ainda não foi concluído nesta semana").
- Botão **Preencher agora** (`<Link>` para `/rituals/<rota>?team=<id>`) — internal linking standard.
- Botão secundário **Prosseguir mesmo assim** — apenas dismissa visualmente (estado local), não bloqueia o wizard.

### 4. Remover "Reflexão livre" do Step 1

- Remover o `<Card>` + `<Textarea>` de reflexão em `PreWeeklySourcesStep.tsx`.
- Remover props `sourcesReflection` / `onSourcesReflectionChange` da interface do Step.
- **Manter** o campo `sourcesReflection` em `PreWeeklyDraftData` (retrocompat de drafts existentes), marcado `@deprecated`. Migração de drafts existentes não é bloqueante.
- Atualizar `PreWeeklyPage.tsx` para não passar mais essas props.
- Atualizar `PreWeeklySummary.tsx` para esconder o trecho de reflexão se existir.
- `InlineDecisionInput` **permanece** no footer — produz `decisions`, insumo legítimo do Step 2.

## Arquivos afetados

- `src/modules/okrs/components/wizards/pre-weekly/PreWeeklySourcesStep.tsx` — refatoração principal.
- `src/modules/okrs/components/wizards/pre-weekly/PreWeeklySummary.tsx` — esconder reflexão livre.
- `src/modules/okrs/pages/PreWeeklyPage.tsx` — remover props ao Step 1.
- `src/modules/okrs/types/wizard/weekly.ts` — `@deprecated` em `sourcesReflection`.
- `mem://features/rituals/pre-weekly-v2-sources-scope` — atualizar para refletir o escopo enriquecido (summary + read-only viewer + tratamento de pendentes).

## Não-objetivos

- Não criar nova rota/página de detalhe — usar `Dialog` reaproveitando `SnapshotReportView`.
- Não alterar schema do banco nem migrar drafts antigos.
- Não tocar Steps 2/3/4 além de remover ecos da reflexão livre.
- Não criar novo renderer.

## Validação manual

1. **victorio + ?team=marketing** → 3 cards (team-checkin, leader-prep, collaborator do vitor.severo) com timestamps "há X horas", contadores corretos e nome do autor.
2. **Clique em "Ver conteúdo" no team-checkin** → dialog com `TeamCheckinReport` (decisões, KRs revisados, checklist).
3. **Clique em "Ver conteúdo" no collaborator** → dialog com `CollaboratorReport` (KRs, confianças, reflexão).
4. **Time sem `leader-prep` na semana** → card "Pendente" com botão "Preencher agora" → rota correta.
5. **Step 1 não tem mais "Reflexão livre"**; `InlineDecisionInput` no footer continua funcional.
6. `tsc --noEmit` limpo.

## Aderência ao TCR e canônicos

- BU isolation (`buSupabase` + `currentBuId`).
- Query keys via `preWeeklyKeys.sources` (já canônico).
- Reuso de `SnapshotReportView` (alinhado a `ritual-addendum-standard`).
- Sem `select('*')` — colunas explícitas.
- `React.memo` no `SourceCard`.
- Sem alteração de RLS (políticas já cobrem leitura cross-team por admin/líder).
- Sem reintroduzir filtro `deleted_at` em `okr_wizard_sessions`.
- Internal linking via `<Link>` (não `onClick + navigate`).
