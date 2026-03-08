

# Plano — Submódulo Linhas Telefônicas (Assets)

## Pre-Checklist

| Documento | Consultado |
|-----------|------------|
| TCR v3.9.0 | Sim |
| IDENTITY_CONVENTION v2.2.0 | Sim |
| PERMISSIONS_AND_RBAC_MODEL v1.5.0 | Sim |
| DATA_MODEL_REGISTRY v1.2.2 | Sim |
| Migrations existentes de Assets | Sim |

---

## Resumo

Criar o submódulo "Linhas Telefônicas" dentro de Assets com tabela, RLS, rota, aba de navegação, página de listagem com CRUD via dialog, filtros URL state, e reuso integral de componentes canônicos.

---

## 1. Banco de Dados (migração SQL)

### 1.1 Adicionar roles ao enum `asset_permission_role`

O prompt original diz "não criar novas permission keys", porém as RLS do Assets usam `has_asset_permission(auth.uid(), bu_id, ARRAY[...])` com roles tipadas. Para Phone Lines, reusar as roles de inventário (`inventory_admin`, `inventory_manager`) é correto e suficiente. Nenhuma alteração no enum necessária.

### 1.2 Tabela `asset_phone_lines`

```sql
CREATE TABLE public.asset_phone_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES bu_units(id),
  phone_number text NOT NULL,
  carrier text,
  plan_type text NOT NULL DEFAULT 'postpaid',
  status text NOT NULL DEFAULT 'available',
  current_user_id uuid REFERENCES profiles(id),
  linked_asset_id uuid REFERENCES asset_inventory(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
```

Correções vs prompt original:
- **Sem CHECK constraints complexas** — usar validation trigger para `loaned requires user`
- **CHECKs simples** para `plan_type` e `status` são aceitáveis (padrão existente em `asset_categories`)

### 1.3 Validation trigger (substitui CHECK complexo)

```sql
CREATE OR REPLACE FUNCTION public.validate_phone_line_loan()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'loaned' AND NEW.current_user_id IS NULL THEN
    RAISE EXCEPTION 'current_user_id is required when status is loaned';
  END IF;
  RETURN NEW;
END; $$;
```

### 1.4 Updated_at trigger (padrão customizado, sem moddatetime)

```sql
CREATE OR REPLACE FUNCTION public.update_asset_phone_lines_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
```

### 1.5 BU Scope trigger

```sql
CREATE TRIGGER trg_enforce_bu_scope_asset_phone_lines
  BEFORE INSERT OR UPDATE ON asset_phone_lines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();
```

### 1.6 RLS (padrão real do projeto)

Padrão confirmado nas migrations existentes: `auth.uid()` + `has_asset_permission()` + `::asset_permission_role[]` + `deleted_at IS NULL` no SELECT.

```sql
-- SELECT
USING (
  deleted_at IS NULL
  AND user_has_bu_access(auth.uid(), bu_id)
  AND has_asset_permission(auth.uid(), bu_id,
    ARRAY['assets_admin','inventory_admin','inventory_manager','viewer']::asset_permission_role[])
);

-- INSERT (WITH CHECK), UPDATE (USING + WITH CHECK)
has_asset_permission(auth.uid(), bu_id,
  ARRAY['assets_admin','inventory_admin','inventory_manager']::asset_permission_role[])

-- DELETE
has_asset_permission(auth.uid(), bu_id,
  ARRAY['assets_admin','inventory_admin']::asset_permission_role[])
```

Sem `is_current_bu()` — as tabelas existentes de Assets não usam, apenas `user_has_bu_access()`.

### 1.7 Índices

Índice único parcial `(bu_id, phone_number) WHERE deleted_at IS NULL` + índices auxiliares para status, current_user, linked_asset.

---

## 2. Frontend

### 2.1 Permissões — estender `useAssetPermissionsV2`

