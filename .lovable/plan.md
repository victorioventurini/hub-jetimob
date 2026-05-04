## Pré-checklist (executado nesta revisão)

- ✅ TCR §4.8.1 (Framework Unificado de Wizards): princípios canônicos, ondas, `mbrPreV3` em `stepDefinitions.ts`.
- ✅ TCR Rituais Mensais (§MBR): MBR é mensal/BU Admin; consome saídas dos Pré-MBRs dos times.
- ✅ `WIZARDS_FRAMEWORK_BOUNDARY.md` v1.0.0: framework é agnóstico de `wizardType`; toda variação vive em `framework/config/`.
- ✅ `mem://features/kpis/kpi-value-entry-ssot`: `KpiValueEntryForm` é o ÚNICO formulário de "registrar valor de KPI"; sempre enviar `input_type`; jamais reintroduzir `confidence`.
- ✅ `mem://features/okrs/mbr-ritual-specification`: MBR usa auto-seeding imutável; snapshot histórico precisa de integridade.
- ✅ Memórias core: BU isolation, identity (`realProfileId`), soft-deletes, query keys, no render side-effects, hooks antes de early-return, wizard draft isolation.
- ✅ Diff entre `mbrPreV3` (framework canônico) e `MbrPrePage.STEP_ORDER` real (legacy específico) — relevante para o plano.

## Achados e ajustes ao diagnóstico

### O que está certo
- `useGenericWizardDraft.completeSession()` snapshot do `draft` inteiro em `okr_wizard_sessions.reflection_data` no submit (não depende de auto-save).
- `useMbrPreSubmissions` lê `reflection_data.data` e expõe TODOS os campos de `MbrPreDraftData` para o MBR.
- Campos hoje gravados corretamente no draft: `referenceMonth`, `cycleId`, `teamId`, `krFinalStates` (via seed), `kpiSnapshots[].impactAssessment`, `projectJustifications.{projects,milestones}`, `krJustifications`, `highlights`, `nextSteps`, `decisions`, `agendaSuggestions`, `monthAnalysis`.

### Gaps reais (revisados)

**Gap 1 — `kpiNoDataReasons` nunca é escrito**
- Existe no tipo, é lido por `MbrTeamOkrsDetailStep`, mas nenhum step do Pré-MBR escreve.
- `MbrPreKpiGateStep` consome `KpiGateStep` do framework, que só expõe `onJustificationChange` (grava em `impactAssessment`). Para KPI sem dados, a justificativa do líder cai junto no `impactAssessment` — funciona como prova-de-vida, mas o campo dedicado fica vazio e o MBR não consegue separar "está sem dado por motivo X" de "está fora da meta por motivo Y".
- **Decisão canônica:** o framework é agnóstico (TCR §4.8.1 / Boundary v1.0.0). NÃO podemos adicionar comportamento "só para mbr-pre" no `KpiGateStep`. A solução é via **config**: estender `KpiGateStepConfig` com um flag declarativo (ex.: `splitNoDataReason: boolean`) que liga a renderização do segundo textarea quando `bucket === 'noData'`. As props correspondentes (`noDataReasons`, `onNoDataReasonChange`) ficam opcionais e só são lidas quando o flag está ativo.

**Gap 2 — `kpiOutdatedUpdates` nunca é escrito**
- Existe no tipo, agregado pelo MBR como `kpiUpdatedCount`, nunca preenchido.
- O Pré-MBR atual NÃO oferece UI para atualizar valor de KPI overdue dentro do rito — só pede plano/justificativa. O fluxo de update real ocorre em `/kpis` (modal) e no Check-in Individual.
- **Decisão de escopo:** introduzir UI de update inline é uma feature nova de produto (não apenas "salvar o que já existe"). Vou separar:
  - **2.a (no escopo deste plano):** se o líder usou outro caminho (modal /kpis ou outra aba) para atualizar um KPI durante o rito, ainda assim o MBR não saberá. Para fechar o gap "salvar o que se preencheu" sem inventar feature: deprecar `kpiOutdatedUpdates` no tipo (marcar `@deprecated, kept for retrocompat`), remover do agregado em `MbrPage` (ou fazer fallback para snapshot date), e atualizar a memória.
  - **2.b (proposto, fora deste plano):** ticket separado para introduzir `KpiValueEntryForm` (SSOT canônico — `mem://features/kpis/kpi-value-entry-ssot`) inline no card de KPI overdue do `KpiGateStep` (via flag de config `allowInlineValueEntry`), reutilizando o componente existente (NÃO duplicar form). Isso fecharia 2.b respeitando o SSOT.

**Gap 3 — Resumo do Pré-MBR não exibe tudo**
- `MbrPreSummary` exibe: KPIs (com justificativa mesclada), KRs, Projetos, Highlights, NextSteps, AgendaSuggestions.
- **Não exibe**: `decisions` consolidadas, `monthAnalysis`, e (após Gap 1) `kpiNoDataReasons`.
- Isso afeta a percepção de "salvo" — os dados estão no draft, mas o líder não tem auditabilidade antes do submit.

