# Módulo Assessments — Canonical

**Slug:** `assessments` · **Status:** ✅ Ativo
**Master/SSOT:** `mem://features/assessments/categories-standard`

## Tabelas

`assessments`, `assessment_categories`, `assessment_responses`, `assessment_questions`. Schema: `types.ts`.

## Categorias

Catálogo BU-scoped, gerido via permission key `assessments.category.manage:bu`. Validation triggers no banco.

## Permissões

`assessments.assessment.*`, `assessments.category.manage:bu`, `assessments.response.*`.

## Páginas

`/assessments`, `/assessments/:id`.

## Referências

- Master: `mem://features/assessments/categories-standard`
- RBAC: `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
