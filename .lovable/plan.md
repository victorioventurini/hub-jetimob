## Onda 4 Fase 3 — Writers param de gravar campos denormalizados

### Contexto

Onda 4 Fases 1-2 marcaram 16 campos `@deprecated` em snapshots de ritos e migraram 9 readers para `useEntityLookup` com fallback ao snapshot legado. **Todos os readers já têm fallback funcional**, então é seguro parar de gravar os campos novos sem quebrar exibição de snapshots já persistidos.

A Fase 3 não remove os campos dos types (isso é Fase 5 — drop). Aqui apenas **paramos de popular** nos writers, deixando snapshots novos enxutos.

### Princípios

1. **Só removemos escrita de campos `@deprecated` Onda 4 Fase 1.** Não tocar `@deprecated` de outras ondas (vocabulary, weekly cleanup).
2. **Snapshots persistidos continuam válidos** — readers têm fallback ao campo legado quando lookup miss.
3. **Campos opcionais (`?: string`) podem simplesmente ser omitidos.** Campos obrigatórios (`: string`) precisam:
   - virar opcionais no type primeiro (mudança aditiva, sem migração de dados), OU
   - manter writer com string vazia transitória até Fase 5 dropar.
4. **Edge functions e hooks de leitura/derivação fora de escopo** — pertencem à Fase 4.

### Escopo — campos a parar de gravar (16)

| Type | Campo | Owner do writer |
|---|---|---|
| `KrFinalStateSnapshot` | `krTitle`, `objectiveTitle` | MBR/QBR Pre KR closure step |
| `MbrOrgOkrSnapshot.keyResults[].ownerName` | — | MBR Org OKRs step (data fetcher) |
| `MbrTeamOkrObjectiveSnapshot.keyResults[].ownerName` | — | MBR Team OKRs step (data fetcher) |
| `MbrTeamOkrSnapshot.teamName` | — | MBR Team OKRs step |
| `MbrPreDraftData.krFinalStates[].{krTitle,objectiveTitle}` | — | MBR Pre wizard |
| `MbrPreDraftData.kpisToCreate[].relatedKrTitle` | — | MBR Pre KPIs step |
| `MbrPreTeamSubmission.submittedByName` | — | MBR Pre submission writer |
| `QbrPreDraftData.kpisToCreate[].relatedKrTitle` | — | QBR Pre KPIs step |
| `WeeklyPriorityItem.teamName` | — | Weekly opening curation |
| `WeeklyPeopleSignalAggregated.teamName` | — | Weekly opening curation |
| `CollaboratorCheckinResult.{krTitle,objectiveTitle}` | — | Collaborator checkin writer |
| `KpiCheckinResult.kpiName` | — | Collaborator/Managers checkin writer |
| `AreaOkrSummary.areaName` | — | Managers/C-Level checkin writer |
| `CompanyOkrSummary.objectiveTitle` | — | Managers/C-Level checkin writer |

### Estratégia por arquivo

Para cada writer:
1. Verificar se o campo é obrigatório no type.
2. Se opcional: remover atribuição (delete a propriedade do objeto literal).
3. Se obrigatório: tornar opcional no type (aditivo, não quebra legado) + remover atribuição.
4. Garantir que renderer correspondente já usa lookup com fallback (verificado na Fase 2).

### Arquivos a editar (estimativa)

**Writers (steps/hooks):**
- `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsStep.tsx` (ou data fetcher associado) — `teamName`, `ownerName`
- `src/modules/okrs/components/wizards/mbr/MbrOrgOkrsStep.tsx` — `ownerName`
- `src/modules/okrs/components/wizards/mbr-pre/*KrClosureStep.tsx` — `krTitle`, `objectiveTitle`
- `src/modules/okrs/components/wizards/mbr-pre/*KpisStep.tsx` — `relatedKrTitle`
- `src/modules/okrs/components/wizards/mbr-pre/*SubmissionStep.tsx` — `submittedByName`
- `src/modules/okrs/components/wizards/qbr-pre/*KrClosureStep.tsx` — `krTitle`, `objectiveTitle`
- `src/modules/okrs/components/wizards/qbr-pre/*KpisStep.tsx` — `relatedKrTitle`
- `src/modules/okrs/hooks/useWeeklyOpeningCuration.ts` — `teamName` (priorities + peopleSignals)
- `src/modules/okrs/components/wizards/collaborator-checkin/*` — `krTitle`, `objectiveTitle`, `kpiName`
- `src/modules/okrs/components/wizards/managers-checkin/*` — `kpiName`, `areaName`
- `src/modules/okrs/components/wizards/clevel-checkin/*` — `objectiveTitle`, `areaName`

**Types (tornar opcional onde necessário):**
- `src/modules/okrs/types/wizard/mbr.ts`
- `src/modules/okrs/types/wizard/shared.ts`
- `src/modules/okrs/types/wizard/collaborator.ts`
- `src/modules/okrs/types/wizard/managers-clevel.ts`
- `src/modules/okrs/types/wizard/weekly.ts`
- `src/modules/okrs/types/wizard/qbr.ts`

### Validação

