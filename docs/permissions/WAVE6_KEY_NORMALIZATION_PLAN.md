# Wave 6 — Key Normalization Plan

**Data:** 2026-01-08  
**Versão:** 1.0

---

## 1. Padrão Final de Naming

```
<module>.<resource>.<action>:<scope>
```

### 1.1 Modules Válidos
- `assets`, `okrs`, `tickets`, `kpis`, `teams`, `users`, `hub`, `platform`, `settings`, `home`

### 1.2 Actions Canônicas

| Action | Semântica | Substitui |
|--------|-----------|-----------|
| `view` | Leitura/visualização | `read` (deprecated) |
| `create` | Criar novo recurso | - |
| `update` | Editar recurso existente | - |
| `delete` | Excluir recurso | - |
| `manage` | CRUD + configurações | - |
| `operate` | Ações operacionais específicas | `checkout`, `return`, etc. |
| `cancel` | Cancelar/inativar | - |
| `assign` | Atribuir a usuário/time | - |

### 1.3 Scopes Válidos

| Scope | Semântica |
|-------|-----------|
| `:self` | Apenas próprio usuário |
| `:self_or_owner` | Próprio ou se for owner do recurso |
| `:team` | Time direto do usuário |
| `:team_tree` | Time + sub-times |
| `:squad` | Squad do usuário |
| `:bu` | Toda a BU |
| `:global` | Cross-BU (platform) |

---

## 2. Keys para Normalizar

### 2.1 Adicionar Scope Explícito

| Key Atual | Key Canônica |
|-----------|--------------|
| `assets.settings.manage` | `assets.settings.manage:bu` |
| `hub.permissions.manage` | `hub.permissions.manage:bu` |
| `hub.permissions.view` | `hub.permissions.view:bu` |

### 2.2 Consolidar read → view

| Key Atual (deprecated) | Key Canônica |
|------------------------|--------------|
| `assets.inventory.read:bu` | `assets.inventory.view:bu` |
| `assets.gifts.read:bu` | `assets.gifts.view:bu` |
| `assets.keys.read:bu` | `assets.keys.view:bu` |
| `kpis.metric.read:bu` | `kpis.metric.view:bu` |
| `kpis.value.read:bu` | `kpis.value.view:bu` |
| `okrs.cycle.read:bu` | `okrs.cycle.view:bu` |
| `okrs.initiative.read:bu` | `okrs.initiative.view:bu` |
| `okrs.org_objective.read:bu` | `okrs.org_objective.view:bu` |
| `okrs.team_objective.read:bu` | `okrs.team_objective.view:bu` |
| `tickets.partner.read:bu` | `tickets.partner.view:bu` |
| `tickets.thread.read:bu` | `tickets.thread.view:bu` |

### 2.3 Consolidar Resources Redundantes

| Key Atual | Key Canônica | Motivo |
|-----------|--------------|--------|
| `assets.gifts_adjustment.create:bu` | `assets.gifts.adjustment.create:bu` | Padronizar hierarquia |
| `assets.gifts_movement.create:bu` | `assets.gifts.movement.create:bu` | Padronizar hierarquia |
| `assets.inventory_movement.create:bu` | `assets.inventory.movement.create:bu` | Padronizar hierarquia |

---

## 3. Estratégia de Aliases

### 3.1 Tabela de Aliases

Criar tabela `permission_key_aliases`:

```sql
CREATE TABLE public.permission_key_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_key text NOT NULL UNIQUE,
  new_key text NOT NULL REFERENCES permission_catalog(key),
  deprecated_at timestamptz DEFAULT now(),
  sunset_at timestamptz, -- Quando será removido
  created_at timestamptz DEFAULT now()
);
```

### 3.2 Atualizar has_permission

```sql
CREATE OR REPLACE FUNCTION has_permission(...)
  -- Verificar alias primeiro
  SELECT new_key INTO v_resolved_key
  FROM permission_key_aliases
  WHERE old_key = p_permission_key;
  
  -- Usar key resolvida ou original
  v_final_key := COALESCE(v_resolved_key, p_permission_key);
  
  -- Continuar lógica existente com v_final_key
```

### 3.3 Atualizar usePermissions (Frontend)

```typescript
// Manter compatibilidade: has() aceita old ou new key
// Internamente, todas as keys são já as canônicas
const has = (key: string): boolean => {
  const resolved = keyAliases[key] || key;
  return permissions.includes(resolved);
};
```

---

## 4. Cronograma de Deprecação

| Fase | Ação | Timeline |
|------|------|----------|
| Wave 6 | Criar aliases + keys canônicas | Imediato |
| Wave 7 | Migrar templates para keys canônicas | +2 semanas |
| Wave 8 | Warnings no console para keys deprecated | +4 semanas |
| Wave 9 | Remover aliases (sunset) | +8 semanas |

---

## 5. Impacto no Código

### 5.1 Arquivos que usam keys deprecated

| Arquivo | Keys Usadas | Ação |
|---------|-------------|------|
| LeaderDashboard.tsx | `okrs.read`, `kpis.read` | Aliases automáticos |
| OkrDashboardPage.tsx | Keys já canônicas | Nenhuma |
| Users.tsx | Key já canônica | Nenhuma |
| TeamsPage.tsx | Key já canônica | Nenhuma |

### 5.2 RLS que usa keys

> Aliases funcionam automaticamente via `has_permission()` atualizada.

---

## 6. Validação

Após implementação:

```bash
# Verificar que todas as keys no catálogo seguem padrão
npx tsx scripts/audit-permission-keys.ts

# Verificar que aliases resolvem corretamente
npx tsx scripts/test-permission-aliases.ts
```

---

*Plano de normalização para Wave 6*
