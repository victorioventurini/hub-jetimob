# Permitir excluir formulário (Assessments)

## Diagnóstico

Hoje não existe nenhuma ação de excluir formulário no módulo:
- `FormEditorPage` (`/assessments/forms/:id`) não tem botão de remover.
- A aba "Formulários" em `AssessmentsPage` lista os formulários sem ação de exclusão.
- Não existe hook `useDeleteForm` em `useAssessmentsData.ts` (só há `useDeleteQuestion`, `useRemoveFormFromAssessment` para desvincular de uma prova, e `useUpdateAssessment` que arquiva prova — não formulário).

A tabela `assessment_forms` já tem coluna `deleted_at` (soft delete suportado), seguindo o padrão `mem://standards/soft-delete-policy-v1`.

## Escopo (apenas UI/presentation, sem mexer em RLS/edge)

### 1. Hook novo em `src/modules/assessments/hooks/useAssessmentsData.ts`

`useDeleteForm()` — soft delete:
- `update assessment_forms set deleted_at = now() where id = :id` via cliente BU-scoped.
- Antes de deletar: contar `assessment_form_links` ativos (`deleted_at is null`) com `form_id`. Se `> 0`, lançar erro PT-BR ("Formulário em uso por N prova(s) ativa(s). Desvincule antes de excluir.").
- Invalidar `queryKeys.assessments.forms(buId)` e `queryKeys.assessments.form(buId, id)`.
- Toast de sucesso/erro.

### 2. `FormEditorPage.tsx` — botão "Excluir formulário"

- Adicionar no `PageHeader.actions`, à esquerda de "Voltar", um `Button variant="ghost"` com ícone `Trash2` e `aria-label="Excluir formulário"`.
- Envolver com `ConfirmActionDialog`:
  - title: "Excluir formulário?"
  - description: "Esta ação remove o formulário e todas as suas perguntas. Provas ativas vinculadas precisam ser desvinculadas primeiro."
  - confirmLabel: "Excluir"
  - destructive: true
- `onConfirm`: `del.mutate(id, { onSuccess: () => navigate("/assessments?tab=forms") })`.
- Após sucesso, navegar de volta para a listagem.

### 3. `AssessmentsPage.tsx` (tab "forms") — ação inline por card

- Trocar o `<Link>` que envolve o card por um `Card` com área clicável (botão/Link cobrindo o conteúdo) + slot de ação à direita com `ConfirmActionDialog` (mesmo conteúdo do item 2). Garantir `e.preventDefault()`/`e.stopPropagation()` no botão para não navegar.
- Padrão visual igual aos demais cards do módulo (Trash2 ghost, `aria-label`).

### 4. Mensagens & i18n

- Toast sucesso: "Formulário excluído".
- Toast erro genérico: "Não foi possível excluir o formulário".
- Toast vínculo ativo: usa mensagem do erro lançado pelo hook.

## Fora do escopo

- Mudanças em RLS, triggers ou edge functions.
- Hard delete.
- Restauração ("desfazer exclusão") — pode entrar em onda futura.
- Mudanças no runner público `/q/:token`.
- Mudanças em `useAssessmentsData.ts` além do novo hook.

## Arquivos

- editar `src/modules/assessments/hooks/useAssessmentsData.ts` (+ `useDeleteForm`)
- editar `src/modules/assessments/pages/FormEditorPage.tsx`
- editar `src/modules/assessments/pages/AssessmentsPage.tsx`

## Verificação

- Abrir `/assessments/forms/ed1f81f9-...` → clicar Excluir → confirmar → redirecionar para `/assessments?tab=forms` e card sumir.
- Tentar excluir formulário vinculado a prova ativa → toast de erro com contagem.
- Tab "Formulários" → ação inline funciona sem disparar navegação para o editor.
