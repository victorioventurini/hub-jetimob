## 1. Diagnóstico

Revisei `MbrPrePage.tsx`, `MbrPage.tsx`, todos os steps de `mbr/` e `mbr-pre/`, `useRitualPreparationStatus`, `mbrKeys` e a memória `mbr-ritual-specification`.

### O que o MBR-PRE preenche (e congela em `okr_wizard_sessions.reflection_data`)
| Campo | Conteúdo |
|---|---|
| `krFinalStates` | Estado final dos KRs do time (alcançado, em risco, atrasado…) |
| `kpiSnapshots` | KPIs do time + valores e RAG do mês |
| `zombieCandidates` | KPIs sinalizados como "zumbis" pelo líder |
| `kpisToCreate` | KPIs sugeridos pelo líder para criação |
| `highlights` | "O que acelerou", "o que travou", "precisa de decisão" |
| `nextSteps` | Foco do mês, itens priorizados, dependências cross-team |
| `decisions` | Decisões/notas (já fluem via `useCarryOverDecisions` no MBR) |

### O que o MBR consome do MBR-PRE hoje

| Sinal | Status |
|---|---|
| Decisões/notas (`decisions`) | ✅ via `useCarryOverDecisions({ wizardType: 'mbr' })` no `MbrDecisionsStep` |
| Cobertura "quem fez o pré-MBR" | ✅ via `useRitualPreparationStatus('mbr')` no header (lista por time) |
| Tudo o resto (highlights, nextSteps, zombies, kpisToCreate, KR finalStates) | ❌ **Perdido** — nenhum step do MBR lê |
| Addendums do `mbr-pre` por time (`teamAddendums`) | ❌ Prop existe em `MbrTeamOkrsDetailStep` mas **`MbrPage` nunca passa** |

### Conclusão
O MBR-PRE hoje funciona basicamente como um "sinalizador de cobertura" + canal de decisões. Toda a riqueza qualitativa que o líder de time prepara (destaques, riscos, foco, dependências cross-team, KPIs zumbis, KRs propostos) **não chega ao facilitador do MBR**. O MBR re-busca tudo do banco e ignora o snapshot do mbr-pre.

## 2. Proposta

### A. Novo hook `useMbrPreSubmissions(cycleId, referenceMonth)`
Em `src/modules/okrs/hooks/`, busca **todas** as sessões `mbr-pre` do mês corrente da BU + addendums:

```text
SELECT id, team_id, completed_at, started_by, reflection_data
FROM okr_wizard_sessions
WHERE wizard_type='mbr-pre' AND status='completed'
  AND bu_id = currentBuId
  AND completed_at BETWEEN monthStart AND monthEnd
```

Retorna por `teamId`:
- `highlights` (accelerated/blocked/needsDecision)
- `nextSteps` (focus/prioritizedItems/crossDependencies)
- `zombieCandidates` (kpiIds)
- `kpisToCreate` (sugestões)
- `krFinalStates`
- `submittedBy`, `submittedAt`
- `addendums` (de `okr_wizard_session_addendums`, filtrados por `session_id`)

Query key: adicionar `mbrKeys.preSubmissions(buId, cycleId, referenceMonth)`.

### B. `MbrPage` — wiring

1. Chamar `useMbrPreSubmissions` e construir 3 mapas: `byTeam`, `crossDeps[]`, `signaledKpiIds`.
2. Anotar `MbrTeamOkrSnapshot` com flag derivada `hasMbrPreSubmission` para destacar visualmente times que prepararam.
3. Passar `teamAddendums` (já existente) para `MbrTeamOkrsDetailStep` — usar `addendums` agregadas por team.
4. Passar nova prop `mbrPreByTeam` para os steps que vão consumir (B.1, B.2, B.3 abaixo).

### B.1 `MbrTeamOkrsDetailStep` — novo bloco "Preparação do líder"
Acima das OKRs do time atual, exibir card colapsável com:
- ✓ Acelerou / ✗ Travou / ⚠ Precisa de decisão (do `highlights`)
- 🎯 Foco do mês (de `nextSteps.focus`)
- 1-N itens priorizados
- Quem submeteu, quando

