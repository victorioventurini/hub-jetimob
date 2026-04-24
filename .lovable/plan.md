## Objetivo
Corrigir definitivamente o fluxo de arquivar/editar projetos para respeitar esta regra de negócio:
- super_admin
- admin da BU
- responsável pelo projeto
- líder do responsável pelo projeto

## Diagnóstico consolidado
A análise do TCR e dos canônicos mostrou dois desalinhamentos reais no módulo Projects:

1. **RLS de `projects` não está canônica para platform admins**
   - A policy atual de `UPDATE` ainda usa um `WITH CHECK` com `profile_has_bu_access(...)`.
   - Isso contradiz o modelo canônico em que `super_admin` tem wildcard global via `has_permission(...)`.
   - Resultado provável: o detalhe pode abrir, mas o soft-delete falha no banco para alguns admins/super_admins.

2. **O gate de UI não contempla líder do responsável**
   - `useProjectPermissionsV2` só libera por:
     - full access
     - owner com `self_or_owner`
   - Ele **não implementa o caminho de líder do owner**, embora o backend já tenha a função `is_leader_of_project_owner(...)` e a regra esteja documentada.
   - Resultado: mesmo quando o banco permitir, a UI pode esconder ou bloquear editar/arquivar para líderes.

3. **Tabelas filhas ainda estão incompletas para edição ampla**
   - `project_teams` e `project_krs` continuam com políticas focadas em owner/admin/líder, sem alinhar totalmente com as permissões V2 amplas.
   - Isso afeta a regra “quem pode editar projeto” porque editar também sincroniza times/KRs.

## Plano de ação
### 1) Reescrever a autorização mutativa de `projects` no padrão canônico
Atualizar `projects_insert`, `projects_update` e `projects_delete` para usar como base:
- `is_current_bu(bu_id)` para isolamento de contexto
- `owner_id = my_profile_id()`
- `is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)`
- `has_permission(my_profile_id(), bu_id, 'projects.project.{create,update,delete}:bu')`

Ajuste principal:
- remover a dependência estrutural de `profile_has_bu_access(...)` no `WITH CHECK` de `projects_update`, porque ela bloqueia `super_admin` fora do caso de membership explícito e conflita com o modelo de wildcard global.

### 2) Alinhar `project_teams` e `project_krs` com a mesma regra de edição
Revisar as policies de insert/delete dessas tabelas para herdar o mesmo critério do projeto pai:
- owner
- líder do owner
- quem tiver `projects.project.update:bu`

Isso garante que **editar** projeto continue funcionando quando houver mudança de times ou vínculos com KRs.

### 3) Corrigir o gate de UI para refletir exatamente a regra real
Substituir a lógica atual de `useProjectPermissionsV2` / detalhe do projeto por um gate alinhado ao backend:
- full access para `super_admin` / admin / wildcard
- owner
- líder do responsável

Implementação proposta:
- manter as permissões locais para casos amplos (`hasFullAccess`, `:bu`, `self_or_owner`)
- adicionar um check row-aware para líder usando a função já existente `is_leader_of_project_owner(...)`
- consumir esse resultado no `ProjectDetailPage` para exibir/permitir editar e arquivar corretamente

### 4) Preservar o fix anterior do soft-delete
Manter o padrão já correto em `useSoftDeleteProject`:
- probe pré-update
- update sem `count: 'exact'`
- sem `.select()` após arquivar

Esse ponto não será revertido; ele continua necessário.

### 5) Cobertura de regressão
Adicionar testes para os 4 cenários obrigatórios:
- super_admin pode arquivar/editar
- admin da BU pode arquivar/editar
- owner pode arquivar/editar
- líder do owner pode arquivar/editar
- colaborador sem regra não pode

## Arquivos previstos
- `supabase/migrations/...` — rewrite das policies de `projects`, `project_teams` e `project_krs`
- `src/modules/projects/hooks/useProjectPermissionsV2.ts` — gate row-aware alinhado
- `src/modules/projects/pages/ProjectDetailPage.tsx` — consumo da nova regra
- testes de `useProjectPermissionsV2` e/ou `ProjectDetailPage`
- memória técnica do módulo Projects

## Detalhes técnicos
```text
Regra final desejada por registro:
ALLOW IF
  has_permission(profile_id, bu_id, 'projects.project.update:bu'|'delete:bu')
  OR owner_id = my_profile_id()
  OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)

Sempre com isolamento:
  is_current_bu(bu_id)
```

```text
Problema atual mais crítico:
projects_update.WITH CHECK = profile_has_bu_access(...) AND ...
Isso é mais restritivo que o modelo canônico para super_admin.
```

## Resultado esperado
Após a implementação:
- você (`victorio@jetimob.com`) conseguirá arquivar o projeto como `super_admin`
- admins da BU continuarão podendo arquivar/editar
- owner continuará podendo
- líder do owner passará a poder também, inclusive na UI
- a regra ficará consistente entre frontend, RLS e documentação
