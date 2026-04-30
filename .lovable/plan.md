# Plano — Revisão dos cards da etapa Resumo (MBR-pré e QBR-pré)

## Objetivos

Aplicar três frentes na summary dos pré-ritos, **mantendo simetria entre MBR-pré e QBR-pré** e reutilizando componentes compartilhados:

1. **Corrigir bugs e dados faltando** (card KPIs vazio, nomes via campo deprecated, contagens incompletas).
2. **Padronizar UX visual** (mesmos headers, ícones, ordem e densidade entre os dois ritos).
3. **Permitir editar tudo na summary** (Destaques/Aprendizados, Próximos Passos, Notas e decisões) — segue o padrão recém-aplicado a "Sugestões de pauta".

## Conformidade com TCR / docs canônicos

- `WIZARDS_FRAMEWORK_BOUNDARY.md`: mudanças isoladas no módulo OKR.
- `wizard-snapshot-denormalized-fields-deprecation` (mem): substituir `kr.krTitle` (deprecated) por `useEntityLookup({ teamKrIds })` com fallback ao campo legado.
- `frontend-memoization-standard`: novos cards extraídos serão `React.memo`.
- **Centralização**: nenhum componente novo de input — vamos **reutilizar** `InlineDecisionInput`, `InlineAgendaSuggestionInput`, e os mesmos `Textarea`/`Input` dos steps de Highlights/Learnings/NextSteps. As edições inline atualizam o draft via os mesmos handlers (`updateDraft({ highlights })`, etc.) já existentes nas páginas.
- Sem mudanças de schema, RLS, queries ou snapshot; apenas frontend.

## Diagnóstico atual (MBR-pré + QBR-pré)

| Card | Bug / gap |
|---|---|
| Balanço | Usa `kr.krTitle` (deprecated). Limitado a top-5 sem expandir. |
| KPIs | **Corpo vazio** — só header com contagem. |
| Destaques (MBR) / Aprendizados (QBR) | `line-clamp-2`, sem editar. |
| Próximos Passos (MBR) | Mostra só top-3, sem editar; cross-deps só como contador. |
| Proposta de OKRs (QBR) | Só título do objetivo + contagem; sem ver KRs nem editar (link para o step?). |
| Notas e decisões | Bullets `• texto` read-only — perde categoria/owner/deadline; sem add/edit/remove. |
| Pauta | ✅ Já corrigido na rodada anterior. |

## Proposta de redesign — comum aos dois ritos

Estrutura final padronizada na ordem:

```text
1) Balanço do {período}
2) KPIs do período
3) Destaques (MBR) / Aprendizados (QBR)
4) Próximos Passos (MBR) / Proposta de OKRs (QBR)
5) Sugestões de pauta para o {rito-mãe}    ← já feito
6) Notas e decisões
```

Cada card segue o mesmo padrão visual:
- Header com ícone + título + contagem entre parênteses.
- Sub-header com 1 linha de descrição/contexto.
- Conteúdo com cap visual de N itens + botão "Ver todos (X)" que expande inline (sem modal).

### 1) Balanço — correções
- Resolver nome do KR via `useEntityLookup({ teamKrIds: krFinalStates.map(k => k.krId) })`, fallback `kr.krTitle ?? '—'`.
- Mostrar contadores por estado (alcançado / no caminho / em risco / atrasado), não só "alcançados".
- Substituir `slice(0,5)` por expand/collapse "Ver todos os {N} KRs".

### 2) KPIs — preencher o corpo
- Lista compacta de cada KPI: ícone RAG (verde/amarelo/vermelho), nome, valor atual formatado pela `unit`, badge "consolidado/parcial" quando aplicável.
- Cap de 5 visíveis + expand "Ver todos os {N} KPIs".
- Estado vazio: "Nenhum KPI registrado neste rito".

### 3) Destaques (MBR) / Aprendizados (QBR) — editáveis inline
- Os três sub-blocos (Acelerou/Travou/Decisão para MBR; Continuar/Parar/Dívidas para QBR) renderizados com `Textarea` igual aos steps originais, **não mais** `<p line-clamp-2>`.
- Cada `Textarea` faz `onChange` → handler novo prop `onHighlightsChange` (MBR) / `onLearningsChange` (QBR). Ambos handlers já existem nas páginas (`updateDraft({ highlights })`, `updateDraft({ learnings })`) — basta passá-los para a summary.
- Header do card explicita "Editável — alterações são salvas no rascunho automaticamente".

