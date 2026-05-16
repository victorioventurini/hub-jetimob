# Módulo BU Management — Canonical

**Slug:** `bu` · **Status:** ✅ Ativo (admin)

## Propósito

Gerenciamento de Business Units (criação, configuração, módulos habilitados, parceiros, domínios).

## Tabelas

`bu_units`, `bu_user_memberships`, `bu_module_configs`, `external_companies`, `external_company_bu_associations`, `partner_contacts`, `partner_contact_bu_associations`. Schema: `types.ts`.

## Módulos por BU

| Tipo | Habilitação |
|---|---|
| `global` | Sempre habilitado |
| `operational` | Config explícita em `bu_module_configs` |

RPC: `get_enabled_modules_for_bu(p_bu_id)`. Sem registro = desabilitado.

UI: `/settings/modules` (aba "Configuração por BU").

## Empresas Parceiras (v2.45.0)

Globais, únicas por CPF/CNPJ. Associadas a BUs via `external_company_bu_associations`. Domínios em `external_companies.allowed_domains` autorizam Magic Link.

## Contatos Parceiros (v2.46.0)

Globais, únicos por email. Associações em `partner_contact_bu_associations` (status `active`). Um contato pode estar ativo em múltiplas BUs.

Detalhes: `mem://auth/external-user-identity-unification-v3`.

## Domínios permitidos (interno)

`bu_units.allowed_email_domains` — usuários internos só recebem Magic Link se domínio em algum array + profile pré-cadastrado em `profiles`.

## Onboarding determinístico

`handle_new_user()` prioriza `bu_id` pré-existente. Detalhes: `mem://auth/deterministic-onboarding-logic`.

## Permissões

`bu.bu.*`, `bu.module.*`, `bu.partner_company.*`, `bu.partner_contact.*`. Apenas `super_admin` / `admin global` para criar BUs.

## Páginas

`/settings/bu`, `/settings/modules`, `/settings/external-companies`, `/settings/partner-contacts`, `/settings/areas`.

## Referências

- Auth flow: `core/TCR_CORE.md` §2
- External users: `mem://auth/external-user-identity-unification-v3`
- Onboarding: `mem://auth/deterministic-onboarding-logic`
- Identity & RBAC: `mem://auth/identity-rbac-master`
