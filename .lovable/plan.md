
Objetivo desta rodada
- Resolver definitivamente o bloqueio de avanço no passo `team-okrs-detail` (e garantir estabilidade no `team-okrs-overview`), sem remendos locais frágeis.
- Aproveitar melhor o espaço horizontal da página para reduzir altura total do conteúdo e deixar a UI mais próxima do padrão do módulo `/okrs`.
- Centralizar o padrão de layout dos steps para reaproveitamento e evitar nova regressão.

Diagnóstico confirmado (causa raiz)
1) Regressão introduzida na última alteração:
- Foram removidos `min-h-0 overflow-hidden` de:
  - `MbrTeamOkrsOverviewStep.tsx`
  - `MbrTeamOkrsDetailStep.tsx`
- Esses dois passos dependem de `ScrollArea` interno. Sem `min-h-0` no container raiz do step, o conteúdo cresce além da altura disponível e “empurra” o footer para fora da área visível.

2) Por que isso trava avanço:
- O shell (`FullPageWizardShell`) usa `overflow-hidden` no root.
- Quando o step expande além do espaço calculado, o CTA de avanço fica fora da área acessível.
- Resultado prático: usuário não alcança botão para continuar mesmo com conteúdo renderizado.

3) O problema não é “mostrar todos os times”:
- O modo consolidado (todos os OKRs de todos os times) é válido como fallback.
- O bloqueio atual é de composição/altura (layout), não de paginação por time.

Pré-checklist/documentação validada antes deste plano
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (v3.9.0)
- `docs/canonical/IDENTITY_CONVENTION.md`
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
- `docs/canonical/DATA_MODEL_REGISTRY.md`
- `docs/canonical/DEVELOPMENT_STANDARDS.md`
- `docs/guides/WIZARD_DEVELOPMENT_GUIDE.md`
- Comparação com padrão existente:
  - `ManagersPanoramaStep.tsx`
  - `MbrTeamOkrsOverviewStep.tsx`
  - `MbrTeamOkrsDetailStep.tsx`
  - `FullPageWizardShell.tsx`

Plano de execução (definitivo, sem duplicação)

Fase 1 — Correção estrutural de layout (bloqueio de avanço)
Arquivos:
- `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsOverviewStep.tsx`
- `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep.tsx`

Ações:
- Reintroduzir padrão obrigatório no root dos steps com scroll interno:
  - `className="flex flex-col h-full min-h-0 overflow-hidden"`
- Garantir que áreas fixas não cresçam:
  - header/summary/decision/footer com `shrink-0`
- Manter somente a região de conteúdo longa dentro do `ScrollArea` (`flex-1 min-h-0`).

Critério de aceite:
- Footer e CTA ficam sempre acessíveis.
- Scroll funciona apenas na área de conteúdo (sem clipping do CTA).

Fase 2 — Centralização do padrão para evitar regressão
Arquivo novo (compartilhado):
- `src/modules/okrs/components/wizards/shared/WizardStepScaffold.tsx` (ou nome equivalente canônico)

Ações:
- Criar um wrapper reutilizável para steps com estrutura:
  - header (fixo)
  - top summary (opcional, fixo)
  - scroll content (obrigatoriamente `flex-1 min-h-0`)
  - decisions (opcional, fixo)
  - footer (fixo)
- Migrar `team-okrs-overview` e `team-okrs-detail` para esse scaffold.
- Não duplicar composição de layout em cada step.

Critério de aceite:
- Estrutura de altura/scroll vira padrão único.
- Reduz risco de futuras alterações removerem `min-h-0` e quebrarem navegação.

Fase 3 — Melhor aproveitamento de espaço horizontal (pedido explícito)
Arquivo:
- `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep.tsx`

Ações:
- Compactar conteúdo vertical usando grid responsiva:
  - cards de time em `xl:grid-cols-2` quando houver espaço
  - KRs com metadados em linha única truncável (`truncate flex-1 min-w-0` + `flex-shrink-0` em badges/status)
- Preservar componentes canônicos:
  - `OkrProgressBar` (padrão visual obrigatório)
  - `OkrStatusBadge`
  - `LastCheckinBadge`
- Manter fallback consolidado (todos os times na mesma página), mas com densidade visual maior para reduzir rolagem extrema.

Critério de aceite:
- Mais informação útil por viewport no desktop.
- Sem quebra de texto longo e sem overflow horizontal.
- UI perceptivelmente mais próxima dos padrões de `/okrs`.

Fase 4 — Ajuste fino do overview para ficar “igual ao ritual de gestores”
Arquivo:
- `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsOverviewStep.tsx`

Ações:
- Manter composição macro idêntica ao padrão consolidado:
  - summary com progresso médio + badge de risco
  - cards com contagem OKRs/KRs, tendência e progresso
- Aplicar mesmas regras de truncamento/spacing do módulo de referência.
- Garantir consistência de altura dos cards em grid.

Critério de aceite:
- Visual muito próximo do padrão esperado do Check-in de Gestores.
- Nenhum card “estoura” layout em listas maiores.

Fase 5 — Validação real de front-end (focada no bug de exibição)
Arquivos de teste:
- `src/modules/okrs/components/wizards/mbr/__tests__/MbrTeamOkrsSteps.test.tsx`
- `e2e/okr-wizards.spec.ts` (cenário MBR dedicado)

Ações:
- Adicionar teste de integração focado em:
  - presença do CTA no DOM visível
  - continuidade de navegação no step com conteúdo longo
- Adicionar E2E reproduzindo cenário de múltiplos times/KRs:
  - entrar em `team-okrs-detail`
  - marcar revisões
  - avançar com sucesso para `org-okrs`

Critério de aceite:
- Regressão de “conteúdo renderiza mas não deixa avançar” fica coberta por teste automatizado.

Riscos e mitigação
- Risco: ajustar layout apenas em MBR e esquecer padrão global.
  - Mitigação: introduzir scaffold compartilhado para todos os steps que sigam a mesma anatomia.
- Risco: aumentar densidade visual e perder legibilidade.
  - Mitigação: truncamento + hierarquia tipográfica + grid progressiva apenas em telas maiores.
- Risco: impacto em outros wizards com shell full-page.
  - Mitigação: smoke test rápido em `ManagersCheckinPage`, `TeamCheckinPage`, `CLevelCheckinPage` após ajuste.

Resultado esperado
- O bloqueio de avanço é eliminado de forma estrutural.
- O espaço da página passa a ser melhor aproveitado, com menos rolagem “desnecessária”.
- A UI fica aderente ao padrão canônico de `/okrs`.
- A solução deixa de ser remendo local e vira padrão reutilizável para evolução futura.