Adicionar duas flags:
- `canAccessPhoneLinesTab` → reusa `canViewInventory` (mesmas roles de inventário)
- `canViewPhoneLines` → alias de `canViewInventory`
- `canManagePhoneLines` → alias de `canManageInventory`

Atualizar o tipo `TabDef.permissionKey` em `AssetsLayout.tsx` para incluir `canAccessPhoneLinesTab`.

### 2.2 Navegação

**AssetsLayout.tsx** — adicionar tab entre "Brindes" e "Relatórios":
```typescript
{ name: "Linhas", href: "/assets/phone-lines", icon: Smartphone, permissionKey: "canAccessPhoneLinesTab" }
```

**assets.routes.tsx** — adicionar nested route:
```typescript
<Route path="phone-lines" element={<PhoneLinesPage />} />
```

### 2.3 Query Keys

Adicionar em `src/lib/queryKeys/assets.ts`:
```typescript
phoneLines: {
  all: (buId: string | null) => ['assets', 'phone-lines', buId] as const,
  list: (buId: string | null, filters?: Record<string, unknown>) =>
    ['assets', 'phone-lines', 'list', buId, filters] as const,
  detail: (id: string) => ['assets', 'phone-lines', 'detail', id] as const,
  carriers: (buId: string | null) => ['assets', 'phone-lines', 'carriers', buId] as const,
},
```

### 2.4 Estrutura de arquivos

```
src/modules/assets/
├── components/phone-lines/
│   ├── PhoneLineTable.tsx
│   ├── PhoneLineDialog.tsx       (criar/editar)
│   └── PhoneLineFilters.tsx      (status + operadora)
├── hooks/
│   ├── usePhoneLines.ts          (query + mutations)
│   └── index.ts                  (atualizar barrel)
├── pages/
│   └── PhoneLinesPage.tsx
```

### 2.5 Componentes canônicos reutilizados (sem duplicação)

| Necessidade | Componente existente |
|-------------|---------------------|
| Select de usuário | `BuUserSelect` |
| Busca/filtros | `ListPageFilters`, `useUrlState` |
| Estado vazio/erro/loading | `EmptyState`, `Skeleton` |
| Dialog form reset | `useDialogFormReset()` |
| Máscara de telefone | `src/lib/phone.ts` (`formatPhoneInput`, `normalizePhone`, `formatPhoneDisplay`) |
| Cliente Supabase | `useBuScopedSupabase()` |
| Identidade | `useIdentity()` |
| Permissões | `useAssetPermissionsV2()` |

### 2.6 Página (`PhoneLinesPage.tsx`)

Layout: `ListPageFilters` (busca) → filtros inline (status, operadora via URL state) → tabela com colunas: Número, Operadora, Plano, Status, Responsável, Asset vinculado, Ações.

### 2.7 Dialog (`PhoneLineDialog.tsx`)

Formulário com `react-hook-form` + `zod`. Campos: número (máscara via `formatPhoneInput`), operadora (autocomplete de valores distintos), plano (select), status (select), responsável (`BuUserSelect`, obrigatório se loaned), asset vinculado (select opcional de `asset_inventory`), observações.

---

## 3. Entregas (ordem de implementação)

1. **Migração SQL** — tabela, triggers (bu_scope, updated_at, validation), RLS, índices
2. **Query keys** — adicionar `phoneLines` em `assetsKeys`
3. **Permissões** — estender `useAssetPermissionsV2` com flags de Phone Lines
4. **Layout + Rota** — nova tab em `AssetsLayout`, nested route em `assets.routes.tsx`
5. **Hook** — `usePhoneLines.ts` (query de listagem + carriers + mutations CRUD/loan/return)
6. **Componentes** — `PhoneLineTable`, `PhoneLineDialog`, `PhoneLineFilters`
7. **Página** — `PhoneLinesPage.tsx` integrando tudo
8. **Barrel** — atualizar `hooks/index.ts`

