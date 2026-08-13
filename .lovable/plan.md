# MBR não mostra o time de Produto

## O que foi verificado

- O Pré-MBR do time **Produto** existe e está concluído (mês de referência `2026-07`, enviado em 12/08), com destaques, próximos passos, 1 KPI e 2 KRs analisados.
- O time **Produto** tem **zero objetivos próprios** no ciclo 2026-Q3 (e em nenhum outro ciclo de 2026). Os 2 KRs que o líder analisou no Pré-MBR pertencem a um objetivo do time **Tecnologia** (KRs compartilhados/contribuição).
- No MBR, a lista de times (`teamOkrSnapshots`) é construída **exclusivamente** a partir de `okr_team_objectives` do ciclo ativo, agrupados por `team_id`. Times sem objetivo próprio nunca entram na lista.

**Causa:** o MBR monta a pauta por "times com OKR própria no ciclo". Como Produto não tem OKR própria, o time simplesmente não aparece — e todo o conteúdo do Pré-MBR dele (KPIs, KRs, destaques, próximos passos, decisões) fica órfão, sem nenhuma etapa que o exiba.

## Ajuste proposto

Passar a montar a pauta de times do MBR pela **união** de:
1. times com objetivos próprios no ciclo ativo (comportamento atual), e
2. times que **submeteram Pré-MBR** para o mês de referência do MBR.

Times do grupo 2 sem OKR própria entram como snapshot "sem OKRs próprias": lista de objetivos vazia, health score neutro, e badge indicando que a contribuição é via KRs de outro time. Toda a análise por time (KPIs, KRs analisados, projetos, destaques, próximos passos, decisões) já é lida do Pré-MBR e passa a renderizar normalmente.

Complementos:
- No Overview, o card do time mostra "Pré-MBR enviado" e, quando não há OKR própria, o texto "Contribui via KRs de outro time" no lugar da barra de progresso.
- No Detail, quando não há objetivos próprios, exibir os KRs vindos de `krFinalStates` do Pré-MBR (com o objetivo/time de origem) em vez de estado vazio.
- O gate "todos os times revisados" passa a considerar a lista unificada.

## Detalhes técnicos

- `src/modules/okrs/pages/mbr/useMbrSeedingEffects.ts` (`useSeedTeamOkrSnapshots`): receber também `mbrPreByTeam` + nomes de times (`allTeams`) e, após montar os snapshots por objetivo, acrescentar snapshots vazios para `teamId`s presentes no Pré-MBR e ausentes do map. Manter o guard de idempotência (`seeded.current`) e a regra de snapshot imutável — o seeding continua acontecendo só uma vez por draft.
- `src/modules/okrs/pages/MbrPage.tsx`: a ordem dos hooks já carrega `useMbrPreSubmissions` antes do seeding; passar `mbrPreByTeam` para o hook de seeding.
- Sessões de MBR já iniciadas (draft em andamento) não são re-seedadas por design. Para o MBR de agosto/2026 em curso, incluir um saneamento leve: se existir Pré-MBR de time ausente em `teamOkrSnapshots`, acrescentar o snapshot faltante uma vez (mesma lógica do saneamento já existente para KPIs de escopo `team`).
- Componentes de UI afetados: card do Overview (`MbrTeamOkrsOverviewStep`) e `MbrTeamOkrsDetailStep` — apenas apresentação, sem mudança de cálculo de progresso.
- Sem migração de banco.

## Observação de processo (fora do escopo do código)

O caso raiz é de metodologia: Produto executa KRs de um objetivo de Tecnologia. Se a intenção for que Produto tenha OKR própria no Q3, o ajuste ideal é criar/mover o objetivo no módulo de OKRs — o ajuste de código acima garante que o time apareça de qualquer forma.
