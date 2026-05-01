## Diagnóstico

`/rituals/collaborator-checkin?user=4e5985d2...&step=initiatives` exibe "Nenhuma iniciativa" para Eduarda Branchi, mas o banco confirma **20 iniciativas como owner + 2 como contributor**.

**Causa raiz:** A query do step filtra `okr_initiatives` por `.is('cancelled_at', null)`, mas a coluna **não existe** nessa tabela. PostgREST devolve erro → React Query entrega `[]` silenciosamente → empty state.

Schema confirmado por introspecção:
- `okr_team_key_results.cancelled_at` ✅
- `okr_team_objectives.cancelled_at` ✅
- `okr_initiatives.cancelled_at` ❌ — soft-delete é apenas `deleted_at`

A Core memory "Soft Deletes" é regra **geral**, não regra **universal**: só vale onde a coluna existe. Faltava registro dessa exceção para `okr_initiatives`.

## Mudanças

### 1) `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx`

Linha 126: remover `.is('cancelled_at', null)` aplicado à própria iniciativa. Manter os filtros `cancelled_at` no `kr` e em `kr.team_objective` (essas tabelas têm a coluna).

### 2) `src/modules/okrs/components/wizards/collaborator/hooks/useCollaboratorWeekActivity.ts`

Mesma correção na query de iniciativas atualizadas na semana (criada por mim no card "Sua semana até aqui"). Manter `cancelled_at` apenas em KR e team_objective.

### 3) Auditoria varredura

`rg "okr_initiatives" -B 2 -A 12` em `src/` para confirmar que nenhum outro consumer esteja aplicando `.is('cancelled_at', null)` ou `cancelled_at` no select de `okr_initiatives`. Corrigir se houver.

### 4) Atualizar memórias

- `mem://features/rituals/collaborator-initiatives-step-scope`: remover menção a `is('cancelled_at', null)` na initiative; deixar apenas `is('deleted_at', null)`.
- `mem://standards/soft-delete-policy-v1`: adicionar nota de exceção — **`okr_initiatives` usa apenas `deleted_at`**; `cancelled_at` aplica-se a `okr_team_key_results` / `okr_team_objectives` / `okr_org_objectives`.

### 5) Validação

- Build TS sem erro.
- Abrir o step da Eduarda no preview e confirmar que as 20+2 iniciativas aparecem agrupadas pelos KRs.
- Confirmar que o card "Sua semana até aqui" no Step 1 não regride (categoria "Iniciativas atualizadas" continua funcionando).

## Não-objetivos

- Não criar `cancelled_at` em `okr_initiatives` (não está no design — iniciativas só têm soft-delete).
- Sem mudança de query keys, RLS ou layout.

## Arquivos editados

- `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx`
- `src/modules/okrs/components/wizards/collaborator/hooks/useCollaboratorWeekActivity.ts`
- `mem://features/rituals/collaborator-initiatives-step-scope`
- `mem://standards/soft-delete-policy-v1` (nota de exceção)
- (Quaisquer outros arquivos identificados na varredura, se houver)
