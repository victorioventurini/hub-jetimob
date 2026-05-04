# Plano — Propagação completa Pré-MBR → MBR

## Pré-checklist (executado)
- TCR `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` v3.29.1 — consultado
- `docs/canonical/IDENTITY_CONVENTION.md`, `PERMISSIONS_AND_RBAC_MODEL.md`, `DATA_MODEL_REGISTRY.md` — disponíveis e respeitados
- Mem rules: BU isolation, soft deletes, no `select("*")`, `mbrKeys`, ritual labels SSOT, snapshot denorm deprecation
- Código fonte de verdade do pareamento: `useMbrPreSubmissions.ts` + tipo `MbrPreTeamSubmission`

## Diagnóstico (gap atual)

`MbrPreDraftData` coleta **13 áreas de dado** no Pré-MBR. Hoje só **4** chegam ao MBR via `MbrPreTeamSubmission`:

| Campo do Pré-MBR | Está em `MbrPreTeamSubmission`? | Está sendo exibido no MBR? |
|---|---|---|
| `highlights` (acelerou/travou/precisa decisão) | sim | sim — Detail step (card "Preparação do líder") |
| `nextSteps` (foco, prioridades, cross-deps) | sim | sim — Detail step |
| `kpisToCreate` | sim | parcial — só agrega contagem em `mbrPreSurfacedItems` (Panorama), nunca lista |
| `krFinalStates` | sim | **não exibido** |
| `kpiJustifications` (RAG ≠ verde) | **NÃO** | não |
| `kpiNoDataReasons` (bucket no_data) | **NÃO** | não |
| `kpiOutdatedUpdates` (KPIs atualizados durante o rito) | **NÃO** | não |
| `projectJustifications.projects` / `.milestones` | **NÃO** | não |
| `krJustifications` | **NÃO** | não |
| `agendaSuggestions` (sugestões de pauta) | **NÃO** | não |
| `monthAnalysis` (análise IA mensal) | **NÃO** | não |
| `decisions` (registradas durante o pré) | **NÃO** | não — mas `useCarryOverDecisions` já cobre via outro caminho (verificar) |
| Addendums da sessão | sim | sim — `AddendumBadge` no Detail step |

Resultado: o MBR está cego para a maior parte do trabalho reflexivo do líder.

## Mudanças propostas

### 1. Expandir `MbrPreTeamSubmission` (types)
Arquivo: `src/modules/okrs/types/wizard/mbr.ts`

Adicionar todos os campos faltantes da `MbrPreDraftData` ao tipo `MbrPreTeamSubmission`:
`kpiJustifications`, `kpiNoDataReasons`, `kpiOutdatedUpdates`, `projectJustifications`, `krJustifications`, `agendaSuggestions`, `monthAnalysis`, `decisions`.

### 2. Hidratar tudo no hook `useMbrPreSubmissions`
Arquivo: `src/modules/okrs/hooks/useMbrPreSubmissions.ts`

No bloco que monta `byTeam[teamId] = { ... }` (linhas 194–205), copiar os novos campos do `draftData` com defaults seguros (`{}`, `[]`, `null`). Sem nova query — tudo já está no `reflection_data`.

### 3. Exibir no MBR Detail step (por time)
Arquivo: `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep.tsx`

Estender o card "Preparação do líder" (já existente, linhas 244–319) com seções colapsáveis adicionais quando houver dado:
- Justificativas de KPI fora da meta (lista kpiId → texto, resolvendo nome via lookup ou `kpiSnapshots` do MBR)
- Justificativas de KPI sem dados
- KPIs atualizados durante o pré-MBR (valor + data + tipo input)
- Justificativas de KR fora da meta (anexar ao card do KR correspondente, não no header)
- Justificativas de projetos/milestones atrasados (anexar ao `ProjectsSummary` ou abaixo)
- KPIs sugeridos para criação (lista descrição + escopo)
- Estados finais de KR registrados pelo líder (badge no card do KR)

### 4. Exibir consolidado no Panorama
Arquivo: `src/modules/okrs/components/wizards/mbr/MbrPanoramaStep.tsx`

Adicionar contagens agregadas ao card "Preparação dos times" já existente:
- nº de KPIs com justificativa
- nº de KPIs atualizados na sessão
- nº de projetos/milestones com justificativa
- nº de sugestões de pauta consolidadas (top 3 por relevância)

### 5. Sugestões de pauta no Decisions step
Arquivo: `src/modules/okrs/components/wizards/mbr/MbrDecisionsStep.tsx`

Já recebe `mbrPreSurfacedItems`. Estender com `agendaSuggestions` agregadas dos times (mostrar como sugestões clicáveis que podem virar decisão).

### 6. Análise mensal IA no Detail step
Quando `mbrPreByTeam[teamId].monthAnalysis` existir, exibir bloco compacto (summary + top 2 highlights + top 2 risks) acima do card "Preparação do líder".

### 7. MbrPage — propagar agregados
Arquivo: `src/modules/okrs/pages/MbrPage.tsx`

Os memos `mbrPreSurfacedItems` e props passadas aos steps já existem (linhas 175–209, 689–795). Apenas estender com os novos contadores agregados (sem nova query — tudo deriva de `mbrPreByTeam`).

## Detalhes técnicos

- **Sem migração de banco.** Todos os dados já vivem em `okr_wizard_sessions.reflection_data` (tipo JSONB). Mudança é 100% leitura/UI.
- **Sem nova query.** Reaproveita `useMbrPreSubmissions` (já gated por BU + `mbrKeys.preSubmissions`).
- **Retrocompat.** Drafts antigos sem os novos campos cairão nos defaults; UI esconde seções vazias (`hasAny` guard como já existe).
- **Snapshot denorm policy** (`mem://standards/wizard-snapshot-denormalized-fields-deprecation`): para resolver nomes de KPI/KR/Projeto/Milestone, preferir lookup por ID via hooks existentes (`useKpis`, `useKeyResults`, `useProjects`) em vez de denormalizar nos types.
- **Performance.** Card "Preparação do líder" cresce; envolver seções pesadas em `<Collapsible>` para manter o step leve. Memoizar derivações com `useMemo` por `currentTeamIndex`.
- **Sem alteração no fluxo de auto-save / completeSession** (já corrigido na iteração anterior — `reflection_data` é gravado em `completeSession`).

## Arquivos afetados
1. `src/modules/okrs/types/wizard/mbr.ts` — expandir `MbrPreTeamSubmission`
2. `src/modules/okrs/hooks/useMbrPreSubmissions.ts` — hidratar novos campos
3. `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep.tsx` — exibir tudo
4. `src/modules/okrs/components/wizards/mbr/MbrPanoramaStep.tsx` — agregados
5. `src/modules/okrs/components/wizards/mbr/MbrDecisionsStep.tsx` — sugestões de pauta
6. `src/modules/okrs/pages/MbrPage.tsx` — agregar contadores e passar props

## Validação pós-implementação
- Abrir um MBR cujo time tenha pré-MBR completo com todos os campos preenchidos → confirmar que cada seção aparece.
- Time sem pré-MBR → segue mostrando "Sem pré-MBR submetido neste mês."
- Time com pré-MBR vazio em campos opcionais → seção respectiva oculta (sem cards vazios).
- Build limpo, sem `select("*")`, query keys via `mbrKeys`.
