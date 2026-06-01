## Pré-checklist (executado)

- `docs/canonical/core/INDEX.md` — router consultado.
- `docs/canonical/modules/kpis.md` — confirma permission keys `kpis.metric.*` / `kpis.value.*` e remete a `RBAC_TEMPLATES_V3.md`.
- `docs/canonical/RBAC_TEMPLATES_V3.md` — fonte da verdade dos templates.
- `mem://standards/standards-master` + `mem://auth/identity-rbac-master` (Core já em contexto).

## Problema

Giordano (Admin da BU Jetimob) recebe `new row violates row-level security policy for table "kpi_values"` ao registrar valor no MBR-pré. A policy `kpi_values_insert_v2` exige `kpis.value.create:bu` ou `kpis.value.add:bu`.

## Causa raiz (alinhada à doc canônica)

Templates atribuídos ao Giordano na BU Jetimob: **Colaborador Base v2, OKRs: Operador v2, Administrador BU v2, Projetos: Gestor**. Nenhum concede `kpis.value.*`.

Conforme `RBAC_TEMPLATES_V3.md`:
- Modelo é **somatório**: *"Permissões somam: ✅ SIM (union de templates)"*.
- `bu_admin_v2` é cross-cutting (assessments + notifications + BU settings) — **por design não contém `kpis.*`, `okrs.*`, `teams.*`, etc.**
- Para gerenciar cada módulo, atribui-se o `<módulo>_admin_v2` correspondente. Padrão explícito em "Cancelar OKRs | Apenas okrs_bu_manager, BU Admin, Super Admin".

Logo, **a correção correta é atribuir `kpis_admin_v2` ao Giordano na BU Jetimob**, não mutar o template `bu_admin_v2`.

## Decisão revisada

❌ **Descartado:** adicionar `kpis.*` ao template `bu_admin_v2`. Violaria o modelo somatório da doc canônica e ampliaria permissões de todos os outros Admins BU silenciosamente.

✅ **Adotado:** atribuir o template `KPIs: Admin v2` (`8a…` resolver pelo nome) ao profile do Giordano na BU Jetimob, inserindo uma linha em `bu_user_permission_templates_v2`.

## Mudança (via tool de insert — é dado, não schema)

```sql
INSERT INTO bu_user_permission_templates_v2 (user_id, bu_id, template_id)
SELECT
  'ba685ff2-c29c-46c6-99ac-c7011e6d6829'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  t.id
FROM permission_templates_v2 t
WHERE t.name = 'KPIs: Admin v2'
ON CONFLICT DO NOTHING;
```

(Idempotente; respeita UNIQUE composto se existir.)

## Validação pós-mudança

1. `SELECT has_permission('ba685ff2-…','a0000000-…-001','kpis.value.create:bu')` → `true`.
2. Giordano reabre o MBR-pré e registra valor do IMPC → INSERT passa.
3. Demais Admins BU **não** ganham acesso a KPIs por colateral (template `bu_admin_v2` permanece intacto).

## Observação fora de escopo (registro, sem ação agora)

Há um gap mais amplo: ao tornar alguém "Admin BU" via UI, o operador precisa lembrar de somar `kpis_admin_v2`, `okrs_admin_v2`, `teams_admin_v2`, etc. Existe espaço para um *preset/macro* "BU Admin Completo". Não vou atacar agora — bug do Giordano é resolvido com a atribuição pontual acima.