- `bunx vitest run src/modules/okrs` mantendo baseline **1769/1769**.
- Suítes de teste de wizards podem precisar ajuste se asseguram presença de campo deprecated em snapshot — atualizar para checar apenas IDs.
- Inspeção visual: abrir um relatório histórico (snapshot antigo) → readers devem continuar mostrando nomes via fallback.

### Documentação

- Atualizar `mem://standards/wizard-snapshot-denormalized-fields-deprecation`: marcar Fase 3 concluída, listar writers migrados.
- `.lovable/plan.md`: registrar entrega.

### Risco

**Médio.** Risco principal: tests/fixtures que esperam o campo presente. Mitigação: rodar suíte completa após cada bloco e ajustar fixtures pontualmente. Snapshots em produção não são afetados (apenas novos snapshots ficam enxutos).

### Sequência de execução

1. Auditoria precisa: `rg` para localizar exatamente onde cada campo é gravado (não inferido).
2. Bloco 1 — Weekly (`useWeeklyOpeningCuration`).
3. Bloco 2 — Collaborator Checkin.
4. Bloco 3 — Managers/C-Level Checkin.
5. Bloco 4 — MBR (Org + Team OKRs).
6. Bloco 5 — MBR Pre (krFinalStates, kpisToCreate, submission).
7. Bloco 6 — QBR Pre (kpisToCreate).
8. Após cada bloco: rodar suíte do wizard correspondente.
9. Suíte completa final + atualizar memory + plan.

### Fora de escopo

- Edge functions (Fase 4).
- Drop dos campos dos types/schema (Fase 5).
- Campos `@deprecated` por outras razões (vocabulary, UI cleanup).
---

## Onda 4 Fase 3 — Writers param de gravar denormalizados ✅ CONCLUÍDA

### Entregue

**Tipos (campos tornados opcionais):**
- `KrFinalStateSnapshot.{krTitle, objectiveTitle}` — `shared.ts`
- `CollaboratorCheckinResult.{krTitle, objectiveTitle}` — `collaborator.ts`
- `KpiCheckinResult.kpiName` — `collaborator.ts`
- `MbrPreDraftData.krFinalStates[].{krTitle, objectiveTitle}` — `mbr.ts`

**Writers persistentes migrados (4):**
- `MbrPrePage.tsx` — seed de `krFinalStates` não grava mais título.
- `QbrPrePage.tsx` — seed de `krFinalStates` não grava mais título.
- `CollaboratorCheckinStep.tsx` — `handleSave` + `handleSkip` não gravam mais título.
- `CollaboratorKpiStep.tsx` — `onComplete` não grava mais `kpiName`.

**Tests:**
- `CollaboratorKpiStep.test.tsx` ajustado para não esperar `kpiName` no payload.

### Refinamento de escopo (registrado na memory)

A maioria dos 16 campos `@deprecated` Fase 1 vive em tipos derivados em runtime (`useWizardAI`, `useManagersPanorama`, `useWeeklyPreWeeklyAggregation`, `useCompanyOkrs`, `useMbrPreSubmissions`) — **não persistem em snapshot**. Não exigem migração de writer; permanecem `@deprecated` apenas como sinal arquitetural.

`kpisToCreate[].relatedKrTitle` foi diferido para Fase 5: hoje é input livre/textual do líder, sem `krId` associado. Migração exige redesenhar UI (autocomplete por KR), fora do escopo de "parar de gravar".

### Validação
- `bunx vitest run src/modules/okrs`: **1769/1769 passing** (baseline mantido).

### Memory
- `mem://standards/wizard-snapshot-denormalized-fields-deprecation` atualizada (versão Fases 1-3).

---

## Onda 4 Fase 4 — Edge functions param de ler denormalizados ✅ CONCLUÍDA

### Entregue

**Edge functions migradas (2):**
- `qbr-pre-summary/index.ts` — adicionado lookup em `okr_team_key_results` por `krId` para resolver `krTitle` (linhas 318-355). Fallback ao `kr.krTitle` legado preservado, com `'(KR removido)'` como último recurso.
- `collaborator-checkin-summary/index.ts` — adicionado lookup paralelo (`Promise.all`) em `okr_team_key_results` por `krId` + `kpi_metrics` por `kpiId` (linhas 390-440). Fallback triplo: lookup → snapshot legado (`krTitle`/`title` ou `name`/`kpiName`) → `'(KR removido)'`/`'(KPI removido)'`.

**Edge functions inspecionadas e fora de escopo:**
- `mbr-summary`: passa snapshot inteiro como JSON ao LLM (não desestrutura).
- `qbr-clevel-learnings-summary`: `teamName` vem do payload do cliente.
- `qbr-executive-report`, `okr-org-health-review`, `weekly-curate-opening`, `okr-construction-review`: nomes em inputs/outputs derivados em runtime, sem leitura de snapshot.

### Validação

- `bunx vitest run src/modules/okrs`: **1769/1769 passing** (suíte frontend não regredida).
- Edge functions deployam automaticamente via Lovable Cloud.

### Memory

- `mem://standards/wizard-snapshot-denormalized-fields-deprecation` atualizada com lista de edge functions migradas (Fase 4).
