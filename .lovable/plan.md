## Refazer o Step `summary` do Check-in Individual

Hoje o `CollaboratorSummary` mostra apenas KRs atualizados, KPIs, bloqueadores e reflexão. Mas o ritual coleta muito mais coisas que ficam bufferizadas no draft (marcos, iniciativas em risco, follow-ups e mensagens de pendências, KRs pulados) e só aparecem na hora de gravar — o usuário não vê o que vai ser registrado. Este plano refaz a tela final para **espelhar todo o ritual**, na mesma ordem dos steps, com preview claro do que será gravado ao clicar em **Concluir**.

### Princípio condutor (alinhado a `mem://features/rituals/collaborator-step1-order-mirrors-steps`)

A ordem das seções do Summary **deve espelhar `STEP_ORDER`** (SSOT em `wizardSteps.ts`). O Step 1 já segue essa regra; o Summary passa a segui-la também. Sem hardcode de ordem — derivar da SSOT.

### Seções do novo Summary (ordem derivada de `STEP_ORDER`)

1. **Cabeçalho “Revisão final”** — mantém o aviso “Nada foi gravado ainda. Clique em Concluir para registrar tudo de uma vez.”
2. **Resumo numérico (stats)** — grid responsivo: KRs atualizados, KRs pulados, KPIs atualizados, Marcos alterados, Pendências respondidas, Bloqueadores. Cards clicáveis rolam até a seção correspondente.
3. **Indicadores operacionais (KPIs)** — por KPI: nome (link `/kpis/:id`), valor anterior → novo, data de referência, badge `Consolidado/Parcial`, observação. Sub-bloco discreto para KPIs **pulados**.
4. **Projetos / Marcos** *(NOVO)* — itera `pendingMilestoneStatusChanges` e mostra: nome do milestone, projeto, status anterior → novo (badge com tokens semânticos). Vazio → "Nenhum marco alterado".
5. **Iniciativas** *(NOVO)* — itera `initiativesMarkedAtRisk` e marca como “Sinalizada como em risco”. Vazio → "Nenhuma iniciativa sinalizada".
6. **KRs atualizados** — bloco atual reaproveitado, **mais** uma sub-seção “KRs pulados” (hoje some completamente).
7. **Bloqueadores** — mantém.
8. **Pendências (decisões)** *(NOVO)* — renderiza:
   - `pendingFollowUpUpdates`: por decisão, título + novo `followUpStatus` (resolvida/pendente) + campos alterados.
   - `pendingThreadMessages`: agrupa por decisão, contagem + preview da última mensagem.
   - Vazio → "Sem atualizações em pendências".
9. **Reflexão** — mantém.
10. **Ações secundárias** — “Copiar resumo” (template Markdown atualizado para incluir as novas seções) + “Ver OKRs”.
11. **Footer** — mantém `WizardLastStepFooter` (Voltar + Concluir com confirmação).

Cada seção tem cabeçalho com ícone, contagem, estado vazio explícito e atalho **“Editar”** que volta ao step correspondente.

### Detalhes técnicos

**Arquivos**
- Reescrita: `src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx`.
- Atualização leve: `src/modules/okrs/pages/CollaboratorCheckinPage.tsx` (passar novos props).

**Novos props do `CollaboratorSummary`**
```ts
pendingMilestoneStatusChanges?: PendingMilestoneStatusChange[];
pendingFollowUpUpdates?: PendingDecisionFollowUpUpdate[];
pendingThreadMessages?: PendingDecisionThreadMessage[];
visibleStepOrder: readonly WizardStep[]; // para derivar a ordem das seções
onEditStep?: (stepId: WizardStep) => void;
```

**Lookups de nome (read-only, somente para resolver títulos no preview)** — todos respeitando os Core rules:
- `useBuScopedSupabase` + filtro síncrono por `currentBuId`.
- Colunas explícitas (proibido `select('*')`).
- Soft deletes: `deleted_at IS NULL` para `project_milestones` e `okr_initiatives` (ambos **só têm `deleted_at`**, conforme `mem://standards/soft-delete-policy-v1`).
- Query keys via helpers em `src/lib/queryKeys/*` (criar prefixo dedicado se necessário, ex.: `queryKeys.collaborator.summaryLookup(...)`).
- Reuso primeiro: verificar se já existem `useMilestonesByIds` / `useInitiativesByIds`. Se não, criar hooks pequenos co-localizados, com `enabled: ids.length > 0`.
- Decisões: `useMyPendingDecisions(effectiveUserId)` já é consumido pelo step e pode ser reusado para resolver título (via `select`/projeção).

**Performance** (`mem://standards/frontend-memoization-standard`)
- Cards de cada item (`MilestoneSummaryCard`, `InitiativeSummaryCard`, `KrSummaryCard`, `KpiSummaryCard`, `PendencyCard`) com `React.memo`.
- `useMemo` para agrupar mensagens por decisão e para stats.

**A11y / UI**
- Cada seção em `<section aria-labelledby>` com heading semântico.
- Badges de mudança usam tokens semânticos (`bg-status-green-muted`, `bg-status-orange-muted`, etc.) — proibido cor hardcoded.
- Mobile (viewport ≤ 889px): stats em `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`; listas em coluna única; ações secundárias com `flex-wrap`.
- Padrão `WizardStepScaffold` mantido (header fixo + scroll + footer fixo) — sem mexer no shell.

**Snapshot / persistência**
- Zero alteração em `handleComplete`, mutations, draft ou snapshot persistido.
- Conformidade com `mem://standards/wizard-snapshot-denormalized-fields-deprecation`: o Summary **prefere lookup por ID** ao invés de campos denormalizados (`krTitle`, `kpiName`, etc.) que estão `@deprecated`. Mantém fallback para snapshots antigos.

**Framework Unificado (TCR §4.8.1)**
- `CollaboratorSummary.tsx` é renderer **legado específico** (não está em `framework/components/`), portanto editá-lo **não viola** a regra de agnosticismo do framework. Confirmado via inspeção do TCR.

### Critérios de aceitação

- Ao chegar no `?step=summary`, o usuário vê **uma seção por step preenchido** do ritual, na ordem de `STEP_ORDER`, com contagens corretas.
- Marcos alterados, iniciativas em risco e atualizações de pendências aparecem antes do clique em Concluir (hoje não aparecem).
- KRs pulados ficam visíveis em sub-bloco discreto.
- Estados vazios são explícitos (“Nenhum marco alterado”, etc.) — sem seção fantasma.
- Botão **Concluir** continua persistindo tudo em batch (comportamento já implementado, intacto).
- Botão **Editar** em cada seção volta ao step correspondente preservando o draft.
- “Copiar resumo” inclui as novas seções no Markdown.

### Fora de escopo

- Não mexer em persistência, mutations, hooks de draft, nem nos outros steps.
- Não introduzir mutations novas — apenas leituras para resolver nomes.
- Não alterar footer/confirmação/shell.
- Não tocar snapshot persistido nem `structure_version`.
