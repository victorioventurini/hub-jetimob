

# Auto-atribuicao de gestor baseado no lider do time

## Pre-checklist executado

- [x] **TCR v3.6.0**: Consultado. `profiles.manager_user_id` armazena `profiles.id`. `teams.leader_user_id` armazena `profiles.id`. Nenhum trigger existente faz sync entre eles.
- [x] **IDENTITY_CONVENTION v2.1.1**: Consultado. Ambas colunas usam `profiles.id` (dominio). Sem conversao necessaria.
- [x] **DATA_MODEL_REGISTRY**: Consultado. `profiles.manager_user_id` FK para `profiles.id`. `teams.leader_user_id` FK para `profiles.id`.
- [x] **PERMISSIONS_AND_RBAC_MODEL**: Consultado. Lideranca definida em `teams.leader_user_id`. Nao impacta RBAC.
- [x] **Triggers existentes**: Verificados. `auto_assign_leader_permissions` no `teams` ja segue padrao de reagir a mudancas em `leader_user_id`. Nenhum trigger de sync de manager existe.

## Dados verificados no banco

| Membro (time Onboarding) | manager_user_id | Esperado |
|---------------------------|-----------------|----------|
| Veronica Bonotto | Thiago (OK) | OK |
| Pedro Casani | Thiago (OK) | OK |
| Raissa Grehs | Thiago (OK) | OK |
| **Caroline Dotto** | **NULL** | Thiago |
| Thiago Silveira (lider) | NULL | NULL (lider nao e gestor de si) |

Total no sistema: **5 profiles** com `manager_user_id = NULL` que deveriam herdar o lider do time.

## Problema

Nao existe automacao que atribua o lider do time como gestor (`manager_user_id`) quando:
1. Um profile e criado/editado com `team_id` preenchido
2. O `leader_user_id` de um time muda (membros existentes nao sao atualizados)

## Solucao

### 1. Trigger em `profiles`: auto-preencher gestor ao atribuir time

Criar funcao `sync_manager_from_team_leader()` e trigger em INSERT/UPDATE de `profiles`.

**Regras:**
- Executa somente quando `team_id` muda (ou e inserido pela primeira vez)
- Somente preenche se `manager_user_id` for NULL (respeita atribuicao manual)
- Nao atribui o lider como gestor de si mesmo
- `SECURITY DEFINER` com `search_path = 'public'`

### 2. Trigger em `teams`: propagar mudanca de lider para membros

Criar funcao `propagate_leader_change_to_members()` e trigger em UPDATE de `teams`.

**Regras:**
- Executa somente quando `leader_user_id` muda
- Atualiza apenas membros cujo `manager_user_id` apontava para o lider **antigo** (preserva gestores manuais)
- Nao atribui o novo lider como gestor de si mesmo
- `SECURITY DEFINER` com `search_path = 'public'`

### 3. Migration one-time: corrigir 5 registros existentes

```sql
UPDATE profiles p
SET manager_user_id = t.leader_user_id
FROM teams t
WHERE p.team_id = t.id
  AND p.manager_user_id IS NULL
  AND t.leader_user_id IS NOT NULL
  AND p.id <> t.leader_user_id
  AND p.employment_status <> 'terminated'
  AND p.deleted_at IS NULL;
```

### 4. Frontend: pre-preencher gestor ao selecionar time (JetimoberDialog)

No `JetimoberDialog.tsx`, ao alterar o campo "Time":
- Buscar o `leader_user_id` do time selecionado
- Se o campo "Gestor" estiver vazio ("Nenhum"), pre-preencher com o lider
- Permitir que o usuario altere manualmente (nao e forcado)

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| Nova migration SQL | 2 triggers + fix de dados existentes |
| `src/components/users/JetimoberDialog.tsx` | Pre-preencher gestor ao selecionar time |

## Seguranca

- Triggers usam `SECURITY DEFINER` com `search_path = 'public'` (padrao do projeto)
- Nao alteram gestores definidos manualmente (apenas NULL -> lider)
- Seguem padrao do trigger `auto_assign_leader_permissions` ja existente no `teams`
- Ambas colunas (`manager_user_id`, `leader_user_id`) usam `profiles.id` — sem conversao de identidade
