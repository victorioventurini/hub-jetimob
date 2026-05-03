# Paridade de navegação: KPIs do Pré-MBR ↔ KRs do Pré-MBR

## Contexto

Hoje os dois steps já mostram **1 item por página**, mas a navegação difere:

- **KRs (`MbrPreKrAnalysisStep`)** — padrão canônico desejado:
  - Topo: badge "Análise de KR — X de Y" + % concluído (somente leitura).
  - **Rodapé** (`WizardStepFooter`):
    - Esquerda: `Voltar` (no 1º) ou `Anterior` (demais).
    - Direita: `Próximo` ou `Concluir` (último), desabilitado se justificativa obrigatória vazia.
  - Atalho `Ctrl/Cmd+Enter` para avançar.

- **KPIs (`MbrPreKpiGateStep` + `KpiGateStep` paginado)** — divergente:
  - Topo: indicador "X de Y" **+ botões Anterior/Próximo dentro da barra superior**.
  - Rodapé fixo: `Voltar` à esquerda e **`Avançar para Projetos` sempre visível** à direita (não respeita "1 por vez").

## Objetivo

Estender o `KpiGateStep` (modo `rich-paginated`) e o container `MbrPreKpiGateStep` para reproduzir o padrão do `MbrPreKrAnalysisStep`:

1. Remover botões Anterior/Próximo da barra superior; manter apenas o indicador de progresso ("Análise de KPI — X de Y", % concluído, badge do bucket).
2. Mover navegação Anterior/Próximo para o **rodapé**.
3. Botão primário do rodapé:
   - "Próximo" enquanto não for o último KPI.
   - "Avançar para Projetos" (label atual de conclusão do step) somente no último KPI.
   - Desabilitado quando o KPI atual for de bucket obrigatório (overdue / critical / guardrailViolated / teamContext em RED) **e** o plano de ação estiver vazio.
4. Esquerda do rodapé: "Voltar" no 1º KPI; "Anterior" nos demais.
5. Adicionar atalho `Ctrl/Cmd+Enter` para avançar (paridade com KR).

## Princípios respeitados (TCR / pré-checklist)

- **Não duplicar componentes** — reusa `WizardStepFooter`, `WizardStepScaffold`, `KpiGateStep`, `RichKpiCard`. Nada novo é criado.
- **Componente do framework permanece agnóstico de wizardType** (TCR §4.8.1, Princípio #4): a decisão "footer dinâmico" fica no container `MbrPreKpiGateStep`. O `KpiGateStep` apenas:
  - Para de renderizar os botões Ant/Próx no `topFixed` quando `cardVariant === 'rich-paginated'` (eles passam a ser responsabilidade do container, igual ao que `MbrPreKrAnalysisStep` faz).
  - Continua expondo `currentKpiIndex` e `onKpiIndexChange` controlados.
- **Centralização**: o `WizardStepFooter` já cobre o caso (mesmo padrão usado no KR). Sem novo footer.

## Mudanças

### `src/modules/okrs/components/wizards/shared/framework/components/KpiGateStep.tsx`

- No `paginatedTopBar`, remover o bloco de botões `← Anterior` / `Próximo →` (linhas que renderizam o segundo `<div>` quando `totalCount > 1`).
- Manter o cabeçalho "Análise de KPI — X de Y" + badge do bucket + "% concluído".
- Sem mudanças na props API: `currentKpiIndex` e `onKpiIndexChange` continuam controlados pelo container.
- O `bottomFixed` pode deixar de mostrar a frase "Registre o plano de ação para: …" no modo paginado (o gate agora é por KPI corrente, não global) — exibir somente quando o KPI **atual** for obrigatório e estiver sem plano.

### `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiGateStep.tsx`

- Calcular o KPI corrente a partir do `flat` (mesma ordenação canônica usada no `KpiGateStep`); para evitar duplicação, exportar `flattenBucketsForPagination` do `KpiGateStep.tsx` (helper interno → `export`) e importá-lo no container. Alternativa equivalente: replicar a chamada via util compartilhada — preferimos exportar o helper já existente para não duplicar lógica.
- Derivar do KPI corrente:
  - `isFirst = currentKpiIndex === 0`
  - `isLast = currentKpiIndex === totalKpiCount - 1`
  - `currentRequiresPlan` (overdue/critical/guardrailViolated, ou teamContext+RED)
  - `currentJustOk` (plano não vazio quando obrigatório)
- Substituir o `WizardStepFooter` atual por:
  ```tsx
  <WizardStepFooter
    showBack
    onBack={isFirst ? onBack : () => setCurrentKpiIndex(i => i - 1)}
    backLabel={isFirst ? 'Voltar' : 'Anterior'}
    primaryLabel={isLast ? 'Avançar para Projetos' : 'Próximo'}
    onPrimary={isLast ? onContinue : () => setCurrentKpiIndex(i => i + 1)}
    primaryDisabled={!currentJustOk}
  />
  ```
- Adicionar `useEffect` com listener `Ctrl/Cmd+Enter` que invoca o mesmo handler primário (paridade com `MbrPreKrAnalysisStep`).
- Manter `mandatoryMissing` (contagem global) apenas para telemetria/futuro; **não** usar mais como bloqueio do botão final — agora o gate é por página (igual ao KR, que bloqueia "Próximo/Concluir" do KR atual).

## Arquivos tocados

- `src/modules/okrs/components/wizards/shared/framework/components/KpiGateStep.tsx` (remoção dos botões do topo + tornar `flattenBucketsForPagination` exportado).
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiGateStep.tsx` (footer dinâmico + atalho de teclado + gate por página).

## Riscos / regressões

- Outros consumidores de `KpiGateStep` em `rich-paginated`: hoje **só** o Pré-MBR usa esse variant (o QBR usa o paginado próprio do `QbrKpiAnalysisStep`). Mudança é segura.
- O bloco "Registre o plano de ação para: …" no `bottomFixed` deixa de aparecer em modo paginado quando o KPI atual está OK; mantemos uma frase contextual quando o KPI atual é obrigatório e está vazio (mesma UX do KR via `primaryDisabled`).

## Fora do escopo

- Lógica de classificação de buckets, snapshots, justificativas, regras de obrigatoriedade — sem alteração.
- QBR e demais wizards.
