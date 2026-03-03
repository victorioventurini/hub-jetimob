
Objetivo
- Corrigir de forma definitiva o bug de exibição que impede avanço no wizard MBR.
- Alinhar UI dos passos de OKRs ao padrão já consolidado no módulo /okrs e no Check-in de Gestores.
- Eliminar duplicação e centralizar layout reutilizável.

Pré-checklist obrigatório concluído
- Lido: `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (TCR v3.9.0)
- Lido: `docs/canonical/IDENTITY_CONVENTION.md`
- Lido: `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
- Lido: `docs/canonical/DATA_MODEL_REGISTRY.md`
- Lido: `docs/canonical/DEVELOPMENT_STANDARDS.md`
- Lido: `docs/guides/WIZARD_DEVELOPMENT_GUIDE.md`
- Conferência de implementação existente:
  - `ManagersPanoramaStep.tsx`
  - `MbrPage.tsx`
  - `MbrTeamOkrsOverviewStep.tsx`
  - `MbrTeamOkrsDetailStep.tsx`
  - `FullPageWizardShell.tsx`
  - testes atuais de MBR

Diagnóstico consolidado (com base em código + capturas)
1) O problema real que bloqueia fluxo não está só nos cards de team-overview:
- O bug principal é de altura/overflow no container do wizard, fazendo conteúdo longo “sumir” com footer inacessível (logo, sem avanço).
- Isso aparece especialmente no passo de análise por time (conteúdo mais alto), e é compatível com o sintoma “primeiro time ok, seguintes quebram”.

2) Causa estrutural provável:
- `FullPageWizardShell` tem cadeia de containers sem `min-h-0`/`h-full` suficientes no trecho central, combinado com `ScrollArea` externo + `ScrollArea` interno nos passos.
- Resultado: o scroll utilitário nem sempre recebe altura calculada corretamente; conteúdo cresce, mas área rolável não.

3) Divergência de padrão:
- `MbrTeamOkrsOverviewStep` e `MbrTeamOkrsDetailStep` foram “remendados” com `min-h-0 overflow-hidden`, ao invés de resolver no shell canônico.
- Isso aumenta instabilidade local e não reaproveita o padrão dos outros rituais.

Abordagem de solução (sem duplicar componentes)
Fase 1 — Corrigir o problema na raiz (infra de layout do wizard)
Arquivo principal:
- `src/modules/okrs/components/wizards/shared/FullPageWizardShell.tsx`

Ações:
- Ajustar a estrutura central para altura determinística:
  - container principal da área de conteúdo com `min-h-0`
  - wrapper `flex` interno com `h-full min-h-0`
  - `main` com `min-h-0`
- Remover competição de scroll entre shell e steps:
  - opção preferida: shell deixa de impor `ScrollArea` no `children`; cada step controla seu próprio scroll.
  - alternativa segura: manter `ScrollArea` do shell, mas garantindo altura real em toda cadeia.
- Meta: qualquer step com conteúdo longo mantém footer acessível e navegabilidade intacta.

Critério de aceite da Fase 1:
- Em passo longo, usuário consegue rolar até o final e clicar CTA de avanço sem “travar”.
- Comportamento consistente em diferentes resoluções (desktop e notebook).

Fase 2 — Alinhar team-okrs-overview ao padrão do Check-in de Gestores (quase idêntico)
Arquivos:
- `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsOverviewStep.tsx`
- (se necessário para reaproveitamento) novo shared component em `wizards/shared/`

Ações:
- Reaproveitar a mesma composição visual do `ManagersPanoramaStep`:
  - header padrão
  - summary bar + progress
  - grid de cards macro
- Evitar duplicação criando composição compartilhada para “panorama em cards” (dados adaptados por mapper), em vez de manter duas variações paralelas.
- Manter visual “o mais próximo possível de /okrs” usando:
  - `Progress` + `getProgressBarStyle`
  - badges e tokens semânticos já existentes
  - `OkrStatusBadge`/`OkrProgressBar` onde fizer sentido sem inflar overview

Critério de aceite da Fase 2:
- Overview visualmente equivalente ao padrão de Gestores.
- Nenhum overflow/corte no segundo card em diante.
- CTA de avanço sempre visível/acessível.

Fase 3 — Garantir fallback operacional (pedido explícito do usuário)
Arquivo:
- `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep.tsx`

Ações:
- Manter modo consolidado “todos os OKRs de todos os times na mesma página” como fallback oficial para robustez.
- Gate de revisão permanece: somente times com OKRs contam no bloqueio.
- Preservar componentes canônicos (`OkrProgressBar`, `OkrStatusBadge`, `LastCheckinBadge`), evitando UI custom duplicada.

Critério de aceite da Fase 3:
- Mesmo com muitos times/KRs, avanço funciona.
- Não há dependência de navegação por índice para concluir etapa.

Fase 4 — Cobertura de teste útil para front-end (não só unit)
Arquivos de teste:
- `src/modules/okrs/components/wizards/mbr/__tests__/MbrTeamOkrsSteps.test.tsx`
- Novo teste de integração de layout do shell (ou teste de página MBR)
- E2E Playwright para fluxo real de avanço entre steps

Ações:
- Acrescentar asserts de layout/UX críticos:
  - footer renderizado e alcançável em passo com conteúdo extenso
  - botão primário clicável após scroll/revisão
  - transição de `team-okrs-overview` -> `team-okrs-detail` -> próximo passo
- E2E com dataset de múltiplos times para reproduzir bug original.

Critério de aceite da Fase 4:
- Testes capturam regressão de overflow/travamento (não apenas snapshot de render estático).

Sequenciamento de execução
1. Ajuste canônico no `FullPageWizardShell` (raiz do problema)
2. Reaproveitamento visual do overview no padrão Gestores
3. Consolidação/fallback estável no detail
4. Testes de integração + E2E focados em avanço real
5. Validação manual final no fluxo completo MBR

Riscos e mitigação
- Risco: alteração no shell impactar outros wizards.
  - Mitigação: validar rapidamente Managers, Team Check-in e C-Level após ajuste do shell.
- Risco: “igual ao Gestores” divergir por pequenas diferenças de header/footer.
  - Mitigação: extrair composição compartilhada e parametrizar apenas dados/textos.
- Risco: regressão mobile.
  - Mitigação: validar em viewport desktop + mobile antes de fechar.

Resultado esperado
- O wizard deixa de travar por exibição.
- O overview fica realmente no padrão do Check-in de Gestores.
- O fluxo avança mesmo com muitos OKRs/times.
- A correção vira padrão reutilizável (não mais remendo local).
