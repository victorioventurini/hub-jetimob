## Resumo

Replicar o padrão de catálogo (categoria + subcategoria) em **tabelas dedicadas** `assessment_categories` / `assessment_subcategories`, alinhadas ao padrão já usado por `assessments.theme.*` (e não ao padrão dos tickets). Compartilhar fisicamente as tabelas dos tickets não é viável.

---

## Pré-checklist executado

- `PRE_CHECKLIST.md` — itens 1-5 cobertos.
- `TECHNICAL_CONTEXT_REGISTRY.md` — Assessments ainda não está catalogado; entrada será criada nesta entrega.
- `DATA_MODEL_REGISTRY.md` — confirma padrão "uma tabela de catálogo por domínio" (`ticket_categories`, `asset_categories`); enum `catalog_status` é reutilizável.
- `PERMISSIONS_AND_RBAC_MODEL.md` + `permission_catalog` — módulo Assessments usa `assessments.<entity>.<action>:bu`; entidade `theme` já segue esse padrão para um catálogo. Nova chave: `assessments.category.manage:bu`.
- `IDENTITY_CONVENTION.md` — RLS de Assessments usa `has_assessment_permission(auth.uid(), bu_id, key)` (SECURITY DEFINER converte para profile_id internamente). Manter consistência.
- `RBAC_TEMPLATES_V3.md` — templates do módulo Assessments receberão a nova permission.

---

## Por que não compartilhar as tabelas dos tickets

- `ticket_categories.scope` (`internal|external|both`) e `ticket_subcategories.default_initial_message` são específicos do domínio de ticket.
- FKs entrantes vinculam categorias a `partner_contact_capabilities`, `partner_service_mappings`, `ticket_internal_routing_rules`, `tickets`.
- RLS baseada em `has_permission(my_profile_id(), bu_id, 'tickets.categories.manage:bu')` — chave do módulo Tickets. Compartilhar exigiria policies cruzadas ou bypass.
- Mesmo nome de categoria pode ter semântica distinta entre tickets e provas; relatórios/funis exigem separação.

Reutilizar a tabela quebra a segregação por módulo já consagrada (`asset_categories`, `ticket_categories`, agora `assessment_categories`).

## O que reutilizar

- **Padrão estrutural** das tabelas (mesmas colunas/índices/triggers).
- **Enum `catalog_status`** (já compartilhado pelo projeto).
- **Padrão de UI** dos componentes `CategoryDialog` / `SubcategoryDialog` (clonar/adaptar, sem `scope` nem `default_initial_message`).

---

## Plano de implementação

### 1. Schema (migration)

Espelhar `ticket_*` removendo `scope` e `default_initial_message`:

```text
assessment_categories
  id, bu_id, name, description,
  status catalog_status DEFAULT 'active',
  created_at, created_by, updated_at, deleted_at

assessment_subcategories
  id, bu_id, category_id (FK ON DELETE CASCADE),
  name, status catalog_status DEFAULT 'active',
  created_at, created_by, updated_at, deleted_at
```

- Índices: `(bu_id) WHERE deleted_at IS NULL`, `(category_id, name) WHERE deleted_at IS NULL`.
- Triggers: `enforce_bu_scope` + `updated_at` (padrão usado em `assessments`).
- Validation trigger para coerência: ao referenciar subcategoria, ela precisa pertencer à categoria informada e à mesma BU.
- Sem CHECK constraints (regra inquebrável).
- Limites de nome via `entity-name-length-limits` (a definir — sugestão: 120 chars).

### 2. RLS (alinhada ao módulo Assessments)

```sql
-- SELECT
USING (
  deleted_at IS NULL
  AND has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.view:bu')
)

-- INSERT / UPDATE / soft delete
USING/WITH CHECK (
  has_assessment_permission(auth.uid(), bu_id, 'assessments.category.manage:bu')
)
```

Mesmo padrão para `assessment_subcategories`.

### 3. Permission catalog + templates

- Inserir em `permission_catalog`:
  - `assessments.category.manage:bu` — "Gerenciar categorias e subcategorias de avaliações".
- Atualizar `RBAC_TEMPLATES_V3.md` e seeds de templates V2 do módulo Assessments para incluir a nova chave nos perfis com `assessments.settings.manage:bu`.

### 4. Vínculo com `assessments`

Adicionar:
- `category_id uuid NULL REFERENCES assessment_categories(id)`
- `subcategory_id uuid NULL REFERENCES assessment_subcategories(id)`
- Validation trigger: se `subcategory_id` setado, validar `category_id` consistente e mesma `bu_id`.
- Nullable agora; obrigatoriedade depois via política de produto.

### 5. Frontend

- `src/modules/assessments/hooks`:
  - `useAssessmentCategories()`, `useAssessmentSubcategories(categoryId)`.
  - `useCreate/Update/DeleteAssessmentCategory`, idem subcategoria.
- Query keys via helper canônico (`src/lib/queryKeys/assessments.ts`) — padrão `QUERY_KEYS_STANDARD.md`.
- Filtros por `bu_id = currentBuId` síncronos (regra inquebrável de BU isolation).
- Colunas explícitas (sem `select('*')`).
- Componentes novos:
  - `AssessmentCategorySelect` (clone do `TicketCategorySelect` sem `scope`).
  - `CategoryDialog` / `SubcategoryDialog` em `src/modules/assessments/components/settings/`.
- Página de settings: aba "Categorias" em `/assessments/settings` (ou tab no editor de módulo).
- Editor da prova: selects de categoria → subcategoria (subcategoria depende da categoria escolhida).
- Listagem `/assessments`: filtro por categoria via URL state (`categoryId` em `URL_PARAM_KEYS`).

### 6. Documentação

- Atualizar `DATA_MODEL_REGISTRY.md` e `SCHEMA_QUICK_REFERENCE.md` (adicionar `assessment_categories`, `assessment_subcategories`).
- Adicionar entrada do módulo Assessments no `TECHNICAL_CONTEXT_REGISTRY.md` (incluindo o catálogo).
- Atualizar `PERMISSIONS_AND_RBAC_MODEL.md` (nova key).
- Atualizar `RBAC_TEMPLATES_V3.md`.
- Memória nova: `mem://features/assessments/categories-standard` referenciando estas tabelas e o padrão.

---

## Alternativa descartada

**Catálogo genérico compartilhado** (ex.: `domain_categories` com coluna `domain`) — atrativo conceitualmente, mas:
- Quebra RLS por módulo (cada um tem sua permission key).
- Exige bypass/joins em fluxos já estáveis de tickets e assets.
- Migração de dados em produção é arriscada para ganho marginal.

Critério para reavaliar: surgir um terceiro módulo com necessidade idêntica + ausência de FKs específicas por domínio.

---

## Entregáveis

1. Migration: `assessment_categories`, `assessment_subcategories`, colunas em `assessments`, RLS, triggers, validation triggers, índices.
2. Inserção da permission key `assessments.category.manage:bu` em `permission_catalog` + atualização dos templates V2.
3. Hooks + query keys do módulo.
4. Página de Settings (aba Categorias) + selects no editor e filtros na listagem.
5. Atualização dos docs canônicos (TCR, DATA_MODEL_REGISTRY, SCHEMA_QUICK_REFERENCE, PERMISSIONS, RBAC_TEMPLATES) e memória.