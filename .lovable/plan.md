
# Aprimorar UI de "Registrar Valor" de KPI — Direção: Radios descritivos + Recomendado

## Objetivo

Eliminar a confusão entre **Consolidado** e **Parcial** no formulário de registrar valor de KPI, aplicando o conceito do protótipo aprovado: pré-seleção automática + badge "RECOMENDADO" + descrições contextuais com período calculado.

## Comportamento

1. **Pré-seleção automática.** Ao abrir o form (e sempre que `reference_date`, `consolidation_frequency` ou `update_frequency` mudarem), chamar `suggestInputType(kpi, refDate)` e setar `input_type` automaticamente. Marcar internamente que a sugestão é "automática" até o usuário clicar manualmente.

2. **Badge "Sugestão automática"** ao lado do label do grupo, enquanto o usuário não tiver feito override.

3. **Badge "RECOMENDADO"** no radio que veio da sugestão (estilo do protótipo v1: pill cinza claro com borda).

4. **Descrições contextuais por radio** — substituem os textos genéricos atuais. Usar período calculado via `getConsolidationPeriod(consolidation_frequency, refDate)`:
   - **Parcial:** "O período de **{mês/ano}** ainda está em aberto. Este valor representa o acumulado até a data."
   - **Consolidado:** "Valor final do período. Use apenas se estiver registrando o dado de fechamento de **{mês/ano}**."

5. **Período abaixo do campo Data de Referência** (microcopy estilo protótipo): linha pequena uppercase com "Maio/2026 — 01/05 → 31/05", substituindo o texto atual "Informe o último dia do período consolidado (até ontem)".

6. **Caso sem ambiguidade** (`update_frequency === consolidation_frequency`): a sugestão é sempre "Consolidado" e o grupo de radios continua visível com a mesma estética, mas o radio "Parcial" fica desabilitado com tooltip "Este KPI não tem janela parcial — atualiza no fechamento do período."

## Escopo de arquivos (somente frontend)

- **`src/modules/kpis/components/shared/KpiValueEntryForm.tsx`**
  - Importar e usar `suggestInputType` e `getConsolidationPeriod`.
  - Estado local `userTouchedInputType` para pausar a sugestão após override.
  - Reescrever o bloco `Tipo do input` no estilo do protótipo v1 (cards-radio com `border-2 border-primary` quando selecionado, badge RECOMENDADO no item sugerido).
  - Adicionar linha de período abaixo de "Data de Referência".
  - Trocar label `Tipo do input *` → `Tipo do registro` + badge "Sugestão automática".

- **`src/modules/kpis/utils/frequency.ts`** *(opcional, helper de microcopy)*
  - Novo helper `formatPeriodHuman(freq, refDate)` que devolve `{ label: "Maio/2026", range: "01/05 → 31/05" }` em pt-BR, encapsulando o uso de `getConsolidationPeriod` + `date-fns/locale/ptBR`.

- **Tokens semânticos** — usar `border-primary`, `bg-muted`, `text-muted-foreground`, `bg-info/10 text-info` (mapeando o slate/blue do protótipo para o design system Hub). NÃO usar `slate-*`/`blue-*` diretamente.

## Sem mudanças em

- `kpiValueEntrySchema.ts` (continua exigindo `input_type`).
- DB, RLS, triggers, `kpi_values`.
- Wizards específicos (CollaboratorKpiStep etc.) — consomem o SSOT e herdam.
- Layout geral do modal (Dialog, footer, tamanho).

## Validação

1. KPI mensal/mensal: abre com "Consolidado" pré-marcado + RECOMENDADO; "Parcial" desabilitado com tooltip.
2. KPI mensal/semanal, data hoje (período aberto): abre com "Parcial" pré-marcado + RECOMENDADO; usuário pode trocar para Consolidado.
3. KPI mensal/semanal, data = último dia do mês passado: abre com "Consolidado" pré-marcado.
4. Caso do print original (Logo Churn): não cai mais em estado de radio vazio obrigatório.
5. Microcopy do período aparece e atualiza ao trocar a data.

## Fora de escopo

- Reintrodução do campo `confidence` (proibida pela memória `kpi-value-entry-ssot`).
- Mudanças na lógica de RAG / suggest backend.
- Mudanças em outros formulários ou modais de KPI.
