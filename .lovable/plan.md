## Replicar transparência de "Times analisados" no Relatório Executivo de QBR

Aplicar no QBR o mesmo padrão já implementado no MBR: deduplicação por time, resolução de líder e header com a lista de times analisados.

### 1) Edge function `qbr-executive-report`

**`data-loader.ts`**
- Acrescentar `started_by` ao `select` da query `qbr-pre` (linha 49).
- (Sem janela de tempo aqui: QBR usa o ciclo inteiro, não há `monthRef`. O filtro `status = completed` + `cycle_id` já é suficiente.)

**`extractors.ts`**
- Importar `dedupSessionsByTeam` e `buildAnalyzedTeams` reutilizando os helpers do MBR (ou clonar localmente, mantendo a mesma assinatura sobre `SessionRow` do QBR — preferência: clonar localmente para não cruzar limites de função e manter cada edge function autocontida, alinhado ao padrão atual de `extractors.ts` por função).
- Adicionar `AnalyzedTeam` no `types.ts` do QBR.

**`types.ts`**
- Adicionar interface `AnalyzedTeam { teamId; teamName; leaderName; completedAt }`.
- Adicionar `analyzedTeams: AnalyzedTeam[]` em `ReportResponse`.
- Adicionar `started_by?: string | null` em `SessionRow`.

**`index.ts`**
- Após carregar `qbrPreSessions`: `const dedupedQbrPre = dedupSessionsByTeam(qbrPreSessions || []);`
- Resolver `profiles` por `started_by` (mesmo padrão de `mbr-executive-report/index.ts:152-167`).
- Construir `analyzedTeams = buildAnalyzedTeams(dedupedQbrPre, teamsMap, profilesMap)`.
- Passar `dedupedQbrPre` (em vez de `qbrPreSessions || []`) para `extractLearnings` e `extractNextCycleProposals`.
- Incluir `analyzedTeams` no `reportData` (linha 195).
- Log: adicionar `analyzedTeams=${analyzedTeams.length}`.

### 2) Hook `useQbrExecutiveReport.ts`

- Adicionar `analyzedTeams: Array<{ teamId; teamName; leaderName: string | null; completedAt: string | null }>` ao `QbrExecutiveReportData`.
- Estender `normalizeQbrExecutiveReportData` para extrair `source.analyzedTeams` com `toText`/coerção segura (mesmo formato usado em `useMbrExecutiveReport`).

### 3) Página `QbrExecutiveReportPage.tsx`

- Importar `AnalyzedTeamsHeader` de `@/modules/okrs/components/shared/AnalyzedTeamsHeader`.
- Renderizar `<AnalyzedTeamsHeader teams={report.analyzedTeams} ritual="QBR" />` dentro de `ReportDisplay`, logo após o card de header (linha ~220) e antes da seção "% de atingimento das OKRs".
- Verificar se o componente já aceita `ritual: 'MBR' | 'QBR'`. Se não, ajustar a tipagem do prop para incluir `'QBR'` e adaptar a copy do título (ex.: "Times analisados neste QBR" vs "Times analisados neste MBR").

### 4) Validação

- Após deploy + "Regenerar" no QBR atual: header lista todos os times que submeteram `qbr-pre` no ciclo (com nome do líder e data de conclusão), e cada time aparece apenas uma vez mesmo se houver re-submissão.
- Sem regressão visual nas demais seções; payload mantém retrocompatibilidade (campo novo, opcional na normalização).

### Fora de escopo

- Backfill de sessões antigas, mudanças nas seções de narrativa/propostas, alterações na lógica do MBR já entregue.
