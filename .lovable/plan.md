
# Plano — Step de Validação de Dados (Pré-MBR)

## Objetivo

Adicionar um **novo primeiro step** ao wizard Pré-MBR (`/rituals/mbr-pre`) que **exige** que o líder do time atualize/consolide KPIs e registre check-ins de KRs **antes** de iniciar a abertura do rito. O líder pode resolver tudo direto na própria tela, sem sair do wizard.

Princípios:
- **Não duplicar** dialogs/forms — reutilizar `AddKpiValueDialog` (KPI) e `CheckinDialog` (KR).
- **Não criar** classificadores paralelos — reutilizar `useKpisForWizardV2` (estendido para Regra B) + `useKpiData`/`isKpiUpdateOverdue`/`getMissingConsolidationPeriods` já SSOT.
- **Step canônico do framework** quando possível; se a UX pedir layout próprio (lista mista KPI+KR), criar `MbrPreDataValidationStep` no `mbr-pre/` consumindo blocos shared (`WizardStepScaffold`, `WizardStepHeader`, `WizardStepFooter`, `LatestCheckinSummary`, `KpiStatusBlocks`, `JustificationField`).
- Gate de avanço: **botão "Próximo" desabilitado enquanto pendências obrigatórias existirem**, com contador visível.

---

## UX da tela

Layout em duas seções colapsáveis:

```
┌─────────────────────────────────────────────────────────┐
│ Validação de Dados — antes de iniciar o Pré-MBR          │
│ Atualize KPIs e check-ins do time para o mês de Abril   │
│ [3 KPIs pendentes] [2 KRs sem check-in no mês]           │
├─────────────────────────────────────────────────────────┤
│ ▼ Indicadores (KPIs) — 3 pendentes                       │
│   [KPI A] Atualização atrasada (mensal)  [Registrar]     │
│   [KPI B] Consolidação pendente (Abr)    [Registrar]     │
│   [KPI C] OK ✓                                           │
├─────────────────────────────────────────────────────────┤
│ ▼ Resultados-Chave (KRs) — 2 pendentes                   │
│   [KR X] Sem check-in há 38 dias        [Fazer check-in] │
│   [KR Y] Último check-in fora do mês     [Fazer check-in]│
│   [KR Z] OK ✓                                            │
├─────────────────────────────────────────────────────────┤
│ [ Voltar ]              [ Próximo (5 pendências) ]       │
└─────────────────────────────────────────────────────────┘
```

Cada linha pendente tem botão que abre o `AddKpiValueDialog` ou `CheckinDialog` correspondente. Ao salvar, a query é invalidada e o item desaparece da lista.

Regra de gate (mesma do filtro do dashboard de KPIs):
- **KPI pendente** = `update_overdue` OU `consolidation_pending` (mês de referência incluído nos períodos faltantes).
- **KR pendente** = `last_checkin_at` é null OU está fora do `referenceMonth` do Pré-MBR (mês fechado anterior).

Opção de **"pular" pendências** (override): apenas para admin/superadmin via permission `okr.manage_all`, com confirmação e log em decisão. Para líder comum, não há bypass.

---

## Plano técnico

### 1. Estender `useKpisForWizardV2` com Regra B

Hoje só considera Regra A (`isKpiUpdateOverdue`). Adicionar `consolidation_pending` por KPI usando `getMissingConsolidationPeriods` (já SSOT em `kpis/utils/frequency.ts`), seguindo o mesmo padrão do `useKpiData`. Resultado:

- Adicionar campos `consolidation_pending: boolean` e `missing_consolidation_count: number` em `KpiForWizardV2`.
- `needs_update` passa a ser `update_overdue || consolidation_pending`.
- `kpisToUpdate` continua sendo `filter(k => k.needs_update)` — sem mudança no consumo atual.

### 2. Hook novo: `useMbrPreValidationData(teamId, referenceMonth)`

Em `src/modules/okrs/hooks/useMbrPreValidationData.ts`. Combina:
- `useKpisForWizardV2({ scope:'leader', responsibleTeamId: teamId, lifecycleStatuses:['active','proposed'] })` → lista de pendências de KPI.
- Reaproveita a query existente de `teamObjectives` (já carregada em `MbrPrePage`) — passada via prop, não refeita. Filtra KRs cujo último check-in seja anterior ao início do mês de referência ou ausente.

Retorna:
```ts
{
  kpisPending: Array<{ kpi, reason: 'overdue' | 'pending_consolidation' | 'both' }>;
  kpisOk: KpiForWizardV2[];
  krsPending: Array<{ kr, objective, reason: 'never' | 'before_ref_month' }>;
  krsOk: Array<{ kr, objective }>;
  totalPending: number;
  isLoading: boolean;
}
```

