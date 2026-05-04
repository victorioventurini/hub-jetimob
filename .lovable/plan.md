## Problema

No Pré-MBR (`/rituals/mbr-pre`), as etapas **"Indicadores do Time" (KPIs)** e **"KRs do Time"** estão julgando bem/mal usando dados do **estado atual** (mês corrente / valor mais recente), não dados ancorados no **mês de referência** que está sendo analisado.

Evidência: o screenshot mostra o KPI "MRR commit" como "Crítico / Parcial" com **R$ 200** e "Último: 02/05/2026", mas o Pré-MBR analisa **abril** (mês fechado). O valor de maio não deveria pintar a análise de abril.

## Causa raiz

| Etapa | Hoje | Problema |
|---|---|---|
| **KPI Gate** (`MbrPreKpiGateStep`) | Consome `useKpisForWizardV2` → estado **atual** do KPI (último valor disponível, sem cutoff) | Inclui valores posteriores ao mês de referência → RAG e bucket errados |
| **KR Analysis** (`MbrPreKrAnalysisStep`) | A seed do `MbrPrePage` (linhas 273-350) já usa cutoff no fim do `refMonth` para `current_value` e `last_checkin_at` ✅ | Tecnicamente já está correto; vale revisar somente |

A snapshot mensal **já existe** (`useMbrPreTeamKpisMonthly`) — só não é consumida pelo KPI Gate; hoje só alimenta a Abertura.

## Plano de correção

### 1. KPI Gate ancorado no mês de referência (foco principal)

Reescrever `MbrPreKpiGateStep` para:

- Consumir `useMbrPreTeamKpisMonthly(teamId, referenceMonth)` em vez de `useKpisForWizardV2`.
- Construir os 6 buckets canônicos (KPIs Master v3) **a partir dos snapshots mensais**, usando `currentValue`/`previousValue`/`ragStatus` ancorados no fim do mês.
- Manter o componente visual `KpiGateStep` (`@/wizards-framework`) e o gate de planos obrigatórios.
- Receber `referenceMonth` via prop (já disponível em `draft.data.referenceMonth`).

Ajustar `classifyKpiGateBuckets` (ou criar variante mensal) para receber snapshots já ancorados e classificar:
- **overdue**: KPI sem valor consolidado dentro do mês de referência
- **critical**: `ragStatus === 'red'` no fim do mês
- **alert / strategic / teamContext**: mesmas regras, agora com base nos valores mensais
- **guardrailViolated**: requer dado mensal de guardrail (manter atual se não houver versão mensal — documentar como gap)

### 2. Etiqueta visual de contexto temporal

No header do KPI Gate e do KR Analysis, exibir badge: **"Análise de [mês/ano de referência]"** para deixar claro ao usuário que valores posteriores foram ignorados.

### 3. Validação do KR Analysis

Confirmar que `MbrPreKrAnalysisStep` exibe **somente** o `currentValue` ancorado no cutoff (vem de `krFinalStates` + `sourceObjectives`). Se o `CheckinContextBlock` mostrar "último check-in" em data posterior ao mês, fixar para usar o `last_checkin_at` do snapshot, não o do KR original.

### 4. QA

Cenários a validar manualmente após implementação:
- KPI com valor lançado em maio (mês posterior) → não deve aparecer no Pré-MBR de abril
- KPI sem nenhum valor em abril → bucket **overdue**
- KR com último check-in em 28/04 e novo em 03/05 → mostrar valor de 28/04
- Badge "Análise de Abril/2026" visível em ambas as etapas

## Detalhes técnicos

**Arquivos a alterar:**
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiGateStep.tsx` — trocar fonte de dados; receber `referenceMonth` como prop
- `src/modules/okrs/pages/MbrPrePage.tsx` — passar `referenceMonth` para o `MbrPreKpiGateStep`
- `src/modules/okrs/components/wizards/shared/framework/config/stepContentAdapters.ts` — adicionar/ajustar `classifyKpiGateBucketsFromMonthlySnapshots` (ou parametrizar `classifyKpiGateBuckets` para aceitar snapshots já filtrados)
- `src/modules/okrs/hooks/useMbrPreTeamKpisMonthly.ts` — possível enriquecer com `lastInputType`, guardrails mensais e flags necessários ao classificador
- (Opcional) `MbrPreKrAnalysisStep.tsx` — badge de mês de referência

**Fora de escopo:**
- MBR v1 e MBR v2 não são alterados.
- Lógica do Check-in individual e do QBR-Pre não muda.
