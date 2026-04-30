
# Plano — Sugestões de Pauta nos Wizards MBR-pré e QBR-pré

## Objetivo

Permitir que o líder, ao longo do MBR-pré e do QBR-pré, registre **sugestões de pauta** para o rito-mãe (MBR / QBR Meeting), categorizadas em **Performance**, **Projetos**, **Pessoas**. No step final de "Resumo e Envio", listar todas as sugestões coletadas e exigir a priorização de até **3** delas, que serão consumidas pelo rito-mãe.

A UX do registro inline reaproveita o mesmo padrão visual/funcional do `InlineDecisionInput` (collapsible, badges de categoria, lista compacta abaixo) — **sem duplicar o componente**.

---

## Análise técnica (pré-checklist)

Documentos consultados:
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (§4.8 — wizards framework)
- `docs/canonical/WIZARDS_FRAMEWORK_BOUNDARY.md`
- `.lovable/memory/standards/wizard-vocabulary-canonical.md`
- `.lovable/memory/architecture/wizards/wizards-master-standard.md` (via index)
- `.lovable/memory/standards/wizard-snapshot-denormalized-fields-deprecation.md`

Achados-chave que orientam a solução:

1. **`RitualBlock` já existe** em `src/modules/okrs/types/wizard/vocabulary.ts` com exatamente os 3 valores pedidos: `'performance' | 'projetos' | 'pessoas'`. Não criar enum novo — reusar SSOT.
2. `InlineDecisionInput` é o componente canônico para registro inline em qualquer step. Está em `src/modules/okrs/components/wizards/shared/InlineDecisionInput.tsx` e já cobre: collapsible, badges de categoria, textarea auto-submit, lista filtrada por `sourceStep`. **Mas é fortemente acoplado a `TeamCheckinDecision`** (categorias `decision | focus_adjustment | next_step | strategic_proposal`) — não dá para passar `RitualBlock` direto.
3. MBR-pré e QBR-pré **não vivem dentro do framework genérico** (`framework/components/`) — usam steps próprios em `mbr-pre/` e `qbr-pre/` montados via `WizardStepScaffold` + footer manual. Logo, **não preciso** alterar `_InlineDecisionsSlot` nem `STEP_DEFINITIONS`.
4. Drafts persistidos via `useWizardDraft` em `MbrPreDraftData` e `QbrPreDraftData` (campo `decisions` já existe). Vou adicionar o array de sugestões no mesmo nível.
5. Snapshots gravados em `okr_wizard_sessions.reflection_data` (JSONB) — adicionar campos novos é compatível com snapshots antigos (leitura defensiva).

---

## Decisões de arquitetura

### 1. Refator pequeno em `InlineDecisionInput` → componente genérico reutilizável

`InlineDecisionInput` ganha capacidade de operar em **dois modos** sem duplicação, via composição:

- **Modo `decision`** (atual, default): mantém comportamento e aparência atuais.
- **Modo `agenda`**: troca categorias, label/ícone do trigger e placeholder, mas mantém toda a UX (collapsible, lista compacta, textarea auto-submit, contagem em badge).

Para evitar inflar `InlineDecisionInput` com lógica de duas entidades distintas, extraio a casca visual em um componente novo **`InlineCollapsibleEntryInput`** (em `shared/`), e:
- `InlineDecisionInput` passa a ser um wrapper fino que injeta as categorias de decisão.
- Crio `InlineAgendaSuggestionInput` como segundo wrapper fino que injeta as categorias `RitualBlock`.

Isso preserva o contrato existente de `InlineDecisionInput` (zero refactor nos 19 wizards consumidores) **e** evita duplicação visual.

### 2. Tipo de dado canônico

Em `src/modules/okrs/types/wizard/shared.ts`, adicionar:

```ts
export interface RitualAgendaSuggestion {
  id: string;
  text: string;
  category: RitualBlock;             // 'performance' | 'projetos' | 'pessoas'
  sourceStep: string;                 // step de origem dentro do wizard
  prioritized?: boolean;              // marcado no Summary (até 3)
  priorityRank?: 1 | 2 | 3;           // ordem da priorização
  createdAt: string;                  // ISO
}
```

Tipo é genérico (serve a qualquer rito preparatório futuro: weekly, qbr-clevel, etc.).

### 3. Persistência no draft

- `MbrPreDraftData.agendaSuggestions: RitualAgendaSuggestion[]` (default `[]`)
- `QbrPreDraftData.agendaSuggestions: RitualAgendaSuggestion[]` (default `[]`)
- Gravar no snapshot final junto com o restante via os mesmos hooks de complete já existentes — sem nova migration nem coluna nova (JSONB).

### 4. Plug nos steps existentes

Em **cada** step ativo dos dois wizards, inserir `<InlineAgendaSuggestionInput>` no rodapé do `WizardStepScaffold`, **acima** do `WizardStepFooter` (mesmo padrão do `_InlineDecisionsSlot`). Steps afetados:

- **MBR-pré**: `balance`, `kpi-analysis`, `highlights`, `next-steps` (4 steps; `summary` não recebe input).
- **QBR-pré**: `balance`, `kpi-analysis`, `learnings`, `okr-proposal` (4 steps; `summary` não recebe input).

