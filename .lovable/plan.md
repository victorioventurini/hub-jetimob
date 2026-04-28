## Objetivo

Remover, de **todos os ritos**, a funcionalidade do usuário marcar/sinalizar um KPI como **"Zombie?"**, mantendo o restante da análise de KPIs intacta (RAG, valor atual, variação, decisões inline).

## Pré-checklist canônico — concluído

- ✅ `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (linha 2091 menciona o conceito no QBR-Pre)
- ✅ `docs/canonical/DATA_MODEL_REGISTRY.md` / `SCHEMA_QUICK_REFERENCE.md` (campo presente em `okr_wizard_sessions.draft_data` + coluna `kpi_metrics.zombie_candidate`)
- ✅ `mem://features/kpis/kpis-master-standard` — KPIs Master v3.0.0 (não cita zombie como conceito governado; é só sinalização de rito)
- ✅ `mem://features/rituals/qbr-master-standard` e `mem://features/okrs/cycles-and-rituals-master`
- ✅ Mapeamento de uso no código (105 ocorrências em ~20 arquivos: QBR-Pre, QBR-Pre-CLevel, MBR-Pre, MBR, Executive Quarter Review, edge function `qbr-pre-summary`, types, tests, migration histórica)

## Escopo da remoção

### Ritos afetados (UI do usuário)
1. **QBR-Pre** → `QbrKpiAnalysisStep` — remove os 3 toggles "Zombie?" (alerta / saudáveis / sem dados) e o resumo "X KPIs marcados como potencialmente zombie".
2. **MBR-Pre** → mantém o draft funcionando, mas remove qualquer UI/contagem de zombie no `MbrPreSummary`.
3. **MBR** → `MbrKpiGateStep` deixa de receber/exibir o destaque "sinalizado como zumbi por: [time]". A prop `signaledZombieKpiIds` e o `useMemo` em `MbrPage` são removidos.
4. **QBR-Pre-CLevel** → `QbrCLevelSystemReadStep` remove o card/contador "X KPIs zombie sinalizados" e o helper `aggregateZombieKpis`.
5. **Executive Quarter Review** → remove o bloco "KPIs zombie" da seção de aprendizados.

### Camada de dados (compatibilidade)
- **Não dropar** a coluna `kpi_metrics.zombie_candidate` nem mexer em migrations passadas (mantém compatibilidade com snapshots históricos e evita risco em produção).
- **Manter** `zombieCandidates: string[]` nos types `MbrPreDraftData` / `QbrPreDraftData` como **opcional/legacy** (drafts antigos no banco continuam carregando sem erro), mas:
  - Inicialização nova → sempre `[]`
  - Nenhum lugar do código grava novos valores
  - Nenhuma UI lê para exibir
- **Edge function `qbr-pre-summary`**: remover a menção a "zombie candidates" do prompt da IA (a IA deixa de ser instruída a destacar zombies; o campo `kpisZombie` no relatório executivo deixa de ser populado proativamente).
- **Hook `useMbrPreSubmissions`**: parar de propagar `zombieCandidates` no objeto retornado (ou mantém como `[]` para não quebrar consumidores).

### Testes
- Remover os testes de toggle/summary de zombie em `QbrKpiAnalysisStep.test.tsx` e `QbrCLevelSteps.test.tsx`.
- Atualizar fixtures que usam `zombieCandidates: ['kpi-1']` → `[]`.

## Detalhes técnicos

**Arquivos a editar:**

| Arquivo | Mudança |
|---|---|
| `src/modules/okrs/components/wizards/qbr-pre/QbrKpiAnalysisStep.tsx` | Remover Checkbox + Label "Zombie?" das 3 seções, handler `handleToggleZombie`, props `zombieCandidates`/`onZombieCandidatesChange`, bloco de resumo, import `Ghost` |
| `src/modules/okrs/components/wizards/qbr-pre/QbrPreSummary.tsx` | Remover bloco que conta `zombieCandidates.length` |
| `src/modules/okrs/components/wizards/mbr-pre/MbrPreSummary.tsx` | Idem |
| `src/modules/okrs/components/wizards/mbr/MbrKpiGateStep.tsx` | Remover prop `signaledZombieKpiIds`, lógica de destaque visual e tooltip |
| `src/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelSystemReadStep.tsx` | Remover `aggregateZombieKpis`, `zombieCount`, card de exibição |
| `src/modules/okrs/pages/MbrPage.tsx` | Remover `useMemo` de `signaledZombieKpiIds` e prop passada ao step |
| `src/modules/okrs/pages/QbrPrePage.tsx` | Remover props `zombieCandidates`/`onZombieCandidatesChange` passadas ao step |
| `src/modules/okrs/pages/MbrPrePage.tsx` | Idem (sem step de toggle, mas remove props se houver) |
| `src/modules/okrs/pages/ExecutiveQuarterReviewPage.tsx` | Remover bloco UI "KPIs zombie" + normalização `zombieKpis` |
| `src/modules/okrs/hooks/useMbrPreSubmissions.ts` | Parar de mapear `zombieCandidates` |
| `supabase/functions/qbr-pre-summary/index.ts` | Remover instrução "zombie candidates" do prompt + campo derivado |
| Tests: `QbrKpiAnalysisStep.test.tsx`, `QbrCLevelSteps.test.tsx`, `QbrPreSummary.test.tsx` | Remover casos de teste |

**Não tocar:**
- Migration histórica `20260325024414_*.sql`
- Coluna `kpi_metrics.zombie_candidate` (compatibilidade com snapshots)
- `src/integrations/supabase/types.ts` (auto-gerado)
- Type field `zombieCandidates` em `mbr.ts`/`qbr.ts` (vira opcional/legacy para hidratação de drafts antigos sem quebra)

## Documentação a atualizar

- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` linha 2091 — remover menção "Sinalização de KPIs zombie".
- `docs/HUB_TECHNICAL_DEEP_DIVE.md` linha 907 — atualizar descrição do `QbrKpiAnalysisStep`.
- `.lovable/plan.md` — pode ficar como está (é histórico do MBR-PRE → MBR; será sobrescrito no próximo ciclo).
- `mem://features/kpis/kpis-master-standard` — adicionar nota: "Conceito de 'Zombie KPI' como sinalização manual em ritos foi removido em 2026-04-28. Detecção de KPIs ociosos passa a depender exclusivamente de regras automáticas baseadas em frequency/no-update windows (futuro)."

## Validação após implementação

1. Build TypeScript verde (sem props órfãs).
2. Smoke test mental: abrir QBR-Pre → step "Análise de KPIs" não mostra checkbox Zombie; abrir MBR → KPI Gate não mostra badge "sinalizado por time".
3. Drafts antigos no banco com `zombieCandidates: ['x']` continuam abrindo sem crash (campo é lido como opcional, ignorado na render).
4. Edge function `qbr-pre-summary` continua respondendo (prompt simplificado).
5. Testes: `bunx vitest run src/modules/okrs/components/wizards/qbr-pre src/modules/okrs/components/wizards/qbr-pre-clevel`.

## Riscos & mitigação

| Risco | Mitigação |
|---|---|
| Drafts antigos com `zombieCandidates` populados | Type fica opcional, nenhuma UI lê → ignorado silenciosamente |
| Coluna DB `kpi_metrics.zombie_candidate` órfã | Mantida; nenhuma escrita nova; pode ser removida em wave de housekeeping futura |
| Memória `kpis-master-standard` cita o conceito? | Verificado: não governa; só atualizar nota histórica |
| Quebra de import (`Ghost` icon) | Removido junto |
