

## Plano: Pré-carregar OKRs rascunho do QBR-pre no Wizard de Criação — ✅ IMPLEMENTADO

### Resumo das mudanças

1. **`useDraftObjectivesForCycle`** (novo hook) — busca objetivos `draft` por team+cycle com KRs aninhados
2. **`okrsKeys.draftObjectives`** — nova query key no registry
3. **`TeamOkrDraft.sourceDraftObjectiveId`** — campo para rastrear objetivo de origem (DRAFT_VERSION → 6)
4. **`useCreateTeamOkrBundle`** — suporte a `existingObjectiveId` para upsert (update + delete KRs antigos + insert novos)
5. **`OkrCreationPage`** — fallback para ciclo `planning`, hidratação automática do primeiro draft, banner informativo para drafts restantes, status baseado no tipo de ciclo
