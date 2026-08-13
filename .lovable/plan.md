# MBR: Produto não aparece na Análise por Time

## Diagnóstico

A regra de pauta (união de times com OKR própria + times com Pré-MBR enviado) já está implementada, tanto no seeding (`useSeedTeamOkrSnapshots`) quanto na navegação da etapa (`MbrTeamOkrsDetailStep` filtra por `objectives.length > 0 || mbrPreByTeam[teamId]`).

O problema é de **ordem de carregamento** em `MbrPage.tsx`:

- O seeding só é bloqueado pelas queries de OKRs de time (`hasFetchedTeamOkrs` / `isLoadingTeamOkrs`).
- As submissões do Pré-MBR (`useMbrPreSubmissions`) e a lista de times (`useTeams`) podem ainda estar carregando nesse momento — nesse caso `preSubmittedTeams` está vazio.
- O efeito marca `seeded.current = true` e nunca reexecuta. Resultado: Produto fica fora de `teamOkrSnapshots` e, como a etapa navega sobre esse array, não aparece nem no Overview nem na Análise por Time.

Confirmado no banco: não existe sessão `mbr` para o mês de referência 2026-07 (as últimas são 2026-04/2026-05), ou seja o draft atual foi semeado agora, exatamente no cenário da corrida acima.

## Ajustes

### 1. Bloquear o seeding até o Pré-MBR e os times estarem carregados
Passar os estados de carregamento de `useMbrPreSubmissions` e `useTeams` para `useSeedTeamOkrSnapshots` e só semear quando ambos estiverem resolvidos. Assim a união é calculada com a lista completa.

### 2. Saneamento reexecutável (drafts já criados)
Hoje o bloco que acrescenta times faltantes roda uma única vez. Tornar esse reparo idempotente e independente do latch `seeded`: sempre que `preSubmittedTeams` contiver um time ausente de `teamOkrSnapshots`, acrescentar o snapshot vazio. Isso conserta o draft de agosto já em andamento sem precisar recriar a sessão.

### 3. Coerência do `substep` na URL
O índice do time é aplicado sobre a lista filtrada dentro da etapa, mas a URL (`substep=team:<id>`) é resolvida em `MbrPage` usando o array completo `teamOkrSnapshots`. Com times sem OKR própria a ordem pode divergir. Passar o `teamId` do time atual junto com o índice na callback, para a URL refletir sempre o time exibido.

## Notas técnicas

- Arquivos: `src/modules/okrs/pages/MbrPage.tsx`, `src/modules/okrs/pages/mbr/useMbrSeedingEffects.ts`, `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep.tsx` (apenas assinatura da callback de índice).
- Sem migração e sem alteração de RLS: a mudança é de orquestração de estado no cliente.
- Snapshots de KPIs/OKRs continuam imutáveis: o reparo só acrescenta times ausentes, nunca reescreve objetivos já semeados.
