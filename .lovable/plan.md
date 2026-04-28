# Painel de milestones existentes no MilestoneDialog (Mini Gantt + toggle Lista/Gantt)

## Pré-checklist canônico — concluído
- **TCR (`docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` §Projetos, linhas 1652–1758):** confirmado que a criação/edição é feita exclusivamente via `MilestoneDialog`; `MilestonesTable` e `MilestoneGanttChart` são as visualizações canônicas; permissões row-aware via `useProjectPermissionsV2` + trigger `enforce_milestone_soft_delete_authority`.
- **`mem://features/projects/holistic-module-architecture-v2` (v1.9):** padrão Dialog + RHF + Zod + `useDialogFormReset` deve ser preservado; `MilestoneCreateForm` inline foi descontinuado; vínculo KR↔milestone removido da UI.
- **`mem://features/projects/milestone-permissions-row-aware`:** mudança é apenas UI/leitura — não toca em RLS, trigger, hooks de mutation nem em `canEditMilestoneRecord`.
- **Standards aplicáveis:** sem novas queries (reaproveita dados que os callers já têm) → não há novo query key (`mem://standards/query-key-prefix-standard`), nenhum `select('*')`, nenhum CHECK constraint, sem novo cliente Supabase. Cumpre `mem://standards/frontend-memoization-standard` (`React.memo` no painel).
- **Componentes existentes reutilizados:** `GanttTimeline` (já usado por `MilestoneGanttChart`), `ProjectViewToggle` (`list | gantt`, ícones e padrão visual), `DIALOG_SIZES.lg` (640px) de `src/lib/dialog-sizes.ts`.

## Objetivo
Mostrar dentro do `MilestoneDialog` os milestones já cadastrados do mesmo projeto (com preview em tempo real do milestone em edição/criação) para apoiar o encaixe de datas sem fechar o modal.

## Escopo (apenas UI/presentation)

### 1. `MilestoneDialog.tsx`
Adiciona props opcionais e renderiza painel acima do form:
- `existingMilestones?: Array<{ id; name; start_date; due_date; status }>`
- `currentMilestoneId?: string` (identifica o próprio em modo edição)
- `projectStartDate?: string | null` / `projectDueDate?: string | null` (escala mínima do gantt quando o projeto é maior que a janela dos milestones)

Layout dentro do `DialogContent`:
1. Header existente.
2. **Novo:** `<MilestoneScheduleContext>` (componente novo) — só renderiza se `existingMilestones?.length > 0`.
3. Form atual (sem mudanças de regras/validação).
4. Footer existente.

`DialogContent` passa de `sm:max-w-[500px]` para `DIALOG_SIZES.lg` (640px) para acomodar a faixa visual; mantém `max-h-[90vh] overflow-y-auto`.

### 2. Novo componente `MilestoneScheduleContext.tsx`
Localizado em `src/modules/projects/components/`. Estado interno: `viewMode: 'list' | 'gantt'` (default `'gantt'`, sem persistência).

Header do painel:
```
┌─ Milestones do projeto (4)                  [Lista] [Gantt] ┐
```
Usa `ProjectViewToggle` já existente.

#### Modo Gantt (default)
Faixa visual reaproveitando `GanttTimeline` (mesma técnica HTML/CSS, cores por status, linha "hoje"):
```
                                            mai    jun    jul
┌─────────────────────────────────────────────────────────────┐
│ Discovery          ▰▰▰                                      │
│ Integração API         ▰▰▰▰▰  (este)                        │
│ Migração base                ▰▰▰▰                           │
│ Go-live                            ▰▰                       │
│ ────────────────────────────────────────────────────────────│
│ ░░░░░░░  ← preview do form (start_date/due_date digitados)  │
└─────────────────────────────────────────────────────────────┘
                          ▲ hoje
```
- Construção dos `GanttItem[]` no estilo do `MilestoneGanttChart` (filtra `deleted_at` nulo, exige `due_date` e `start_date` válidos; itens inválidos vão para `excludedCount`).
- Linha "preview" extra montada a partir de `form.watch('start_date'/'due_date')` quando ambas são datas válidas e `start <= due`. Renderizada com tracejado/`opacity-60`.
- Em modo edição, o item `currentMilestoneId` recebe badge "(este)" e o preview substitui visualmente seu intervalo original.
- Altura limitada (`max-h-[180px] overflow-y-auto`) para não sufocar o form em telas pequenas.

