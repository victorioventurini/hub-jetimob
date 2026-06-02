# Corrigir Relatórios Executivos (MBR + QBR) — seleção de times e transparência

## Diagnóstico

Para o ciclo `8fd8d5fa…` e mês `2026-05`:

- A **página `/okrs/executive/mbr-report`** lista 5 times concluídos (BizOps, Comercial, Customer Success, Gente & Cultura, Produto) usando `useRitualPreparationStatus` → filtra `okr_wizard_sessions` por `wizard_type='mbr-pre'`, `status='completed'` e `completed_at` dentro da **janela do rito** definida no ciclo.
- A **edge function `mbr-executive-report`** filtra as mesmas sessões mas por `reflection_data.data.referenceMonth = monthRef` (`extractors.ts:197-210`). Resultado: só 3 times entram (BizOps, Comercial, Gente & Cultura). Customer Success e Produto ficam de fora porque iniciaram o draft em 31/maio (quando `defaultReferenceMonth` ainda era abril) e submeteram em 01/jun com `referenceMonth='2026-04'` preso no draft.

Há, portanto, **duas fontes da verdade divergentes** para "quais times participam do MBR do mês". O usuário vê 5 na UI, mas a IA só analisa 3.

## Objetivos

1. Relatório Executivo de MBR passa a analisar **exatamente os mesmos times** que a UI mostra como concluídos.
2. Topo do relatório (MBR e QBR) exibe explicitamente **quais times foram analisados** — para evitar que qualquer divergência futura passe despercebida.

## Plano de implementação

### 1) Alinhar seleção de times no MBR Executive Report (edge function)

Arquivo: `supabase/functions/mbr-executive-report/`

- **`data-loader.ts`**: na query de `mbr-pre`, deixar de carregar tudo do ciclo e passar a usar a janela do mês (`completed_at >= window.start AND completed_at <= window.end`). A janela vem do ciclo (`okr_cycles.review_date_first_month` / `review_date`) + bounds do `monthRef`. Em vez de re-derivar tudo do zero na edge, a forma mais simples e SSOT é: o frontend já calcula a janela em `useRitualAvailability`; passar `windowStart`/`windowEnd` no body da invoke.
- Alternativa mais robusta: introduzir helper compartilhado em `supabase/functions/_shared/ritualWindow.ts` que recebe `cycle` + `monthRef` + `ritualType` e devolve `{start, end}`. Edge usa o helper para filtrar por `completed_at`. Mantém a regra do `useRitualAvailability` como referência mas duplica o cálculo (puro, determinístico).
- **`extractors.ts:197-210`** (`filterSessionsByMonth`): remover (ou manter como fallback de log/debug, não como filtro hard). O filtro de verdade vira a janela em `data-loader`.
- **Deduplicação**: agrupar por `team_id`, manter a sessão mais recente (`completed_at DESC`). Hoje não há dedup — duas sessões `completed` do mesmo time no mesmo mês entram em dobro.
- **Validação**: o guard `NO_MBR_PRE_FOR_MONTH` (`index.ts:165`) passa a usar o resultado da nova seleção.

### 2) Header "Times analisados" no payload do MBR Executive Report

- Edge function devolve, junto do payload, um array `analyzedTeams: Array<{ id, name, completedAt, leaderName }>` baseado na seleção acima.
- O payload já é persistido em `okr_wizard_sessions` (`wizard_type='mbr-executive-report'`); incluir `analyzedTeams` em `reflection_data` para cache.

### 3) UI — `MbrExecutiveReportPage`

- Renderizar bloco fixo no topo do relatório:
  - Título: "Times analisados neste relatório (N)"
  - Lista compacta: `Nome do time · Líder · concluído em <data>`
  - Subtexto explicativo: "Apenas times com MBR-pré concluído dentro da janela do rito são considerados."
- Componente novo: `src/modules/okrs/components/mbr/AnalyzedTeamsHeader.tsx`.
- Usa `analyzedTeams` direto do payload — não refaz query.

### 4) Mesmo header no QBR Executive Report

Arquivos: `supabase/functions/qbr-executive-report/` + `src/modules/okrs/pages/QbrExecutiveReportPage.tsx` (ou equivalente).

- A edge do QBR já filtra por `wizard_type='qbr-pre' AND status='completed' AND cycle_id = X` (sem filtro de mês, correto para QBR). Não há bug de seleção, mas falta transparência.
- Adicionar mesmo array `analyzedTeams` no payload (com `completedAt`, `leaderName`, `teamName`).
- Reutilizar o mesmo componente `AnalyzedTeamsHeader` (renomear para `AnalyzedTeamsHeader` genérico, prop `ritual: 'MBR' | 'QBR'`).

### 5) Regerar relatório do ciclo afetado

- Após deploy, a UI já tem botão "Regenerar". O usuário pode acionar e o relatório de maio passa a incluir os 5 times.
- Não há necessidade de migration: o filtro por janela cobre as sessões existentes sem precisar corrigir o `referenceMonth` armazenado.

## Detalhes técnicos

```
edge mbr-executive-report
  ├── data-loader.ts        # filtra mbr-pre por completed_at ∈ janela do mês
  ├── ritualWindow helper   # (novo) deriva {start,end} de cycle + monthRef
  ├── extractors.ts         # remove filterSessionsByMonth, adiciona dedup por team
  └── index.ts              # devolve analyzedTeams no payload

edge qbr-executive-report
  └── data-loader.ts        # já correto; só adicionar analyzedTeams no payload

UI
  ├── components/mbr/AnalyzedTeamsHeader.tsx  # novo, reutilizável MBR+QBR
  ├── pages/MbrExecutiveReportPage.tsx        # render do header
  └── pages/QbrExecutiveReportPage.tsx        # render do header
```

### Fora de escopo (sugestões para depois)

- **Corrigir `referenceMonth` "preso" no draft**: o wizard MBR-pré snapshot o `referenceMonth` quando o draft é criado. Se um líder começa em 31/mai e submete em 01/jun, fica preso em abril. Solução: re-snapshot na submissão (`MbrPreOpeningStep` salvar `referenceMonth = defaultReferenceMonth()` no submit, ou usar a janela do rito ativa). Pode ser feito num PR seguinte — esta correção do executivo não depende disso porque passamos a usar `completed_at` na janela.
- **Backfill de `referenceMonth` em sessões antigas**: não necessário para esta correção.

## Validação

- Após deploy + regenerar o relatório de `2026-05`:
  - `analyzedTeams.length === 5`
  - Lista contém BizOps, Comercial, Customer Success, Gente & Cultura, Produto
  - Topo do relatório exibe a lista com líder + data de conclusão
- Sanidade no QBR: ao abrir um relatório existente, o header lista todos os times com `qbr-pre` concluído no ciclo.
