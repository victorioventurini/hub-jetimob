## Correção

Você está certo: **MBR v2 foi descontinuado** e `MbrV2Page` não existe mais no código (só `MbrPage` e `MbrPrePage`). A menção em `docs/audits/PERFORMANCE_PLAN_2026-05-04.md` (linha 36) é resíduo desatualizado — foi por isso que sugeri esse arquivo como "próximo alvo" no fim da última resposta. Erro meu.

## Plano

### 1. Limpar a doc

- Remover a referência a `MbrV2Page (1060)` da linha 36 do `PERFORMANCE_PLAN_2026-05-04.md`. Como `CreateKpiDialog` já foi refatorado, o bullet inteiro vira:
  > 🟢 ~~Quebrar `MbrV2Page` e `CreateKpiDialog`~~ — concluído em W2.F (`CreateKpiDialog`); MBR v2 descontinuado.

### 2. Atualizar o backlog real de W2.F.2 (páginas > 700 LoC)

Baseline novo (varredura agora):

```text
887  ExecutiveQuarterReviewPage.tsx
886  SettingsUiCatalog.tsx
879  CreateTicketPage.tsx
852  JetimoberDialog.tsx
849  CollaboratorSummary.tsx          (wizard step)
793  CollaboratorCheckinPage.tsx
789  UserProfile/index.tsx
785  QbrKpiAnalysisStep.tsx           (wizard step)
760  Profile.tsx
727  QbrMeetingOkrReviewStep.tsx      (wizard step)
719  InternalRoutingRuleDialog.tsx
710  QbrPrePage.tsx
```

Sem mais nada > 1000 LoC. Sugestão de ordem (alto impacto / baixo risco primeiro):

1. **`ExecutiveQuarterReviewPage` (887)** — página de leitura, baixo risco de regressão.
2. **`CreateTicketPage` (879)** — formulário tipo `CreateKpiDialog`, mesmo padrão que acabei de aplicar.
3. **`CollaboratorSummary` (849, wizard step)** — reaproveita módulos já criados em `mbr/`.
4. Demais entram em ondas seguintes.

### 3. Não tocar

- Refatoração de wizards do QBR (`QbrKpiAnalysisStep`, `QbrMeetingOkrReviewStep`) fica para depois — risco maior, lógica de seeding/draft.
- `SettingsUiCatalog` é catálogo de showcase — LoC alto é natural; pular.

## Decisão pendente

Qual primeiro?
- **A.** Limpar a doc + começar por `ExecutiveQuarterReviewPage` (mais seguro).
- **B.** Limpar a doc + começar por `CreateTicketPage` (mesmo padrão recém-aplicado).
- **C.** Apenas limpar a doc agora e parar W2.F aqui.
