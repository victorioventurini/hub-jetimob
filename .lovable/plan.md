## Diagnóstico

- Consultei o TCR e os docs canônicos exigidos: `TECHNICAL_CONTEXT_REGISTRY`, `DATA_MODEL_REGISTRY`, `IDENTITY_CONVENTION` e `PERMISSIONS_AND_RBAC_MODEL`.
- O formulário informado existe, está ativo como rascunho e não tem vínculos ativos com provas.
- As políticas atuais de `assessment_forms` permitem update por `assessments.form.delete:bu`, mas a remoção ainda pode falhar no fluxo atual porque o update de soft-delete usa uma política com `WITH CHECK` sobre o estado novo da linha. Ao setar `deleted_at`, a validação pode bloquear a operação e aparecer como erro de RLS.

## Plano de correção

1. Ajustar a política RLS de soft-delete de formulários
   - Separar a política de edição normal da política de remoção lógica.
   - Permitir que usuários com `assessments.form.delete:bu` alterem `deleted_at` sem serem bloqueados pelo estado novo da linha.
   - Manter isolamento por `bu_id` e permission keys; sem hardcode de role.

2. Revisar as políticas relacionadas
   - Validar se `assessment_form_versions` e `assessment_form_questions` precisam da mesma separação para remoções em cascata/edição de rascunho.
   - Não alterar permissões de visualização nem criação.

3. Melhorar o hook `useDeleteForm`
   - Manter o guarda que impede excluir formulários vinculados a provas.
   - Confirmar filtro por `currentBuId` e soft-delete via `deleted_at`.
   - Ajustar a mensagem do toast se necessário para diferenciar “sem permissão” de “formulário vinculado”.

4. Validar
   - Conferir políticas aplicadas no backend.
   - Testar o cenário do formulário `ed1f81f9-2770-4929-973b-82fdcfa3de9c`: remover deve ocultar da lista sem violar RLS.

## Arquivos/tabelas envolvidos

- Backend: políticas de `assessment_forms` e, se necessário, `assessment_form_versions` / `assessment_form_questions`.
- Frontend: `src/modules/assessments/hooks/useAssessmentsData.ts` apenas se o tratamento de erro precisar ser refinado.