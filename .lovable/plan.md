## Problema

Em `/assessments/forms/:id`, ao clicar no ícone de lixeira de uma pergunta e confirmar, nada visível acontece — a pergunta continua na lista e nenhum toast é exibido.

## Causa raiz

`useDeleteQuestion` (em `src/modules/assessments/hooks/useAssessmentsData.ts`, linhas 503-520) executa um soft-delete (`update deleted_at = now()`) mas:

1. **Não tem `onError`** — qualquer erro (RLS bloqueando, bu_id divergente, falta de permissão `assessments.form.update/delete:bu`) é engolido silenciosamente.
2. **Não tem `onSuccess` toast** — usuário não recebe feedback positivo.
3. **Não detecta UPDATE bloqueado por RLS retornando 0 linhas** (mesma classe de bug já corrigida em `useDeleteAssessment`).
4. **Sem optimistic update** — mesmo quando a query é invalidada, há janela perceptível antes do refetch.

A política RLS `questions_update` exige uma das três permissões (`form.update:bu`, `form.delete:bu`, `form.publish:bu`). Se o usuário não tiver nenhuma, o UPDATE retorna 0 linhas sem erro — bug clássico de PostgREST + RLS.

## Escopo do fix (apenas frontend, hook centralizado)

Edição única em `src/modules/assessments/hooks/useAssessmentsData.ts` no hook `useDeleteQuestion`:

- Trocar o `.update(...)` para retornar linhas via `.select("id")`.
- Se `data?.length === 0`, lançar erro explícito: "Sem permissão para excluir esta pergunta (RLS bloqueou o update)".
- `onMutate`: optimistic update removendo a pergunta do cache `["assessments","questions",buId,versionId]`.
- `onError`: rollback do cache + `toast.error` com mensagem real do Supabase.
- `onSuccess`: `toast.success("Pergunta excluída")`.
- `onSettled`: invalidate da query (refetch confirmando estado final).

Aplicar **o mesmo padrão de toast de erro** (sem optimistic, só feedback) também a `useUpsertQuestion` e `useReorderQuestions`, que sofrem da mesma falta de feedback (out-of-scope visual mas previne reincidência da reclamação no mesmo editor).

Nenhuma mudança em UI, componentes, RLS ou banco.

## Como validar

1. Reproduzir no form `9e737c1b-d214-4ab6-a142-88d984bca083`: clicar lixeira → Excluir.
2. Esperado: pergunta some imediatamente, toast "Pergunta excluída".
3. Se RLS bloquear (usuário sem permissão na BU): toast vermelho com motivo claro.
4. Console: nenhum erro silencioso.

## Detalhes técnicos

- Não tocar em `ConfirmActionDialog` nem em `FormEditorPage.tsx`.
- Reutilizar `toast` do `sonner` (já presente no projeto).
- Padrão idêntico ao já estabelecido em `useDeleteAssessment` (mesma classe de bug, mesma solução).