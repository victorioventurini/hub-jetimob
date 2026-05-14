## Objetivo

Adicionar ação "Duplicar" para **provas** e **formulários** em `/assessments`, gerando cópias independentes em status `draft`.

## Regras de negócio

**Duplicar formulário**
- Cria novo `assessment_forms` com `status='draft'`, `title = "Cópia de {original}"`, mesmos `description`, `level`, `theme_id`.
- Cria `assessment_form_versions` v1 (`status='draft'`, `frozen=false`).
- Copia todas as perguntas da `current_version_id` do original (ou v1 se nulo) para a nova versão, preservando `position`, `question_type`, `prompt`, `help_text`, `required`, `time_limit_seconds`, `options`.
- Define `current_version_id` no novo form.
- Não copia: vínculos com provas, runs, convites.

**Duplicar prova**
- Cria nova `assessments` com `status='draft'`, `title = "Cópia de {original}"`, mesmos `description`, `default_total_time_seconds`, `available_from/until`.
- Copia `assessment_form_links` (mesmo `form_id` + `version_id` + `position`) — formulários referenciados são compartilhados, não duplicados.
- Não copia: convites, runs, respostas.

Em ambos os casos, navegar para o detalhe da nova entidade após criação.

## Arquivos novos

- `src/modules/assessments/components/DuplicateActionButton.tsx` — componente centralizado: `Button` ícone `Copy` + `ConfirmActionDialog`, recebe `{ label, description, onConfirm, isPending }`. Reaproveitável em listas e header de detalhe.

## Arquivos editados

- `src/modules/assessments/hooks/useAssessmentsData.ts`
  - `useDuplicateForm()` — mutation; invalida `qk.forms`; retorna `{ formId }`.
  - `useDuplicateAssessment()` — mutation; invalida `qk.assessments`; retorna `assessmentId`.
- `src/modules/assessments/pages/AssessmentsPage.tsx`
  - `AssessmentsTab`: adicionar `DuplicateActionButton` em cada card (ao lado de `PreviewEnvironmentButton`).
  - `FormsTab`: adicionar `DuplicateActionButton` em cada card (ao lado do `ConfirmActionDialog` de exclusão); ajustar layout do card para acomodar 2 ações.
- `src/modules/assessments/pages/AssessmentDetailPage.tsx` — adicionar `DuplicateActionButton` em `actions` do `PageHeader`.
- `src/modules/assessments/pages/FormEditorPage.tsx` — adicionar `DuplicateActionButton` em `actions` do `PageHeader`.

## Detalhes técnicos

- Usa `useBuScopedSupabase` + `useIdentity().realProfileId` (padrão já estabelecido).
- Mutations executam INSERTs sequenciais (form → version → questions; assessment → links) com tratamento de erro propagando `toast.error`.
- Cópia de perguntas: `select` explícito (nunca `*`), `insert` em batch único.
- Confirmação obrigatória via `ConfirmActionDialog` (impede cliques acidentais em listas densas).
- `e.preventDefault()/stopPropagation()` no botão dentro do `<Link>` do card (mesmo padrão do botão excluir já existente em `FormsTab`).
- Sem migrations: políticas RLS de INSERT já cobrem admin BU.

## Fora de escopo

- Duplicar versões individuais de um formulário (já coberto por `useCreateDraftVersion`).
- Duplicar com novo `bu_id` (cross-BU).
- Renomeação inline na hora de duplicar (usuário renomeia depois no editor).