## Objetivo

Remover o input inline **"Registros de nota e decisão"** (`InlineDecisionInput`) das etapas dos ritos de **preparação**, mantendo intactos os ritos coletivos (Team Check-in, Weekly, QBR Meeting/Post, MBR, C-Level Check-in).

## Escopo (ritos afetados)

| Rito | Wizard | Status |
|------|--------|--------|
| Pré-Check-in do Time | `leader-prep` | Já não usa `InlineDecisionInput` — sem mudança |
| Pré-Weekly | `pre-weekly` | Remover dos 3 steps |
| Pré-QBR (líder) | `qbr-pre` | Remover dos 3 steps |
| Pré-QBR C-Level | `qbr-pre-clevel` | Remover dos 2 steps |
| Pré-MBR | `mbr-pre` | Remover dos 2 steps |

## O que muda

Em cada arquivo abaixo: remover a importação de `InlineDecisionInput` do barrel `../shared`, remover o bloco JSX `<InlineDecisionInput ... />` no fim do step e limpar props/handlers que ficarem órfãos (ex.: `onAddDecision`/`decisions` se passados só para o input).

**Pré-Weekly** (`src/modules/okrs/components/wizards/pre-weekly/`)
- `PreWeeklySourcesStep.tsx`
- `PreWeeklyPautaStep.tsx`
- `PreWeeklyPessoasStep.tsx`

**Pré-QBR** (`src/modules/okrs/components/wizards/qbr-pre/`)
- `QbrBalanceStep.tsx`
- `QbrKpiAnalysisStep.tsx`
- `QbrLearningsStep.tsx`

**Pré-QBR C-Level** (`src/modules/okrs/components/wizards/qbr-pre-clevel/`)
- `QbrCLevelStrategicStep.tsx`
- `QbrCLevelDirectivesStep.tsx`

**Pré-MBR** (`src/modules/okrs/components/wizards/mbr-pre/`)
- `MbrPreHighlightsStep.tsx`
- `MbrPreNextStepsStep.tsx`

## O que NÃO muda

- **Bloco "Notas e decisões" nos Resumos** (`PreWeeklySummary`, `QbrPreSummary`, `MbrPreSummary`): preservado para exibir decisões herdadas/legadas.
- **Tipo `decisions` no draft** (`PreWeeklyDraftData`, etc.): preservado — só o input é removido; a estrutura de dados continua válida para leitura.
- **Outros ritos** (Team, Weekly, QBR Meeting/Post, MBR, C-Level): inalterados.
- **Testes**: arquivos `__tests__` dos pré-ritos serão revisados; se houver assertion direta sobre o input, será removida (não há expectativa de criar novos testes).

## Validação pós-mudança

1. Build limpo (sem import órfão de `InlineDecisionInput`).
2. Abrir cada wizard pré-rito e confirmar que o card de cadastro de decisão sumiu.
3. Confirmar que o Resumo final ainda renderiza o bloco "Notas e decisões" quando há registros legados.

## Memória

Atualizar `mem://architecture/wizards/wizards-master-standard` com nota: "Inline decisions input desativado em ritos de preparação (leader-prep, pre-weekly, qbr-pre, qbr-pre-clevel, mbr-pre); permanece em ritos coletivos."