Como esses steps **não** estão no framework genérico, o slot é renderizado diretamente no JSX do step (igual ao padrão dos demais inputs locais). Cada step recebe duas novas props: `agendaSuggestions` e `onAgendaSuggestionsChange`, no mesmo formato das props de `decisions`.

### 5. Step de Resumo — priorização

Em `MbrPreSummary` e `QbrPreSummary`:

- Nova seção **"Sugestões de pauta para o {MBR|QBR}"**, agrupada visualmente por `RitualBlock` (Performance / Projetos / Pessoas) com contagem.
- Cada sugestão exibe um checkbox de "Priorizar". Limite de **3 marcadas**: ao tentar marcar a 4ª, a opção fica `disabled` com tooltip "Limite de 3 sugestões prioritárias atingido". As 3 marcadas recebem `priorityRank` 1/2/3 conforme ordem de marcação.
- O botão de envio fica habilitado normalmente (priorização é **opcional**, mas recomendada — banner informativo "Recomendamos priorizar até 3 sugestões para o rito" quando houver ≥1 sugestão e nenhuma priorizada).

### 6. Consumo no rito-mãe (fora do escopo desta entrega)

Os snapshots gravados estarão imediatamente disponíveis para o MBR (consumindo via `MbrPreTeamSubmission`) e para o QBR Meeting (via leitura agregada de pre-QBRs por time). A UI de leitura no rito-mãe **não** faz parte desta entrega — fica para a próxima iteração (anotar como follow-up).

---

## Arquivos afetados

**Novos**
- `src/modules/okrs/components/wizards/shared/InlineCollapsibleEntryInput.tsx` (casca extraída)
- `src/modules/okrs/components/wizards/shared/InlineAgendaSuggestionInput.tsx` (wrapper para `RitualBlock`)
- `src/modules/okrs/components/wizards/shared/AgendaSuggestionsPrioritizer.tsx` (componente do Summary, reutilizável)

**Editados**
- `src/modules/okrs/components/wizards/shared/InlineDecisionInput.tsx` — refactor interno para usar a casca extraída (API pública intacta).
- `src/modules/okrs/components/wizards/shared/index.ts` — exports dos novos componentes.
- `src/modules/okrs/types/wizard/shared.ts` — `RitualAgendaSuggestion`.
- `src/modules/okrs/types/wizard/mbr.ts` — `agendaSuggestions` em `MbrPreDraftData`.
- `src/modules/okrs/types/wizard/qbr.ts` — `agendaSuggestions` em `QbrPreDraftData`.
- `src/modules/okrs/pages/MbrPrePage.tsx` — default `agendaSuggestions: []` + propagar nos 4 steps + Summary.
- `src/modules/okrs/pages/QbrPrePage.tsx` — idem.
- 4 steps MBR-pré: `MbrPreBalanceStep`, `MbrPreKpiAnalysisStep`, `MbrPreHighlightsStep`, `MbrPreNextStepsStep` — receber props e renderizar `InlineAgendaSuggestionInput` no scaffold.
- 4 steps QBR-pré: `QbrBalanceStep`, `QbrKpiAnalysisStep`, `QbrLearningsStep`, `QbrOkrProposalStep` — idem.
- `MbrPreSummary` e `QbrPreSummary` — nova seção de priorização (via `AgendaSuggestionsPrioritizer`).

**Sem mudanças de banco** (JSONB já comporta o campo novo; leitura defensiva nos consumidores).

---

## UX detalhada do registro inline

```text
┌────────────────────────────────────────────────────────────┐
│ 📋 Registrar sugestão de pauta para o MBR        [2] ⌄    │  ← trigger collapsible
├────────────────────────────────────────────────────────────┤
│ [Performance] [Projetos] [Pessoas]                          │  ← 3 badges (RitualBlock)
│ ┌──────────────────────────────────────────────┐ ┌──┐      │
│ │ Descreva o ponto a discutir no rito...        │ │+ │     │
│ └──────────────────────────────────────────────┘ └──┘      │
│ • [Pessoas] Discutir backfill do squad de Onboarding  ✕    │
│ • [Performance] Revisar KR-3 abaixo da linha          ✕    │
└────────────────────────────────────────────────────────────┘
```

Mesmo padrão visual do `InlineDecisionInput`, com label/ícone trocados (`ListTodo` em vez de `Lightbulb`) e placeholder customizado.

---

## Validação

- Type-check: `RitualAgendaSuggestion` e os campos novos nos drafts devem compilar sem erros.
- Smoke manual: abrir MBR-pré e QBR-pré, adicionar sugestão em cada step, navegar até o Summary, marcar 3 (a 4ª deve bloquear), enviar e conferir o snapshot em `okr_wizard_sessions.reflection_data`.
- Sem CRUD em banco: nenhuma migration. Sem Edge Function nova.

---

## Follow-ups (fora do escopo)

1. Renderizar as sugestões priorizadas no `MbrPage` / `QbrMeetingPage` (provavelmente em um novo step "Pauta sugerida" ou no opening).
2. Documentar `RitualAgendaSuggestion` no TCR (§4.8 wizards / vocabulário) e atualizar `wizard-vocabulary-canonical` em memória.
