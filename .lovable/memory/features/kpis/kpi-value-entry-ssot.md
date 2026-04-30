---
name: KPI Value Entry — SSOT compartilhado
description: KpiValueEntryForm é o único formulário de "Registrar valor de KPI" no Hub; consumido pelo modal /kpis e por todos os ritos. Sempre enviar input_type no insert. Campo `confidence` foi REMOVIDO em v3.30.0 (autoavaliação subjetiva eliminada).
type: feature
---

# KPI Value Entry — SSOT compartilhado

## Componente canônico
- **Arquivo:** `src/modules/kpis/components/shared/KpiValueEntryForm.tsx`
- **Schema:** `src/modules/kpis/components/shared/kpiValueEntrySchema.ts`
- **Barrel:** `src/modules/kpis/components/shared/index.ts`

## Consumidores
| Consumidor | Observações |
|------------|-------------|
| `AddKpiValueDialog` (modal `/kpis`) | Form padrão (valor, data, input_type, notes) |
| `EditKpiValueDialog` | Idem (sem campo confidence) |
| `CollaboratorKpiStep` (rito Colaborador) | Form padrão + gating de notes obrigatórias quando RAG estimado ≠ verde |
| Novos ritos (Team / Manager / MBR / QBR…) que precisem registrar valor | Usar diretamente o SSOT — não recriar campos |

## Regras inquebráveis
1. **Não duplicar** schema/UI em outro wizard/modal. Estender o SSOT (nova prop / slot) é o único caminho.
2. **Sempre enviar `input_type`** (`consolidated` | `partial`) no insert em `kpi_values`.
3. **Sugestão automática** de `consolidated`/`partial` via `suggestInputType` (em `@/modules/kpis/utils/frequency`). O componente já chama esse helper quando `consolidationFrequency` é informado.
4. **NUNCA** reintroduzir o campo `confidence` em KPIs (autoavaliação subjetiva). A confiabilidade do dado é inferida de:
   - `input_type` (Consolidado = dado fechado / Parcial = dado em construção)
   - `source` (manual / api / integration / ...)

## Decisões de design
- Submit é externo: o `<form>` recebe `formId` e o consumidor renderiza o botão Submit no footer (Dialog ou WizardShell). Isso permite footers compartilhados sem duplicar lógica de validação.
- O `valueAdornmentSlot` é o ponto de extensão para indicadores específicos do rito (delta vs. último valor, RAG estimado).
- `notesRequired` é apenas estado visual (asterisco + border-warning); o gating real de "notes obrigatórias" continua sendo do consumidor.

## Histórico
- **v3.30.0 (2026-04-30)** — Removido o campo `confidence` (coluna, enum `kpi_confidence_level`, trigger `trg_kpi_value_derive_confidence` e função `derive_kpi_value_confidence`). Motivo: autoavaliação subjetiva sem valor analítico — confiabilidade do dado já é capturada por `input_type` + `source`.

## Onde NÃO mexer
- Não criar formulários paralelos de KPI value em `src/modules/okrs/components/wizards/...`.
- Não inserir em `kpi_values` sem passar `input_type`.
- Não reintroduzir `confidence` em `kpi_values` sob nenhuma hipótese.
- Não confundir com `okr_checkins.confidence` (KR check-ins) — feature distinta e ATIVA.
