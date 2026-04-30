## Objetivo

Remover **completamente** o campo `zombieCandidates` de todos os ritos — sem retrocompat, sem fallback. Snapshots antigos persistidos seguirão tendo o campo no JSON, mas o código simplesmente não o lerá mais (TypeScript ignora propriedades extras em parse).

## Escopo (11 pontos de código + 4 de docs)

### 1. Tipos (4 ocorrências em 2 arquivos)
- `src/modules/okrs/types/wizard/qbr.ts` — remover `zombieCandidates: string[]` de:
  - `QbrPreSnapshot` (linha 133)
  - `QbrPreDraftData` (linha 159)
- `src/modules/okrs/types/wizard/mbr.ts` — remover de:
  - `MbrPreDraftData` (linha 219)
  - `MbrPreTeamSubmission` (linha 262)

### 2. Initializers de draft (3 arquivos)
- `src/modules/okrs/pages/QbrPrePage.tsx` — remover linha `zombieCandidates: []` do default state.
- `src/modules/okrs/pages/MbrPrePage.tsx` — idem.
- `src/modules/okrs/hooks/useMbrPreSubmissions.ts` — remover do mapeamento `byTeam[teamId]` (linha 157).

### 3. Edge function (2 ocorrências)
- `supabase/functions/qbr-pre-summary/index.ts`:
  - Remover do tipo `QbrPreAgentContext` (linha 57-58, com o `@deprecated`).
  - Remover do `agentContext` montado (linha 372).
  - Conferir que nenhum prompt em `orchestrateAgents` referencia o campo (verificação rápida durante a execução).

### 4. Tests (2 arquivos)
- `src/modules/okrs/components/wizards/qbr-pre/__tests__/QbrPreSummary.test.tsx` — remover fixture (linha 53).
- `src/modules/okrs/components/wizards/qbr-pre-clevel/__tests__/QbrCLevelSteps.test.tsx` — remover fixture (linha 87).

### 5. Docs/memória (limpeza)
- `.lovable/memory/standards/deprecated-cleanup-log.md` — remover linhas 74 e 123 (item resolvido).
- `.lovable/memory/standards/wizard-snapshot-denormalized-fields-deprecation.md` — limpar nota linha 102.
- `.lovable/plan.md` — remover linha "qbr-pre-summary.zombieCandidates" do bloco "Bloqueados".
- `docs/HUB_TECHNICAL_DEEP_DIVE.md` (linha 907) e `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (linha 2091) — remover menções a "Sinalização de zombies" / "KPIs zombie".

## Fora de escopo

- **Coluna DB `kpi_metrics.zombie_candidate`**: tabela diferente (não-rito), exige migração + janela própria. Mantida intocada.
- **Migração de snapshots persistidos**: snapshots antigos em `okr_wizard_sessions.reflection_data` continuam carregando o campo no JSON. Não há limpeza retroativa — readers simplesmente ignoram chaves desconhecidas.

## Verificação

1. `rg -n "zombieCandidates" src supabase` deve retornar **zero**.
2. Build automática (typecheck) — garantir que nenhum consumidor esquecido referencia o campo.
3. Vitest dos 2 testes editados.
4. Smoke no preview: abrir `MbrPrePage` e `QbrPrePage`, montar draft, salvar.

## Estimativa

11 edits pequenos (search-replace), todos triviais. Sem migração de DB, sem mudança de comportamento observável (a feature já estava morta visualmente desde 2026-04-28).
