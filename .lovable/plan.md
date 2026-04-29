# Fix: erro `column "v_bu_id" does not exist` ao criar KPI

## Pré-checklist (executado)
- ✅ TCR / `PERMISSIONS_AND_RBAC_MODEL.md` v1.5.0 — `kpis.settings.manage:bu` é a key canônica para criar KPIs estratégicos; `user_can_create_kpi` é a helper RLS oficial.
- ✅ `mem://features/kpis/kpis-permissions-matrix.md` (v3) — matriz scope-oriented (org/area/team) + métricas restritas a `team` confirmada.
- ✅ `mem://identity-rbac-master` — admin de BU (`is_bu_admin`) deve ter passe livre via short-circuit no início da função.
- ✅ `mem://standards/bu-isolation-master` — função recebe `p_bu_id` explicitamente; nenhuma mudança de isolamento.
- ✅ Codebase — frontend (`useCanCreateKpi.ts`, `CreateKpiDialog.tsx`) e RLS de `kpi_metrics` chamam a função passando `bu_id` corretamente; nada a alterar fora do SQL.

## Diagnóstico
Migration `20260428103721_*.sql` introduziu `public.user_can_create_kpi(p_profile_id, p_bu_id, p_scope, p_area_id, p_team_id, p_indicator_type)` com **dois bugs de variável**: o corpo referencia `v_bu_id` (não declarada, não populada) em vez de `p_bu_id`:

```sql
-- linhas atuais (quebradas)
IF v_user_id IS NOT NULL AND (is_platform_admin(v_user_id) OR is_bu_admin(v_user_id, v_bu_id)) THEN ...
IF has_permission(p_profile_id, v_bu_id, 'kpis.settings.manage:bu') THEN ...
```

Quando o caller não é platform admin (caso do Uriel — admin de BU Jetimob), o Postgres tenta resolver `v_bu_id`, falha e devolve `column "v_bu_id" does not exist` ao frontend, bloqueando criação de **qualquer KPI/Métrica** (a função é chamada pela política `kpi_metrics_insert_v3`).

`user_can_manage_kpi` já está correta — declara e popula `v_bu_id` a partir de `kpi_metrics`. Não precisa mudança.

## Correção (1 migration, sem mudança de assinatura)
Recriar `public.user_can_create_kpi` trocando as duas ocorrências de `v_bu_id` por `p_bu_id`:

```text
is_bu_admin(v_user_id, v_bu_id)        →  is_bu_admin(v_user_id, p_bu_id)
has_permission(p_profile_id, v_bu_id,…) →  has_permission(p_profile_id, p_bu_id,…)
```

Mantém: assinatura, `SECURITY DEFINER`, `STABLE`, `SET search_path = public`, demais branches da matriz (org/area/team + métrica/membro) intactos. Sem mudança em RLS, triggers, frontend, query keys ou tipos.

## Validação pós-fix
1. SQL direto (Uriel/Jetimob, escopo Time = Customer Success):
   `SELECT public.user_can_create_kpi(<profile_uriel>, '<bu_jetimob>', 'team', NULL, '<team_cs_id>', 'kpi');` → `true`.
2. Reproduzir o fluxo do screenshot (KPI %, mensal/semanal, escopo Time = Customer Success, responsável Laura) → criar sem erro.
3. Conferir que um usuário sem `kpis.settings.manage:bu` e sem liderança continua bloqueado para `scope=org` e para times fora da hierarquia (matriz v3 preservada).
4. Smoke test: criar Métrica em time do qual o usuário é membro (regra hierárquica de `metric` preservada).

## Fora de escopo
- Sem alterações em `user_can_manage_kpi`, RLS de `kpi_metrics`, hooks frontend, templates ou nomenclatura de permissões.
- Sem refactor adicional da função além do bug de variável.
