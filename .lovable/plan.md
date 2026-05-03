## Pré-checklist (executado)

Consultei: TCR §4.8.1 (Wizards Framework v3, decisões inline), `DEVELOPMENT_STANDARDS.md`, `WIZARDS_FRAMEWORK_BOUNDARY.md`, `IDENTITY_CONVENTION.md`, `PERMISSIONS_AND_RBAC_MODEL.md`, `mem://features/kpis/kpis-master-standard` (KPI Gate 6 buckets, `metadata.kpi_id`/`source='kpi_gate'`), `mem://standards/wizard-vocabulary-canonical`. Mapeei componentes existentes — todas as mudanças são por extensão/composição, sem novos componentes.

## Diagnóstico do bloqueio

Em `MbrKpiGateStep.tsx` (linhas 60-72), o gate de avanço conta decisões via `decisions.filter(d => d.sourceStep === 'kpi-gate')` de forma agregada — não casa decisão↔KPI por `metadata.kpi_id`. Como o bucket canônico já marca `requiresStrategicDecision=true` automaticamente para red/amber, e o usuário pode registrar decisões via `_InlineDecisionsSlot` em outros steps com mesmo `sourceStep`, a contagem fica ambígua e o botão pode travar mesmo após registrar plano.

Além disso, o toggle "Exige decisão estratégica?" é um vestígio do MBR executivo — no MBR-Pré ele é redundante (a obrigatoriedade vem do bucket canônico) e gera ruído cognitivo.

## Mudanças

### 1. Estender `MbrKpiGateStep` (componente central, sem duplicar)
- Adicionar prop opcional `showStrategicDecisionToggle?: boolean` (default `true` — preserva MBR executivo).
- Adicionar prop opcional `requirePlanForCriticalKpis?: boolean` (default `false`) que troca o gate genérico por gate por-KPI:
  - cada KPI com `requiresStrategicDecision=true` precisa de ≥1 decisão com `metadata.kpi_id === kpi.kpiId` e `text` não vazio;
  - mensagem de pendência lista o nome dos KPIs faltantes em vez de número genérico.
- Quando `showStrategicDecisionToggle=false`, ocultar o bloco do `Switch` e tratar `requiresStrategicDecision` como derivado do bucket canônico (já vem `true` para red/amber).
- O `InlineDecisionInput` interno já recebe `metadataFactory` com `kpi_id` — nenhuma mudança necessária ali.

### 2. Wrapper `MbrPreKpiGateStep`
- Passar `showStrategicDecisionToggle={false}` e `requirePlanForCriticalKpis={true}`.
- Remover a lógica de "preservar toggle do líder" no merge de snapshots (linhas 120-129) — sempre derivar `requiresStrategicDecision` do bucket canônico.

### 3. Sugestões de pauta sem categoria em todo MBR-Pré
- Auditoria: Highlights, Next-Steps e Summary (via `AgendaSuggestionsPrioritizer`) já estão em `categoryless`. Não há ação de runtime pendente nesses três.
- Limpar props mortas em `MbrPreProjectsStep` (`agendaSuggestions`, `onAgendaSuggestionsChange`, `agendaTriggerLabel`) — declaradas mas nunca renderizadas e nunca passadas pelo `MbrPrePage`.
- Caso o KPI Gate venha a expor sugestão de pauta no futuro, usar o mesmo `InlineAgendaSuggestionInput categoryless` — não cria componente novo.

### 4. Verificação
- Rota `/rituals/mbr-pre?team=...&step=kpi-analysis`:
  - "Exige decisão estratégica?" não aparece;
  - cada KPI red/amber exige plano inline (decisão com `kpi_id` correspondente);
  - botão "Próximo" habilita apenas quando todos os KPIs obrigatórios têm plano;
  - mensagem de pendência mostra nomes dos KPIs faltantes.
- Cobertura existente em `MbrKpiGateStep.test.tsx` continua passando (default props inalterados); adicionar 2-3 casos para o novo modo.

## Detalhes técnicos

- Nada na schema/RLS/edge muda. É refactor de UI/lógica de gate em 2 componentes + limpeza de props.
- Decisões persistidas continuam com `sourceStep='kpi-gate'` e `metadata={ source:'kpi_gate', kpi_id, kpi_rag_status, kpi_input_type? }` — formato canônico já em uso.
- Sem impacto em rascunhos antigos: snapshots persistidos continuam válidos; o gate apenas reinterpreta a obrigatoriedade.

## Arquivos afetados

- `src/modules/okrs/components/wizards/mbr/MbrKpiGateStep.tsx` (estender props + gate por-KPI)
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiGateStep.tsx` (passar novas props, simplificar merge)
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreProjectsStep.tsx` (limpar props mortas)
- `src/modules/okrs/components/wizards/mbr/__tests__/MbrKpiGateStep.test.tsx` (novos casos)