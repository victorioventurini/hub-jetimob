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