### 3. Novo step component: `MbrPreDataValidationStep`

`src/modules/okrs/components/wizards/mbr-pre/MbrPreDataValidationStep.tsx`.

Reutiliza:
- `WizardStepScaffold` + `WizardStepHeader` + `WizardStepFooter` (shared).
- `Card`/`Collapsible`/`Badge` do shadcn.
- `KpiStatusBlocks` ou `LatestCheckinSummary` para chip de status (avaliar — usar o existente que melhor encaixa, sem novo).
- Botões abrem `AddKpiValueDialog` (KPI) e `CheckinDialog` (KR) — ambos canônicos. Após `onOpenChange(false)` em sucesso, invalidar `kpisKeys.forWizardV2(...)` e `mbrKeys.preTeamKrs(...)`.

Gate: `primaryDisabled={totalPending > 0}` e label dinâmico `Próximo (N pendências)` / `Próximo`.

### 4. Registrar o step no `MbrPrePage`

- Adicionar `'data-validation'` em `MbrPreStep` (`types/wizard/mbr.ts`) **antes** de `'opening'`.
- Inserir como primeiro item em `WIZARD_STEPS` e `STEP_ORDER`.
- Mapear no `renderStepContent()` antes de `'opening'`.
- Drafts antigos (sem o step) hidratam normalmente: o `defaultStep` muda para `'data-validation'`; rascunhos com `currentStep === 'opening'` continuam abrindo lá (já existe a tolerância `'balance'` legada — replicar comentário `@deprecated` se necessário).

### 5. Testes

- `useMbrPreValidationData.test.ts`: cobre matriz Regra A × Regra B × KR sem check-in / fora do mês.
- Estende `frequency.test.ts` se houver lacuna em `getMissingConsolidationPeriods` para o mês de referência atual.

### 6. Documentação

- Atualizar `mem://features/rituals/mbr-pre-data-validation-gate` (novo) com a regra de gate e referência cruzada para `kpis-master-standard` e `cycles-and-rituals-master`.
- Nota no `mem://features/kpis/kpis-master-standard` que `useKpisForWizardV2` agora propaga `consolidation_pending` (sem mudança de contrato externo).

---

## Arquivos a criar/editar

**Criar:**
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreDataValidationStep.tsx`
- `src/modules/okrs/hooks/useMbrPreValidationData.ts`
- `src/modules/okrs/hooks/__tests__/useMbrPreValidationData.test.ts`
- `mem://features/rituals/mbr-pre-data-validation-gate`

**Editar:**
- `src/modules/kpis/hooks/useKpisForWizardV2.ts` (adicionar `consolidation_pending` + `missing_consolidation_count`)
- `src/modules/kpis/types.ts` (campos no `KpiForWizardV2`)
- `src/modules/okrs/types/wizard/mbr.ts` (`'data-validation'` em `MbrPreStep`)
- `src/modules/okrs/pages/MbrPrePage.tsx` (steps, order, render, defaultStep)
- `src/modules/okrs/components/wizards/mbr-pre/index.ts` (barrel)
- `mem://index.md` (referência ao novo memory)

**Não tocar:**
- `AddKpiValueDialog`, `KpiValueEntryForm`, `CheckinDialog` — consumidos como estão.
- Demais steps do Pré-MBR.

---

## Riscos e mitigações

1. **Drafts em andamento** que não têm o novo step → tratamos no `renderStepContent` com fallback (qualquer step desconhecido cai em `'data-validation'` se as pendências não foram resolvidas; senão, abre `'opening'`).
2. **KR com `last_checkin_at` null mas com check-ins reais** (caso histórico) → o seed de `krFinalStates` já lê `okr_checkins`; reutilizamos a mesma `lastByKr` map em vez de confiar em `last_checkin_at`.
3. **Líder sem permissão de check-in em KR contribuído** → exibimos a pendência mas o botão fica desabilitado com tooltip "Solicite ao time dono atualizar este KR" e não conta no gate (apenas avisa).
4. **Performance** → tudo deriva de queries já carregadas pela página; nenhuma query adicional além das existentes.

---

## Pontos para decisão (opcional)

Se preferir, podemos no momento da implementação:
- (a) Tornar **KRs contribuídos opcionais** no gate (default proposto) ou exigi-los também.
- (b) Permitir **bypass com justificativa** para qualquer líder (registrando decisão), em vez de restrito a admins.

Sigo com os defaults se você aprovar como está.