### O que NÃO mudar
- Não tocar em `kpi_values`, schema, triggers (já fixados nas migrations recentes).
- Não usar `confidence` em qualquer ponto do KPI (regra inquebrável KPI v3.30.0).
- Não criar formulário paralelo de "registrar valor de KPI" (SSOT é `KpiValueEntryForm`).
- Não adicionar ramificação `if (wizardType === ...)` em `framework/components/` (Boundary §Regras de Conteúdo #1).
- Não alterar `mbrPreV3` em `stepDefinitions.ts` — flips estruturais só em Q-end (TCR §4.8.1 #6).
- Não alterar a versão `structure_version` de sessões existentes.

## Mudanças propostas (revisadas)

### A. `kpiNoDataReasons` — fechar via config agnóstica
1. `framework/components/KpiGateStep.tsx`:
   - Estender `KpiGateStepConfig` com `splitNoDataReason?: boolean`.
   - Props opcionais `noDataReasons?: Record<string,string>` e `onNoDataReasonChange?: (kpiId,value)=>void`.
   - Quando `splitNoDataReason && bucket.id === 'noData'`: renderizar textarea adicional ao lado do "plano de ação", com label "Por que está sem dados".
   - Sem nenhum `if (wizardType...)`.
2. `MbrPreKpiGateStep.tsx`: aceitar e repassar as 2 props novas + `splitNoDataReason: true` na config.
3. `MbrPrePage.tsx` no case `'kpi-analysis'`: ligar a `draft.data.kpiNoDataReasons` e `updateDraft({ kpiNoDataReasons: { ..., [id]: v } })`.
4. Atualizar gate por página: KPI em bucket `noData` exige razão preenchida.

### B. `kpiOutdatedUpdates` — desambiguar status hoje
1. Marcar `kpiOutdatedUpdates` como `@deprecated` em `MbrPreDraftData` e `MbrPreTeamSubmission` (campo opcional, mantém retrocompat de leitura).
2. `MbrPage.tsx`: manter contagem mas exibir `0` como "não capturado" (sem deixar parecer bug).
3. Documentar em `mem://features/okrs/mbr-ritual-specification` que update inline de valor de KPI será adicionado em ticket separado, reutilizando o SSOT `KpiValueEntryForm` via `allowInlineValueEntry` no `KpiGateStep`.

### C. Resumo completo
1. `MbrPreSummary.tsx`: adicionar (em ordem de fluxo do wizard):
   - Bloco "KPIs sem dados — razão" (renderiza após `SummaryKpiList` quando `Object.keys(kpiNoDataReasons).length > 0`).
   - Bloco "Análise do mês" (1 card colapsável quando `monthAnalysis` presente — `summary` + contadores).
   - Bloco "Decisões registradas" (read-only, listando `decisions` agrupadas por `sourceStep`, padrão visual de `DecisionCard`).
2. Não-objetivo: edição de decisões/análise no Summary (já editáveis nos steps anteriores).

### D. Validação
1. Teste vitest novo: `useMbrPreSubmissions` preserva `kpiNoDataReasons` 1:1 do payload.
2. Teste de integração leve em `MbrPreSummary`: render com draft completo mostra todos os blocos.
3. Smoke manual: completar Pré-MBR com KPI no bucket `noData` (preencher razão) → abrir MBR → conferir `kpiNoDataReasons` no `mbrPreByTeam[teamId]` e exibição no `MbrTeamOkrsDetailStep`.

## Arquivos afetados

- `src/modules/okrs/components/wizards/shared/framework/components/KpiGateStep.tsx` (props + render condicional via config)
- `src/modules/okrs/components/wizards/shared/framework/types.ts` (extensão de `KpiGateStepConfig`)
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiGateStep.tsx` (wiring + gate)
- `src/modules/okrs/pages/MbrPrePage.tsx` (handlers do draft)
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreSummary.tsx` (3 blocos novos)
- `src/modules/okrs/types/wizard/mbr.ts` (deprecar `kpiOutdatedUpdates`)
- `src/modules/okrs/hooks/__tests__/useMbrPreSubmissions.test.ts` (novo)
- Memória: atualizar `mbr-ritual-specification.md` com nota sobre update inline (ticket separado)

## Riscos e mitigações

- **Risco:** `splitNoDataReason` pode quebrar consumidores atuais do `KpiGateStep` se default mudar. **Mitigação:** default `false`; comportamento atual preservado.
- **Risco:** sessões antigas sem `kpiNoDataReasons` aparecerem "vazias" no MBR. **Mitigação:** já tratado — `useMbrPreSubmissions` faz `?? {}`.
- **Risco:** confusão entre `impactAssessment` (em `kpiSnapshots`) e `kpiNoDataReasons`. **Mitigação:** documentar no tipo + tooltip do textarea ("Plano de ação" vs "Razão de ausência de dados").