#### Modo Lista
Tabela densa, mesma fonte de dados:
```
● Discovery          12 mai → 26 mai   concluído
● Integração API     27 mai → 14 jun   em andamento  (este)
◌ Migração base      15 jun → 30 jun   a fazer
◌ Go-live            01 jul → 10 jul   a fazer
```
- Bullet colorido por status (mesma paleta do Gantt).
- Datas formatadas `dd MMM` em pt-BR (`date-fns/locale`).
- Linha do `currentMilestoneId` com fundo `bg-muted` e tag "(este)".
- Linhas com **sobreposição** com o intervalo digitado no form ganham texto âmbar discreto e ícone `AlertTriangle` (apenas aviso visual).

### 3. Aviso de conflito (compartilhado pelos dois modos)
Abaixo do campo "Prazo", quando o intervalo do form se sobrepõe a outro milestone (excluindo o próprio), mostrar `Alert variant="warning"` discreto:
> "As datas escolhidas se sobrepõem a: Integração API (27 mai → 14 jun)."

**Não bloqueia** o submit — apenas alerta. Sobreposições são legítimas em projetos com paralelismo.

### 4. Atualização dos callers (passar dados; sem nova query)
- **`src/modules/projects/pages/ProjectDetailPage.tsx`:** já chama `useMilestones(id)` → passar `existingMilestones={milestones}`, `currentMilestoneId={editingMilestone?.id}`, `projectStartDate={project?.start_date}`, `projectDueDate={project?.due_date}` para os dois usos do `MilestoneDialog` (criar e editar).
- **`src/modules/okrs/components/wizards/collaborator/CollaboratorProjectsStep.tsx`:** já tem `project.milestones` no escopo do botão de edição → passar a mesma prop. Sem nova chamada Supabase no wizard (preserva isolamento de draft, `mem://standards/wizard-draft-isolation`).

## Detalhes técnicos
- **Componentes novos:** apenas `MilestoneScheduleContext.tsx` (envolto em `React.memo`).
- **Sem novos hooks, query keys, RPCs, edge functions ou migrações.**
- **Sem mudança em `entityLimits`, RBAC, ou ritual labels SSOT.**
- **Acessibilidade:** toggle herda padrão do `ProjectViewToggle` (botões com label sr-only em mobile); barras do gantt mantêm `title` com nome + datas; aviso de conflito usa `role="status"`.
- **Mobile (`sm:`):** painel colapsa para apenas modo Lista quando viewport `< 640px` (Gantt fica inviável); toggle escondido nesse breakpoint.
- **Performance:** `useMemo` para itens do gantt e cálculo de conflitos; `existingMilestones` filtrado uma única vez (deleted_at nulo, ordenado por `start_date`).

## Fora de escopo
- Drag-and-drop nas barras.
- Edição/reordenação de outros milestones a partir do dialog.
- Persistir preferência Lista/Gantt do usuário entre sessões.
- Mostrar dependências entre milestones (`project_milestone_dependencies`).
- Qualquer mudança em RLS, hooks de mutation, RPCs ou schema.

## Arquivos tocados
- `src/modules/projects/components/MilestoneDialog.tsx` (props + render do painel + largura).
- `src/modules/projects/components/MilestoneScheduleContext.tsx` (novo).
- `src/modules/projects/pages/ProjectDetailPage.tsx` (passar props nos 2 usos).
- `src/modules/okrs/components/wizards/collaborator/CollaboratorProjectsStep.tsx` (passar props no uso de edição).
