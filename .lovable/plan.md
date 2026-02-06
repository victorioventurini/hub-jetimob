
# Plano: Finalização de Permissões para Recomendações de Equipamentos

## Contexto

A feature de Recomendações de Equipamentos está **95% completa** e funcional. Faltam apenas ajustes de permissão granular para seguir o padrão do Hub.

---

## Itens Pendentes

### 1. Adicionar Flags de Permissão em `useAssetPermissionsV2`

**Arquivo:** `src/modules/assets/hooks/useAssetPermissionsV2.ts`

Adicionar flags específicas para recomendações:

```typescript
// === Permissões de RECOMENDAÇÕES ===
const canViewRecommendations = hasFullAccess || hasAny([
  "assets.recommendations.view:bu",
  "assets.inventory.view:bu", // Fallback: quem vê inventário, vê recomendações
]);

const canManageRecommendations = hasFullAccess || hasAny([
  "assets.recommendations.create:bu",
  "assets.recommendations.update:bu",
  "assets.inventory.create:bu", // Fallback: inventory admins podem gerenciar
]);

const canReviewRecommendations = hasFullAccess || has("assets.recommendations.review:bu");

// Adicionar ao return:
canViewRecommendations,
canManageRecommendations,
canReviewRecommendations,
```

---

### 2. Aplicar Controle de Permissão no Header

**Arquivo:** `src/modules/assets/pages/AssetsPage.tsx`

```typescript
// Importar hook
const { canViewRecommendations } = useAssetPermissionsV2();

// No JSX:
{canViewRecommendations && (
  <Button variant="outline" size="sm" asChild>
    <Link to="/assets/recommendations">
      <Lightbulb className="h-4 w-4 mr-2" />
      Recomendações
    </Link>
  </Button>
)}
```

---

### 3. Atualizar `RecommendationsPage` com Permissões Corretas

**Arquivo:** `src/modules/assets/pages/RecommendationsPage.tsx`

```typescript
// Trocar:
const { hasFullAccess, canManageInventory } = useAssetPermissionsV2();
const canManage = hasFullAccess || canManageInventory;

// Por:
const { canManageRecommendations, canReviewRecommendations } = useAssetPermissionsV2();

// E usar canManageRecommendations para botões de criar/editar
// E canReviewRecommendations para botão "Marcar como Revisada"
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/modules/assets/hooks/useAssetPermissionsV2.ts` | + 3 flags de permissão |
| `src/modules/assets/pages/AssetsPage.tsx` | + controle de visibilidade do botão |
| `src/modules/assets/pages/RecommendationsPage.tsx` | Usar flags corretas |

---

## Benefícios

1. **Granularidade:** Permissões específicas para recomendações
2. **Padrão Hub:** Segue o modelo de `canView*` / `canManage*` / `can*Action`
3. **Fallback inteligente:** Quem gerencia inventário herda acesso a recomendações
4. **Preparado para expansão:** Permission keys já documentadas para catálogo futuro

---

## Nota Técnica

As permission keys (`assets.recommendations.view:bu`, etc.) **não precisam existir no catálogo agora** — o fallback para `assets.inventory.*` garante funcionamento. Quando o catálogo for atualizado, as permissões granulares entram automaticamente.
