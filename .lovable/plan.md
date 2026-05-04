# Plano — MBR v2 paralelo (rito novo, v1 intacto)

## Objetivo
Criar um rito MBR v2 organizado por **objetivos organizacionais** (não por times), com tempo proporcional à severidade, KPI Gate canônico de 4 caminhos e classificação de problema explícita — **sem alterar o MBR v1 nem o Pré-MBR v1**. Se v2 não ficar pronto a tempo, a BU usa v1 normalmente.

## Pré-checklist final (a confirmar antes de codar, leitura focada)
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` — confirmar que `mbr-v2` herda as mesmas permission keys de `mbr` (start/edit/finalize) ou se precisa de chaves novas.
- `docs/canonical/DATA_MODEL_REGISTRY.md` — reconfirmar que `okr_wizard_sessions.wizard_type` é texto livre e que RLS não filtra por valor específico.
- `src/modules/okrs/constants/ritualLabels.ts` — adicionar rótulo `mbr-v2` (SSOT).
- `mem://features/rituals/anonymous-evaluation-standard` — garantir que `/p/r/:shortCode` aceita o novo `wizard_type` no allowlist (MBR/QBR já aceitos; v2 precisa entrar).

## Princípios
1. **Zero impacto no v1.** Nenhum arquivo de `mbr/` ou `mbr-pre/` v1 é editado.
2. **Reuso máximo.** Reaproveitar `FullPageWizardShell`, `useOkrWizardSession`, `MbrKpiGateStep` (estendido por props, não duplicado quando possível), `EvaluationCollectionStep`, `MbrDecisionsStep` patterns.
3. **Sem migração SQL.** `wizard_type='mbr-v2'` convive na mesma tabela `okr_wizard_sessions`. `reflection_data jsonb` armazena o payload novo.
4. **Consome Pré-MBR v1 como está.** Onde o Pré-MBR v1 não trouxer classificação de problema, o v2 pede ao líder no próprio rito (campo opcional, com nudge).

## Arquitetura proposta

### Rota e ponto de entrada
- Nova rota: `/okrs/rituals/mbr-v2` registrada em `src/routes/okrsRoutes.tsx` via `lazyWithRetry`.
- Card adicional no hub de ritos (`OkrsRitualsPage` ou equivalente): "MBR v2 (beta)" ao lado do MBR atual, com badge "beta". Mesmo gate de permissão do MBR v1.
- Sem feature flag por BU nesta primeira entrega — quem entrar na rota usa v2; quem não entrar segue no v1. (Flag fica como evolução futura, se pedido.)

### Estrutura de arquivos novos
```text
src/modules/okrs/
├── pages/
│   └── MbrV2Page.tsx                      (novo; espelha MbrPage mas com steps v2)
├── components/wizards/mbr-v2/
│   ├── steps/
│   │   ├── MbrV2OpeningStep.tsx           (abertura executiva curada por IA — reaproveita useMbrOpeningCuration)
│   │   ├── MbrV2KpiGateStep.tsx           (KPI Gate v2: 4 caminhos canônicos)
│   │   ├── MbrV2OrgObjectivesOverviewStep.tsx  (lista objetivos com severidade calculada)
│   │   ├── MbrV2OrgObjectiveDetailStep.tsx     (step dinâmico, 1 por objetivo, tempo por severidade)
│   │   ├── MbrV2LooseItemsStep.tsx        (itens avulsos opcional)
│   │   ├── MbrV2CarryOverStep.tsx         (status obrigatório nas decisões anteriores)
│   │   ├── MbrV2DecisionsStep.tsx         (decisões formais como output)
│   │   └── MbrV2ClosingStep.tsx           (checklist enxuto + badges derivadas)
│   └── shared/
│       ├── ObjectiveSeverityBadge.tsx
│       └── KpiGateResolutionPicker.tsx    (4 caminhos: immediate_decision | delegated_investigation | analyzed | blocked)
├── hooks/
│   ├── useMbrV2OrgObjectiveAnalyses.ts    (lê Pré-MBR v1 + KPIs/KRs/projetos e calcula severidade por objetivo)
│   └── useMbrV2Session.ts                 (wrapper de useOkrWizardSession com wizard_type='mbr-v2')
├── types/
│   └── mbrV2.ts                           (MbrV2DraftData, MbrV2OrgObjectiveAnalysis, MbrV2KpiGateResolution, etc.)
└── constants/
    └── mbrV2.ts                           (STEP_ORDER v2, severity thresholds, time budgets)
```

