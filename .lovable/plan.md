

## Diagnóstico

**Pré-checklist consultado:** TCR, `ANALYSIS_MODULE.md`, `DEVELOPMENT_STANDARDS` (Regra #4 select(*), #5 query keys, #7 React.memo), `mem://features/rituals/decision-item-standard-v2-updated`, `mem://features/rituals/decision-resolution-governance`, padrões de `tickets` e `projects`.

**Problema:** O card "Discussão" foi construído sem reuso. Componentes/hooks paralelos (`AnalysisCommentList`, `useAnalysisComments`) reimplementam o que `MessageBubble` + `ReplyPreview` + `MessageThreadConfig` já entregam (avatar, timestamp, reply, pin, anexos, mentions). Além disso, ações sugeridas com `type=register_decision` existem mas não viram decisão real.

## Decisão arquitetural

Reusar os dois recursos canônicos:

- **Discussão** → migrar para o sistema genérico `@/components/messaging` (mesmo padrão de `ProjectCommentsSection`).
- **Ações sugeridas com `type=register_decision`** → integrar com `TeamCheckinDecision` reaproveitando `useDecisionThread` / fluxo de decisões dos rituais.

## Plano de ação

### Etapa 1 — Migrar Discussão para o sistema genérico de mensageria

**1.1. Adaptar `useAnalysisComments`** (manter tabela `analysis_comments`, ela já é canônica e está no DATA_MODEL_REGISTRY)
- Acrescentar suporte a `reply_to_comment_id`, `is_pinned`, `pinned_at`, `pinned_by_user_id` e `body_richtext` no select (já remove `select('*')`).
- Migration aditiva: novas colunas opcionais em `analysis_comments` espelhando `project_comments` (`reply_to_comment_id uuid`, `is_pinned boolean default false`, `pinned_at timestamptz`, `pinned_by_user_id uuid`, `body_richtext jsonb`). Manter `body text` por compatibilidade retroativa.
- Hooks adicionais: `useEditAnalysisComment`, `useDeleteAnalysisComment`, `usePinAnalysisComment` (mesma forma que `useProjectCommentMutations`), todos com `realProfileId` (mutation guard) e invalidação via `analysisKeys.commentsPrefix(reportId)`.

**1.2. Substituir `AnalysisCommentList.tsx`** por um wrapper que:
- Converte `AnalysisComment` → `GenericMessage` (helper `analysisCommentToGeneric`).
- Renderiza `<MessageBubble>` com `MessageThreadConfig` (`allowExternalParticipants:false`, `allowPinning:true`, `allowReply:true`, `allowAttachments:false`, `allowMentions:false` — anexos/mentions ficam fora do escopo desta etapa).
- Usa `<ReplyPreview>` e `MentionInput` opcional (alinhado com `ProjectCommentsSection`, mas sem upload e sem mentions no v1).
- Mantém o título "Discussão" e o card no `AnalysisResultPage`.

**1.3. Atualizar tipo `AnalysisComment`** em `src/modules/analysis/types/index.ts` para refletir os novos campos (mantendo compatibilidade com o shape antigo).

### Etapa 2 — Integrar ações sugeridas `register_decision` com o padrão de decisões

**2.1. Botão "Registrar decisão"** em `SuggestedActions` (hoje desabilitado) abre um `Dialog` reaproveitando o componente `InlineDecisionInput` (já usado nos rituais), pré-preenchido com:
- `text` ← `action.suggestedText`
- `category` ← `action.suggestedCategory` (default `"decision"`)
- `owner` ← autor do relatório (`report.author`)
- `linkedReportId` ← `report.id`

**2.2. Persistência:** a decisão é registrada como uma `TeamCheckinDecision` via uma nova `analysis_decisions` (mais simples) **OU** — preferido — via reutilização do mesmo modelo dos rituais, com origem marcada por um campo `source = 'analysis_report'` e `source_id = report.id` em `okr_wizard_sessions` ou tabela própria. **Decisão sugerida:** criar tabela `analysis_decisions` (BU-scoped, RLS por `analysis.report.read:bu`) que armazena `decisions jsonb[]` no shape `TeamCheckinDecision`, e expor via hook `useAnalysisDecisions(reportId)` reusando `useDecisionThread` (que opera sobre JSONB) — o hook já é genérico o bastante para apontar para a nova tabela com pequeno ajuste.

**2.3. Visualização:** abaixo do bloco "Ações sugeridas", novo bloco "Decisões registradas" lista as decisões geradas a partir desta análise usando o mesmo `DecisionFollowUpRow` dos rituais (`mem://decision-resolution-governance` aplica: só dono/admin resolve).

### Etapa 3 — Limpeza e padronização

- Remover o componente duplicado `AnalysisCommentList` interno do `AnalysisResultPage.tsx` (linhas 238+) — manter apenas o de `components/result-blocks/`.
- Atualizar `docs/canonical/ANALYSIS_MODULE.md`:
  - Seção §4: substituir descrição de `AnalysisCommentList` por "wrapper de `MessageBubble`".
  - Seção §2: adicionar `analysis_decisions` se a Etapa 2.2 for aprovada.
  - Seção §9 (anti-padrões): adicionar "❌ Reimplementar thread de mensagens — usar `@/components/messaging`".
- Atualizar testes existentes do módulo conforme novos contratos.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<novo>.sql` | Adiciona colunas a `analysis_comments` (reply/pin/richtext); cria `analysis_decisions` se Etapa 2.2 aprovada |
| `src/modules/analysis/types/index.ts` | Estender `AnalysisComment` |
| `src/modules/analysis/hooks/useAnalysisComments.ts` | Suporte a reply/pin/edit/delete |
| `src/modules/analysis/hooks/useAnalysisCommentMutations.ts` | Novo (espelho de `useProjectCommentMutations`) |
| `src/modules/analysis/components/result-blocks/AnalysisCommentList.tsx` | Reescrito como wrapper de `MessageBubble`/`ReplyPreview` |
| `src/modules/analysis/components/result-blocks/SuggestedActions.tsx` | Habilita botão "Registrar decisão" + abre dialog `InlineDecisionInput` |
| `src/modules/analysis/components/result-blocks/AnalysisDecisionsList.tsx` | Novo bloco de decisões registradas (usa `DecisionFollowUpRow`) |
| `src/modules/analysis/hooks/useAnalysisDecisions.ts` | Novo hook (lista + add) |
| `src/modules/analysis/pages/AnalysisResultPage.tsx` | Remove `AnalysisCommentList` inline; insere `AnalysisDecisionsList` |
| `src/lib/queryKeys/analysis.ts` | Adicionar `decisions(reportId)` + `decisionsPrefix(reportId)` |
| `docs/canonical/ANALYSIS_MODULE.md` | Atualizar seções §2, §4, §5, §9 |

## Confirmação solicitada antes de executar

1. **Tabela para decisões da análise:** criar `analysis_decisions` dedicada (recomendado, isolamento limpo) ou anexar a uma `okr_wizard_sessions` com `session_type='analysis'` (reuso máximo, mas mistura escopos)?
2. **Anexos e mentions na Discussão:** entrar agora (paridade total com `ProjectCommentsSection`) ou ficar fora do v1?

