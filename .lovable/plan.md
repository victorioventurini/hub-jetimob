## Contexto

A pendência registrada como "redesign de autocomplete para `relatedKrTitle`" estava baseada na hipótese de que o campo ainda era um input livre do líder no MBR Pre/QBR Pre. Auditoria do código atual mostra cenário diferente:

- `QbrKpiAnalysisStep` marcou as props `kpisToCreate` e `onKpisToCreateChange` como `@deprecated` ("KPI suggestions removed — kept for backward compat") e **não renderiza nenhum campo** que capture descrição, escopo ou KR relacionado.
- `MbrPrePage` e `QbrPrePage` ainda passam essas props para o step, mas elas são ignoradas. O array `kpisToCreate` é inicializado como `[]` e nunca cresce no fluxo atual.
- Drafts/snapshots **legados** (anteriores à remoção do feature) podem conter entradas; hoje são lidos apenas em `MbrPage` (`proposedKpis` → `MbrKpiGateStep`) para mostrar sugestões históricas.

Ou seja: não há input para redesenhar. O caminho correto é **descontinuar o campo** seguindo o mesmo padrão da Onda 4 Fase 5 (drop com fallback defensivo nos readers).

## Objetivo

Encerrar a dívida do `relatedKrTitle` removendo:
1. As props `@deprecated` `kpisToCreate`/`onKpisToCreateChange` de `QbrKpiAnalysisStep` e dos call-sites em `MbrPrePage`/`QbrPrePage`.
2. O campo `relatedKrTitle` dos types `MbrPreDraftData.kpisToCreate[]` e `QbrPreSnapshot.kpisToCreate[]`, mantendo o array para preservar drafts legados.
3. A leitura defensiva em `MbrPage`/`MbrKpiGateStep`: aceitar entradas sem `relatedKrTitle` (fallback `undefined`), exibir apenas `description` + `suggestedScope`.

Manter o array `kpisToCreate` no schema (não dropar) porque snapshots legados têm dados; apenas tornar `relatedKrTitle` opcional (`?: string`) e parar de exibi-lo, marcando-o `@deprecated` para drop futuro junto com a janela de observação da Fase 5 da Onda 4.

## Plano de execução

### Bloco 1 — Types: tornar `relatedKrTitle` opcional
- `src/modules/okrs/types/wizard/mbr.ts` (linha 220-228): `relatedKrTitle: string` → `relatedKrTitle?: string` mantendo a tag `@deprecated`.
- `src/modules/okrs/types/wizard/qbr.ts` (linha 134-141): mesmo tratamento.

### Bloco 2 — Remover props deprecated do step
- `src/modules/okrs/components/wizards/qbr-pre/QbrKpiAnalysisStep.tsx`: remover `kpisToCreate`, `onKpisToCreateChange`, `zombieCandidates`, `onZombieCandidatesChange` da interface (todas marcadas `@deprecated`).
- `src/modules/okrs/pages/MbrPrePage.tsx` (linha 442-443): remover passagem de `kpisToCreate` e `onKpisToCreateChange`.
- `src/modules/okrs/pages/QbrPrePage.tsx` (linha 615-616): mesmo.

### Bloco 3 — Reader histórico aceita ausência
- `MbrPage.tsx` (linha 172-180): manter `proposedKpis` mas remover dependência de `relatedKrTitle` no shape.
- `MbrKpiGateStep.tsx` (linha 32-38): `relatedKrTitle?: string` continua opcional; verificar que JSX (não há renderização ativa hoje) está coerente.

### Bloco 4 — Tests
- Atualizar `QbrCLevelSteps.test.tsx` (linha 88) que ainda usa `relatedKrTitle: ''` no fixture: remover a chave para refletir o novo shape.
- Validar que `QbrPreSummary.test.tsx` e `MbrKpiGateStep.test.tsx` não regridem.

### Bloco 5 — Documentação
- Atualizar `mem://standards/wizard-snapshot-denormalized-fields-deprecation`: marcar `relatedKrTitle` como "campo opcional, sem input ativo, drop junto com Fase 5 (≥90 dias)".
- `.lovable/plan.md`: registrar entrega como sub-item da Fase 5 da Onda 4 (não nova onda).

### Validação
- `bunx vitest run src/modules/okrs` mantém **1769/1769**.

## Fora de escopo
- Drop do array `kpisToCreate` inteiro (depende da janela de observação da Fase 5).
- Reintrodução do feature de sugestão de KPIs (decisão de produto, não técnica).