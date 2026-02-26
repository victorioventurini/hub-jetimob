
# Adicionar campo "member_display_name" na BU

## Objetivo

Permitir que cada BU defina um nome customizado para seus colaboradores (ex: "Jetimobers", "Verdinhos"). Se nao preenchido, o sistema usa "Usuários" como copy e "Users" como label do menu.

## Alteracoes

### 1. Migration: novo campo na tabela `bu_units`

```sql
ALTER TABLE public.bu_units
ADD COLUMN IF NOT EXISTS member_display_name text;
```

Sem default — `NULL` significa usar o fallback "Usuários"/"Users".

### 2. Tipo TypeScript: `src/modules/bu/types.ts`

Adicionar `member_display_name?: string | null` ao type `BuUnit`.

### 3. Hook de branding: `src/modules/bu/hooks/useBuBranding.ts`

Expor novo campo no retorno:
```typescript
memberDisplayName: currentBu?.member_display_name || "Usuários",
```

### 4. Sidebar desktop: `src/components/layout/DynamicSidebar.tsx`

- Transformar `globalBuItems` de constante estatica para dinamico dentro do componente
- Usar `useBuBranding().memberDisplayName` para o label do item "users":
  - `{ name: memberDisplayName, href: "/users", icon: Users, slug: "users" }`

### 5. Sidebar mobile: `src/components/layout/MobileSidebar.tsx`

- Mesmo ajuste: tornar `globalBuItems` dinamico com `memberDisplayName`

### 6. Sidebar antiga (fallback): `src/components/layout/Sidebar.tsx`

- Ajustar o item "Jetimobers" para usar `memberDisplayName`

### 7. Queries de BU (`useBuData.ts`)

Adicionar `member_display_name` nos selects de `useUserBus`, `useBuUnit` e `useAllBus` para que o campo seja carregado.

## Fluxo

- Admin preenche o campo "Nome dos colaboradores" nas configuracoes da BU (ex: "Verdinhos")
- O sidebar e qualquer copy que referencie o nome dos colaboradores usa esse valor
- Se vazio/null, mostra "Usuários" no copy e "Users" como fallback de menu

## Arquivos tocados

| Arquivo | Tipo de alteracao |
|---------|-------------------|
| Nova migration SQL | Adiciona coluna `member_display_name` |
| `src/modules/bu/types.ts` | Adiciona campo ao tipo |
| `src/modules/bu/hooks/useBuBranding.ts` | Expoe `memberDisplayName` |
| `src/modules/bu/hooks/useBuData.ts` | Adiciona campo nos selects |
| `src/components/layout/DynamicSidebar.tsx` | Label dinamico |
| `src/components/layout/MobileSidebar.tsx` | Label dinamico |
| `src/components/layout/Sidebar.tsx` | Label dinamico |
