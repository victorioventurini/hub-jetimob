# Remover visualização Gantt do modal de milestones (Projects)

## Contexto

Dentro do `MilestoneDialog` (modal de cadastro/edição de milestone) existe um painel de contexto com a lista de milestones do mesmo projeto. No desktop, esse painel oferece um toggle Lista/Gantt e por padrão abre em **Gantt**. O usuário quer que o modal pare de oferecer Gantt; deve mostrar **apenas a lista**.

A visualização Gantt no nível da página (`/projects` e `/projects/:id`) permanece intacta.

## Arquivos afetados

- `src/modules/projects/components/MilestoneScheduleContext.tsx` — único arquivo a alterar. É consumido somente pelo `MilestoneDialog`.

## Mudanças

1. Remover o estado `viewMode`, o `ProjectViewToggle` e o bloco condicional `viewMode === 'gantt' ? <GanttTimeline …/> : <ScheduleList …/>`.
2. Sempre renderizar `<ScheduleList />` (mesmo componente já usado no mobile), mantendo o cabeçalho "Milestones do projeto (N)" e o aviso de conflito de datas (`AlertTriangle`).
3. Limpar imports não usados após a remoção: `useState`, `GanttTimeline`, `ProjectViewToggle` (incluindo o tipo `ProjectViewMode`), `useMemo` parcial (manter onde ainda é usado: `sorted`, `conflicts`, `conflictIds`).
4. Remover o `useMemo` de `ganttItems` e a constante `PREVIEW_ID` (deixam de ser referenciados).
5. Manter a lógica de detecção de conflitos (preview vs milestones existentes), pois é o que torna o painel útil sem o Gantt.
6. Não tocar `MilestoneGanttChart`, `GanttTimeline`, `ProjectViewToggle`, nem a página `/projects/:id` — Gantt continua disponível fora do modal.

## Validação

- Abrir `/projects/:id`, criar/editar milestone: o painel "Milestones do projeto" deve mostrar **apenas a lista**, sem o seletor Lista/Gantt no canto superior direito.
- A lista mantém: pontinho de status, nome, intervalo de datas, label de status, marcação "(este)" no milestone em edição, destaque amber em conflitos e o aviso de sobreposição de datas embaixo.
- Página de detalhes do projeto continua exibindo o Gantt normalmente (fora do modal).
- Build/typecheck passa (sem imports órfãos).

## Fora de escopo

- Mexer no Gantt da página de detalhes do projeto.
- Remover o componente `MilestoneGanttChart` ou `GanttTimeline` — continuam em uso fora do modal.
- Renomear ou recolocar o painel de contexto.