### Steps do MBR v2 (ordem)
1. **Abertura Executiva** (curada por IA, reusa Pré-MBR v1 agregado).
2. **KPI Gate** (6-bucket canônico; cada KPI crítico exige uma das 4 resoluções).
3. **Visão Geral por Objetivo Organizacional** (cards ordenados por severidade: Alta 25-30 min, Média 15 min, Baixa 2-3 min).
4. **Detalhe por Objetivo** (N steps dinâmicos — um por objetivo selecionado para discussão; mostra KRs, projetos vinculados, classificação do Pré-MBR v1 quando existir, espaço para decisões inline).
5. **Itens Avulsos** (opcional; sugestões de pauta sem objetivo associado).
6. **Carry-over** (decisões do MBR anterior — status obrigatório: concluida | replanejada | cancelada | em_andamento).
7. **Decisões Formais** (output obrigatório — usa o vocabulário canônico de `wizard-vocabulary-canonical`).
8. **Avaliação Anônima** (reusa `EvaluationCollectionStep`; wizard_type adicionado ao allowlist do `/p/r/:shortCode`).
9. **Encerramento** (badges derivadas de cobertura: Pré-MBR consumido, KPI Gate resolvido, decisões registradas).

### Severidade do Objetivo (cálculo no `useMbrV2OrgObjectiveAnalyses`)
Combina:
- Status efetivo dos KRs filhos (`effective-kr-status-logic`): `at_risk` ou `stagnant` → +peso.
- KPIs vinculados em bucket crítico (`critical`/`alert`).
- Projetos vinculados atrasados/bloqueados.
- Classificação de problema do Pré-MBR v1 (quando presente) — `unknown`/`external`/`capacity` adiciona peso.

Output: `{ severity: 'high' | 'medium' | 'low', timeBudgetMin: number, drivers: string[] }`.

### Persistência
- `okr_wizard_sessions` com `wizard_type='mbr-v2'`, `reflection_data` armazenando `MbrV2DraftData`.
- Decisões persistidas via fluxo canônico já usado pelo v1 (`okr_decisions` ou tabela equivalente — confirmar no `DATA_MODEL_REGISTRY`).
- Avaliação anônima: shortcode emitido pelo mesmo mecanismo do v1.

## Compatibilidade e fallback
- v1 segue 100% funcional, mesma rota, mesmas queries. Nada em v1 é tocado.
- Se v2 quebrar, basta esconder o card "MBR v2 (beta)" — feito por uma const `ENABLE_MBR_V2 = true` em `src/modules/okrs/constants/mbrV2.ts`.

## Fora de escopo
- Pré-MBR v2 (decisão do usuário: consumir v1 sem alterações).
- Migração de dados de MBRs v1 para v2.
- Feature flag por BU.
- Substituir cards do hub — v2 é adição, não substituição.

## Riscos
- **Severidade calculada divergir da percepção do líder** → mitigado com botão "ajustar severidade" no Overview, persistido no draft.
- **Avaliação anônima** → precisa adicionar `mbr-v2` ao allowlist do edge function/RPC; risco baixo, edição pontual.
- **Permission keys** → se RBAC exigir chaves novas (`okrs.rituals.mbr_v2.*`), criar migração; senão herdar `mbr`.

## Entregáveis
1. Rota `/okrs/rituals/mbr-v2` funcional.
2. Card no hub de ritos (beta).
3. 9 steps + hooks + types + constants.
4. Allowlist da avaliação anônima atualizada.
5. Atualização de `ritualLabels.ts` (SSOT).
6. Memória nova: `mem://features/rituals/mbr-v2-standard` documentando o rito.

## Validação
- Smoke test manual no preview: criar sessão v2, navegar todos os steps, finalizar, conferir `reflection_data` no banco.
- Confirmar que MBR v1 segue abrindo e finalizando normal.
- Conferir avaliação anônima emitindo shortcode válido para `mbr-v2`.
