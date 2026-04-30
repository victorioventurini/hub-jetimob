## Plano — Sugestões de pauta nos ritos pré-MBR e pré-QBR (Fase 2/2)

Conclusão da feature iniciada na fase anterior. Componentes já existem (`InlineAgendaSuggestionInput`, `AgendaSuggestionsPrioritizer`, tipos `RitualAgendaSuggestion`, `agendaSuggestions` nos drafts). Falta integrar nos steps restantes, fazer o wiring nas páginas e exibir o priorizador no resumo.

### O que já está pronto (não tocar)

- Tipos: `RitualAgendaSuggestion`, `agendaSuggestions[]` em `MbrPreDraftData` e `QbrPreDraftData`.
- Componentes shared: `InlineCollapsibleEntryInput`, `InlineAgendaSuggestionInput`, `AgendaSuggestionsPrioritizer`.
- Steps QBR (Balance, KpiAnalysis, Learnings): já recebem props opcionais (`agendaSuggestions`, `onAgendaSuggestionsChange`, `agendaTriggerLabel`) e renderizam o input no `bottomFixed`.
- Default data nos drafts já contém `agendaSuggestions: []`.

### O que falta (esta fase)

#### 1. Steps MBR específicos (mesma extensão dos QBR)
- `MbrPreHighlightsStep.tsx` — adicionar props opcionais de agenda + render no `bottomFixed`.
- `MbrPreNextStepsStep.tsx` — idem.

(Os steps 1 e 2 do MBR-pré reusam `QbrBalanceStep` e `QbrKpiAnalysisStep`, que já aceitam as props.)

#### 2. Wiring nas páginas

**`MbrPrePage.tsx`** — passar para os 4 steps de captura:
```ts
agendaSuggestions={draft.data.agendaSuggestions ?? []}
onAgendaSuggestionsChange={(next) => updateDraft({ agendaSuggestions: next })}
agendaTriggerLabel="Registrar sugestão de pauta para o MBR"
```

**`QbrPrePage.tsx`** — idem nos 4 steps de captura (Balance, KpiAnalysis, Learnings, OkrProposal), com label `"Registrar sugestão de pauta para o QBR"`.

#### 3. Step OkrProposal (QBR) — adicionar suporte
- `QbrOkrProposalStep.tsx` ainda não tem as props. Estender com o mesmo padrão dos demais steps QBR (props opcionais + `bottomFixed`). Sem mudar a lógica de proposta.

#### 4. Summaries — integrar `AgendaSuggestionsPrioritizer`

**`MbrPreSummary.tsx`**:
- Adicionar import do `AgendaSuggestionsPrioritizer`.
- Renderizar antes da seção de decisões (ou perto do final, antes do footer):
```tsx
<AgendaSuggestionsPrioritizer
  suggestions={draftData.agendaSuggestions ?? []}
  onSuggestionsChange={...}
  ritualLabel="MBR"
/>
```
- Adicionar prop `onAgendaSuggestionsChange` ao `MbrPreSummaryProps` e propagar em `MbrPrePage` (`updateDraft({ agendaSuggestions: next })`).

**`QbrPreSummary.tsx`**: idêntico, com `ritualLabel="QBR"`. Mesma adição de prop e wiring na page.

#### 5. Persistência no completar
- Os `agendaSuggestions` já fazem parte do `draft.data` (JSONB), então o snapshot atual em `reflection_data` já vai gravá-los automaticamente — sem mudanças no `handleComplete` nem migrations.
- Apenas um log/toast mais descritivo é opcional; manter o fluxo atual.

### Arquivos editados

- `src/modules/okrs/components/wizards/mbr-pre/MbrPreHighlightsStep.tsx`
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreNextStepsStep.tsx`
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreSummary.tsx`
- `src/modules/okrs/components/wizards/qbr-pre/QbrOkrProposalStep.tsx`
- `src/modules/okrs/components/wizards/qbr-pre/QbrPreSummary.tsx`
- `src/modules/okrs/pages/MbrPrePage.tsx`
- `src/modules/okrs/pages/QbrPrePage.tsx`

### Garantias de design / arquitetura

- **Não duplica componentes**: 100% reutiliza `InlineAgendaSuggestionInput` e `AgendaSuggestionsPrioritizer` já criados.
- **Vocabulário canônico**: categorias `RitualBlock` (Performance/Projetos/Pessoas) — SSOT em `vocabulary.ts`.
- **BU isolation**: dado é mantido no draft do wizard; persistência segue o mesmo path do `agendaSuggestions` no JSONB do `reflection_data` que já obedece RLS por `bu_id`.
- **Sem migrations**: nenhuma tabela nova; sem CHECK constraints.
- **Tokens semânticos**: prioritizer já usa `border-status-amber/30`, `bg-status-amber-muted/40`, `border-primary/40` etc.
- **Limite de 3 priorizações**: enforced no `AgendaSuggestionsPrioritizer` (checkbox disabled na 4ª tentativa + banner informativo quando 0 marcadas).
- **Compatibilidade retro**: drafts antigos sem `agendaSuggestions` resolvem com `?? []` em todos os pontos.

### Fora de escopo

- Nenhuma alteração em `MbrPage` (rito ao vivo) ou `QbrPage`. As pautas priorizadas serão consumidas por esses ritos numa fase futura — esta entrega cobre apenas captura + priorização nos PRÉ.