Se o time **não** preparou: badge "Sem pré-MBR submetido neste mês".

### B.2 `MbrKpiGateStep` — sinalização vinda dos times
Marcar visualmente KPIs cujo `kpiId` aparece em `zombieCandidates` de qualquer time, com tooltip "Sinalizado como zumbi por: [time]". Listar `kpisToCreate` em accordion separado "KPIs propostos pelos líderes".

### B.3 `MbrDecisionsStep` — alimentar `previousMbrPendingItems` extra
Hoje só recebe pendências do MBR anterior. Adicionar segunda seção "Itens trazidos pelos pré-MBR deste mês":
- Cada `highlights.needsDecision` (não vazio) vira sugestão pré-preenchida (1 clique → vira `decision`).
- Cada `crossDependencies` vira sugestão da categoria `cross_team_dependency`.

### B.4 `MbrPanoramaStep` — banner de cobertura
Já mostra `RitualPreparationStatus`. Adicionar contadores: "X/Y times trouxeram destaques | Z itens pedem decisão | W dependências cross-team".

### C. Tipos
Em `src/modules/okrs/types/wizard/mbr.ts`, estender `MbrDraftData` com campo opcional **derivado** (não persistido como source-of-truth, recalculado a cada load):
- `mbrPreByTeam?: Record<string, MbrPreTeamSubmission>`

E novo tipo `MbrPreTeamSubmission` espelhando o subset relevante de `MbrPreDraftData`.

> Nota: como `mbrPreByTeam` é derivado, **não** entra no `defaultData` e **não** é persistido pelo `useGenericWizardDraft`. Vive em memória via `useMemo` no `MbrPage` e é injetado nos steps.

## 3. Fora de escopo

- Mudar a UI dos steps do mbr-pre (já estão consistentes).
- Mudar o schema de `okr_wizard_sessions` (tudo cabe no `reflection_data` já existente).
- Tornar o pré-MBR obrigatório/bloqueante para abrir o MBR (continua sendo "preparação", não gate).

## 4. Arquivos a tocar

| Arquivo | Mudança |
|---|---|
| `src/modules/okrs/hooks/useMbrPreSubmissions.ts` | **Novo** — agrega submissions + addendums por time |
| `src/modules/okrs/hooks/index.ts` | Exportar novo hook |
| `src/lib/queryKeys/okrs.ts` | Adicionar `mbrKeys.preSubmissions` |
| `src/modules/okrs/types/wizard/mbr.ts` | Tipo `MbrPreTeamSubmission` + campo opcional |
| `src/modules/okrs/pages/MbrPage.tsx` | Chamar hook + propagar `teamAddendums` e `mbrPreByTeam` |
| `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep.tsx` | Card "Preparação do líder" + addendums |
| `src/modules/okrs/components/wizards/mbr/MbrKpiGateStep.tsx` | Realce de KPIs zumbis + lista `kpisToCreate` |
| `src/modules/okrs/components/wizards/mbr/MbrDecisionsStep.tsx` | Seção "Trazido pelos pré-MBR" com 1-clique para decision |
| `src/modules/okrs/components/wizards/mbr/MbrPanoramaStep.tsx` | Contadores no banner |

## 5. Validação

1. Time A faz pré-MBR preenchendo highlights + 1 zombie + 2 itens priorizados + 1 cross-dep + 1 needsDecision. Time B não faz.
2. Admin abre MBR:
   - Panorama mostra "1/2 times prepararam | 1 item pede decisão | 1 dependência cross-team".
   - KPI Gate destaca o zombie do Time A com badge "sinalizado por Time A".
   - Detalhe do Time A: card com destaques + foco + itens; Time B: badge "Sem pré-MBR".
   - Decisões: bloco "Trazido pelos pré-MBR" com `needsDecision` e `crossDependency` viráveis em decisão por 1 clique.
3. Compliance: nenhum `select('*')`, query keys via `mbrKeys`, BU-scoped, nenhuma mutação nova.
