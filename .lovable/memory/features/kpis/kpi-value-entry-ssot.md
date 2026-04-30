---
name: KPI Value Entry — SSOT compartilhado
description: KpiValueEntryForm é o único formulário de "Registrar valor de KPI" no Hub; consumido pelo modal /kpis e por todos os ritos. Sempre enviar input_type no insert (trigger DB depende disso).
type: feature
---

# KPI Value Entry — SSOT compartilhado

## Componente canônico
- **Arquivo:** `src/modules/kpis/components/shared/KpiValueEntryForm.tsx`
- **Schema:** `src/modules/kpis/components/shared/kpiValueEntrySchema.ts`
- **Barrel:** `src/modules/kpis/components/shared/index.ts`

## Consumidores
| Consumidor | `confidenceMode` | Observações |
|------------|------------------|-------------|
| `AddKpiValueDialog` (modal `/kpis`) | `advanced` | Override de confidence em `<details>` "Avançado" |
| `CollaboratorKpiStep` (rito Colaborador) | `always-visible` | Select de confiança sempre visível; gating extra de notes obrigatórias quando RAG estimado ≠ verde |
| Novos ritos (Team / Manager / MBR / QBR…) que precisem registrar valor | usar diretamente | Não recriar campos |

## Regras inquebráveis
1. **Não duplicar** schema/UI em outro wizard/modal. Estender o SSOT (nova prop / slot) é o único caminho.
2. **Sempre enviar `input_type`** no insert em `kpi_values`. O trigger DB `trg_kpi_value_derive_confidence` (TCR v3.29.1) usa esse valor para aplicar a confidence padrão; sem ele, a derivação fica inconsistente.
3. **Sugestão automática** de `consolidated`/`partial` via `suggestInputType` (em `@/modules/kpis/utils/frequency`). O componente já chama esse helper quando `consolidationFrequency` é informado.
4. **`KpiCheckinResult.inputType`** é opcional **apenas** por retrocompat de snapshots gravados antes desta migração. Writers novos devem sempre preencher.

## Decisões de design
- Submit é externo: o `<form>` recebe `formId` e o consumidor renderiza o botão Submit no footer (Dialog ou WizardShell). Isso permite footers compartilhados sem duplicar lógica de validação.
- O `valueAdornmentSlot` é o ponto de extensão para indicadores específicos do rito (delta vs. último valor, RAG estimado).
- `notesRequired` é apenas estado visual (asterisco + border-warning); o gating real de "notes obrigatórias" continua sendo do consumidor.

## Onde NÃO mexer
- Não criar formulários paralelos de KPI value em `src/modules/okrs/components/wizards/...`.
- Não inserir em `kpi_values` sem passar `input_type`.
- Não trocar `RadioGroup` Consolidado/Parcial por outro padrão sem atualizar este SSOT (UX precisa ser idêntica em todos os consumidores).
