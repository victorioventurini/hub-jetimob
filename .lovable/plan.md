

## Corrigir erro ao atualizar status do milestone

### Diagnóstico (pré-checklist executado)
- ✅ Inspecionei triggers de `project_milestones` via `pg_trigger`.
- ✅ Li o source de `notify_milestone_status_changed`, `validate_project_milestone_dates`, `enforce_bu_scope` e `emit_notification_event`.
- ✅ Validei colunas reais de `user_team_memberships`, `profiles`, `partner_contacts`, `projects`.
- ✅ Confirmei dados do projeto `98074a55-...` (2 milestones, datas válidas, `start_date = due_date` após backfill — passa pelo `validate`).
- ✅ Conferi que `notification_outbox` não tem nenhum registro `milestone.status.changed`, ou seja, o trigger **nunca** rodou com sucesso desde sua criação.

### Causa raiz
O trigger `trg_notify_milestone_status_changed` (AFTER UPDATE) chama `notify_milestone_status_changed`, que faz:

```sql
JOIN public.user_team_memberships utm
  ON utm.team_id = pt.team_id
 AND utm.is_active = true
```

Mas a tabela `public.user_team_memberships` **não possui a coluna `is_active`** (colunas reais: `id, user_id, team_id, is_primary, created_at, updated_at`). Toda tentativa de UPDATE em `project_milestones` que altere `status` dispara o trigger AFTER, que joga `column "is_active" does not exist`, fazendo a transação inteira do UPDATE ser revertida.

Resultado: front recebe erro do Supabase → `useUpdateMilestone.onError` → toast "Erro ao atualizar milestone".

Não é regressão da minha migration de `start_date` — é bug pré-existente do trigger de notificação que ficou latente porque, aparentemente, ninguém havia trocado status desde a criação do trigger (`notification_outbox` vazio para esse slug).

### Correção (uma única migration)
Recriar a função `public.notify_milestone_status_changed` removendo o filtro `AND utm.is_active = true`. Mantém toda a lógica restante (recipients, emit_notification_event, metadata) intacta.

```sql
-- Trecho ajustado dentro da função:
JOIN public.user_team_memberships utm
  ON utm.team_id = pt.team_id
JOIN public.profiles p
  ON p.id = utm.user_id
 AND p.user_id IS NOT NULL
WHERE pt.project_id = NEW.project_id
```

Sem mudança em RLS, sem mudança em schema, sem CHECK constraint. Apenas `CREATE OR REPLACE FUNCTION` com `SECURITY DEFINER` e `SET search_path = public` preservados (idênticos ao atual).

### Por que não duplicar / por que essa abordagem
- **Reaproveitamento**: a função já existe, só corrigimos o JOIN.
- **Não criar componente novo no front**: o front está correto — `MilestoneStatusSelect` + `useUpdateMilestone` já tratam o erro com toast.
- **Sem CHECK constraints** (padrão do projeto respeitado).
- **Sem regressão futura**: opcionalmente, registrar no `mem://standards/database/triggers-must-reference-existing-columns` (já existe a memória `check-constraint-prohibition` correlata; basta uma nota curta no TCR — vide §9 abaixo).

### Validação pós-correção
1. Migration aplicada → `pg_proc.prosrc` sem `is_active`.
2. UPDATE de status manual via SQL para confirmar (sem erro):
   ```sql
   UPDATE project_milestones SET status = 'in_progress'
   WHERE id = '1cb5e4a3-12cc-4967-9aa8-8ff81f384fbb';
   ```
3. Conferir `notification_outbox` recebe entry `milestone.status.changed`.
4. Reverter status no banco para `todo` para não poluir.
5. No preview, alterar status de uma milestone do projeto e confirmar toast "Milestone atualizado" (success path do `useUpdateMilestone`).

### Documentação canônica (manter em dia)
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`: nota curta no changelog do Módulo Projetos v1.4 ("hotfix: trigger notify_milestone_status_changed referenciava coluna inexistente `user_team_memberships.is_active`").

### Arquivos afetados
- `supabase/migrations/<new>.sql` (criar — apenas `CREATE OR REPLACE FUNCTION public.notify_milestone_status_changed`).
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (entry de hotfix).

### Princípios respeitados
- BU isolation preservada (lógica de recipients e `bu_id` inalterada).
- RLS preservada (SECURITY DEFINER mantido).
- Soft-delete não se aplica (tabela `user_team_memberships` não possui `deleted_at`; a única filtragem desnecessária era o `is_active` inexistente).
- Sem `select('*')` (função usa colunas explícitas).
- Sem novo componente; correção localizada na fonte real do bug.