### 4) Próximos Passos (MBR) — editável inline
- Reaproveita o pequeno bloco de adição/remoção de itens já presente em `MbrPreNextStepsStep` (campo `Input` + botão `Plus` + lista com `Trash2`). Para evitar duplicação, **extrair** o sub-bloco "lista dinâmica de strings" desse step para um helper compartilhado em `shared/InlineStringListEditor.tsx` e consumi-lo nos dois lugares (step e summary).
- Foco continua como `Textarea` editável.
- Cross-dependências também viram editáveis (mesma `InlineStringListEditor`).
- Handler novo prop `onNextStepsChange` ligado a `updateDraft({ nextSteps })`.

### 4') Proposta de OKRs (QBR) — leitura mais rica + ação clara
- Para cada `proposedOkr`: mostrar título do objetivo, todos os `draftKrs.title` (sem cap; lista pequena por natureza) e badges com `direction`/`unit` quando preenchidos.
- Edição plena fica no step "Proposta de OKRs"; aqui adicionamos um botão "Editar nesta etapa" que chama `goToStep('okr-proposal')` (callback novo prop opcional `onJumpToStep`).

### 6) Notas e decisões — editáveis inline
- Substituir lista bullet pelo `InlineDecisionInput` (mesmo componente do step), com `sourceStep="summary"`.
- Mostrar **todas** as decisões agrupadas por categoria, com remoção/edição inline (já suportadas pelo componente).
- Handler novo prop `onDecisionsChange` ligado a `updateDraft({ decisions })`.

## Detalhes técnicos

### Arquivos a editar
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreSummary.tsx`
- `src/modules/okrs/components/wizards/qbr-pre/QbrPreSummary.tsx`
- `src/modules/okrs/pages/MbrPrePage.tsx` — passar handlers `onHighlightsChange`, `onNextStepsChange`, `onDecisionsChange` para a summary.
- `src/modules/okrs/pages/QbrPrePage.tsx` — passar `onLearningsChange`, `onDecisionsChange`, `onJumpToStep`.
- `src/modules/okrs/components/wizards/shared/index.ts` — exportar novos helpers.

### Arquivos novos (componentes shared, sem duplicação)
- `src/modules/okrs/components/wizards/shared/InlineStringListEditor.tsx` — extração do bloco "lista dinâmica de strings com add/remove" usado hoje em `MbrPreNextStepsStep`. Será usado tanto no step quanto na summary (refator do step para consumi-lo, garantindo SSOT).
- `src/modules/okrs/components/wizards/shared/SummaryKpiList.tsx` — lista compacta de KPIs com RAG + unidade + cap/expand. Usa `formatNumberByUnit` já existente.
- `src/modules/okrs/components/wizards/shared/SummaryKrBalance.tsx` — card de balanço de KRs com lookup canônico de nomes e contadores por estado. Substitui o JSX inline duplicado entre `MbrPreSummary` e `QbrPreSummary`.

### Padrões aplicados
- Todos os novos componentes shared envolvidos em `React.memo`.
- Resolução de nomes via `useEntityLookup` (BU-aware via `useOptionalBuClient`).
- Edição inline reaproveita os mesmos `Textarea`/`Input` dos steps — zero duplicação de UI primitives.
- Query keys: nenhuma nova; `useEntityLookup` já usa `okrsKeys.entityLookup`.

## Riscos e mitigação

- **Risco**: editar `highlights`/`nextSteps` na summary marca o draft como dirty e re-renderiza. **Mitigação**: handlers já existentes (`updateDraft`) são debounced no nível da página — comportamento idêntico ao dos steps.
- **Risco**: refator do `MbrPreNextStepsStep` para consumir `InlineStringListEditor` pode regredir comportamento. **Mitigação**: trocar JSX preservando exatamente as mesmas props/callbacks; cobrir com smoke manual no preview.
- **Risco**: `useEntityLookup` faz query — se a summary for o primeiro lugar a abrir, há um pequeno loading. **Mitigação**: usar fallback `kr.krTitle` enquanto carrega; lookup é compartilhado/cacheado.

## Verificação

- Build automático.
- QA manual no preview em `/rituals/mbr-pre?...&step=summary` e `/rituals/qbr-pre?...&step=summary`:
  - Card KPIs lista os KPIs com RAG e valores.
  - Nomes de KRs corretos (mesmo em snapshots antigos sem `krTitle`).
  - Edição de Destaques/Aprendizados, Próximos Passos e Notas/Decisões persistem ao trocar de step e voltar.
  - Botão "Editar" da Proposta de OKRs (QBR) leva ao step correto.
  - "Sugestões de pauta" continua funcionando como na rodada anterior.
