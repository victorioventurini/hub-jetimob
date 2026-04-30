# Plano — Permitir adicionar/editar/remover sugestões de pauta na etapa final (MBR-pré e QBR-pré)

## Contexto

Hoje, na summary do MBR-pré e do QBR-pré, o card "Sugestões de pauta" usa o `AgendaSuggestionsPrioritizer`, que **só permite priorizar** sugestões já coletadas nas etapas anteriores. Se o usuário não registrou nenhuma pauta durante o rito, o card simplesmente não aparece (`if (suggestions.length === 0) return null`).

O usuário quer:

1. Que a summary tenha o **mesmo padrão de UX** do `InlineDecisionInput` (collapsible inline com categorias e remoção), permitindo **adicionar, editar e remover** sugestões de pauta direto na etapa final.
2. Que o card apareça **mesmo quando não houve nenhuma sugestão** nas etapas anteriores.
3. Continuar permitindo a **priorização de até 3** (comportamento já existente).

## Conformidade com TCR / docs canônicos

- `WIZARDS_FRAMEWORK_BOUNDARY.md`: mudança restrita ao módulo OKR (wizards MBR-pré e QBR-pré) — sem tocar no framework genérico.
- **Centralização de componentes** (instrução do projeto): vamos **reaproveitar** `InlineAgendaSuggestionInput` e `InlineCollapsibleEntryInput` já existentes — nenhum componente novo será criado. O `AgendaSuggestionsPrioritizer` será **estendido** (uma prop opcional) para também aceitar adição/remoção quando renderizado na summary.
- `Wizard Vocabulary Canonical` (mem): mantemos o enum `RitualBlock` (performance/projetos/pessoas) já usado por sugestões.
- Sem mudanças em RLS, queries, snapshots ou tipos de dados — o `RitualAgendaSuggestion` já tem `sourceStep`, então sugestões adicionadas na summary serão marcadas com `sourceStep: 'summary'`.

## Comportamento detalhado

### A) Estender o componente `AgendaSuggestionsPrioritizer`

Hoje ele apenas lista e prioriza. Vamos transformá-lo em um card "completo" que:

1. **Sempre renderiza** (remover o `if (suggestions.length === 0) return null`).
2. No topo do `CardContent`, renderizar o **`InlineAgendaSuggestionInput`** (mesmo componente já usado nos steps), com:
   - `sourceStep="summary"`
   - `triggerLabel="Adicionar sugestão de pauta para o {ritualLabel}"`
   - O collapsible aparece fechado por padrão e expande ao clicar — exatamente como o `InlineDecisionInput`.
3. Logo abaixo, manter a lista agrupada por categoria com checkbox de priorização **e adicionar um botão de remover (ícone X)** ao lado de cada item, espelhando a UX do `InlineAgendaSuggestionInput`. Edição segue o mesmo padrão do `InlineCollapsibleEntryInput` (clique no item abre edição inline) — **se** for trivial reutilizar; caso contrário, manter remoção + re-adicionar como UX mínima (a ser confirmada na implementação após inspecionar `DecisionCard`/edição inline atual).
4. Quando há sugestões, manter o aviso amarelo de priorização e o contador `(N/3 marcadas)`.
5. Quando **não há** nenhuma sugestão, exibir um estado vazio sutil: "Nenhuma sugestão de pauta registrada. Adicione abaixo se quiser propor pontos para o {ritualLabel}." — sem o aviso amarelo.

### B) Atualizar `MbrPreSummary` e `QbrPreSummary`

- Renderizar o `AgendaSuggestionsPrioritizer` **sempre** (remover o guard `agendaSuggestions.length > 0`).
- Continuar passando `suggestions`, `onSuggestionsChange` e `ritualLabel`.

### C) Garantir consistência entre os dois ritos

A mudança vive **toda dentro do componente compartilhado** `AgendaSuggestionsPrioritizer` + `InlineAgendaSuggestionInput`, que já é consumido pelos dois ritos. Logo, qualquer ajuste se propaga automaticamente — atende à instrução de "ajustes impactam todos os rituais".

## Detalhes técnicos

- Arquivos editados:
  - `src/modules/okrs/components/wizards/shared/AgendaSuggestionsPrioritizer.tsx` — adicionar input inline no topo, botão remover por item, estado vazio.
  - `src/modules/okrs/components/wizards/mbr-pre/MbrPreSummary.tsx` — sempre renderizar o card.
  - `src/modules/okrs/components/wizards/qbr-pre/QbrPreSummary.tsx` — sempre renderizar o card.
- Reutilizar `InlineAgendaSuggestionInput` (zero duplicação).
- Manter `memo` e API existente; adicionar apenas comportamento, sem novas props obrigatórias.
- Sugestões criadas na summary recebem `sourceStep: 'summary'` — não interferem em filtros dos steps anteriores (que filtram por `sourceStep` específico).

## Verificação

- Build automático.
- QA manual no preview em `/rituals/mbr-pre?...&step=summary` e `/rituals/qbr-pre?...&step=summary`:
  - Card aparece mesmo sem sugestões prévias.
  - Adicionar uma nova sugestão funciona e ela aparece na lista, podendo ser priorizada e removida.
  - Sugestões trazidas dos steps anteriores continuam podendo ser priorizadas (até 3) e removidas.
- Confirmar que ao salvar/enviar a summary, as sugestões adicionadas em `step=summary` persistem no draft/snapshot.
