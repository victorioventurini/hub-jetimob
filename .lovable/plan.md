## Objetivo

No wizard `/rituals/collaborator-checkin`, ocultar itens já concluídos (não há o que atualizar):

1. **Iniciativas concluídas** (`status = 'completed'`) não aparecem no Step "Iniciativas".
2. **Milestones concluídos** (`status = 'done'`) não aparecem no Step "Projetos" (já filtrado na renderização — reforçar na origem da query).

Conformidade verificada: TCR §4.8 (Filtro de Iniciativas do Step), memória `collaborator-initiatives-step-scope`, `soft-delete-policy-v1`, `query-optimization-standard`, `milestone-permissions-row-aware`.

---

## Mudanças

### 1. `CollaboratorInitiativesStep.tsx` — filtrar completed server-side

Na query de `okr_initiatives` (linhas ~94-129), adicionar:
```ts
.neq('status', 'completed')
```

### 2. `useCollaboratorInitiativesSignal.ts` — consistência com Step 1

Mesmo `.neq('status', 'completed')` para que o card "Atividade da Semana" (Step 1) reflita o que aparece no Step "Iniciativas".

### 3. `CollaboratorProjectsStep.tsx` — endurecer query `myMilestones`

Na query `myMilestones` (linhas 138-153), adicionar:
```ts
.neq('project_milestones.status', 'done')
```
Evita puxar projetos onde o colaborador só tem marcos `done` (e não é owner do projeto). O filtro de renderização (linha 207, `m.status !== 'done'`) permanece como segunda barreira.

### 4. Atualizar memória `collaborator-initiatives-step-scope`

Adicionar nota: "iniciativas com `status='completed'` são excluídas server-side — não há ação possível em itens concluídos."

---

## Fora de escopo

- Não alterar `useUserKrsForWizard` (escopo de KRs permanece).
- Não mexer em RLS, permissões, tipos ou componentes compartilhados.
- Não alterar a query `projectsByKr` do Step "Iniciativas" (badges informativas).

## Arquivos afetados

- `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx`
- `src/modules/okrs/hooks/useCollaboratorInitiativesSignal.ts`
- `src/modules/okrs/components/wizards/collaborator/CollaboratorProjectsStep.tsx`
- `.lovable/memory/features/rituals/collaborator-initiatives-step-scope.md`

## Validação

- `?step=initiatives` com usuário que tenha iniciativa `completed` → não deve listar.
- `?step=projects` com usuário cujos milestones são todos `done` (sem ser owner do projeto) → projeto não aparece.
- Card "Atividade da Semana" (Step 1): contador de iniciativas bate com a lista do Step "Iniciativas".
