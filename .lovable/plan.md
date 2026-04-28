# Corrigir overflow do Gantt no modal de milestone

## Problema

No modal de criação/edição de milestones, o painel "Milestones do projeto" em modo Gantt está com o conteúdo (cabeçalho de meses e barras) extrapolando a largura do modal. Visível no screenshot: as barras "Validação técnica", "Recadastro das assinaturas" e "Lançamento novas assinaturas" ficam cortadas/saindo pela direita do `DialogContent`.

## Causa raiz

- `GanttTimeline` força `min-width: 700px` no conteúdo interno e usa `overflow-x-auto` no wrapper.
- `MilestoneDialog` usa `DIALOG_SIZES.lg` (640px) com padding interno (~48px), restando ~590px úteis — menos que os 700px do Gantt.
- O wrapper do Gantt em `MilestoneScheduleContext` (`<div className="max-h-[200px] overflow-y-auto">`) **não tem `min-w-0`**, então o flex/grid pai permite que o conteúdo intrínseco do Gantt empurre o `DialogContent` além do `max-width`, gerando o vazamento visual visto no screenshot.

## Correção (UI/CSS apenas)

Em `src/modules/projects/components/MilestoneScheduleContext.tsx`:

1. Adicionar `min-w-0` no container raiz do painel (`<div className="space-y-2 rounded-lg border bg-muted/20 p-3">` → adicionar `min-w-0 overflow-hidden`).
2. No wrapper do Gantt desktop, trocar `max-h-[200px] overflow-y-auto` por `max-h-[220px] overflow-auto min-w-0` para permitir scroll horizontal interno (já suportado pelo `GanttTimeline`) e impedir que o conteúdo expanda o pai.
3. Garantir que o cabeçalho ("Milestones do projeto (n)" + toggle) tenha `min-w-0` também, para não competir por largura.

Resultado: o painel respeita a largura do modal; quando o Gantt precisa de mais espaço que os ~590px disponíveis, aparece scroll horizontal **dentro** do painel (padrão consistente com o uso do Gantt em outras telas), sem quebrar o layout do `DialogContent`.

## Arquivos alterados

- `src/modules/projects/components/MilestoneScheduleContext.tsx` (apenas classes Tailwind)

## Não altera

- Nenhuma lógica de negócio, queries, RLS, BU scoping, schema ou dados.
- `MilestoneDialog.tsx` permanece em `DIALOG_SIZES.lg` (não aumentamos para preservar SSOT de tamanhos de modais).
- `GanttTimeline.tsx` permanece intacto (já oferece scroll horizontal corretamente).
