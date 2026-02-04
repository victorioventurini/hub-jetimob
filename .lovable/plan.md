
# Plano: Correção de Permissões do Módulo KPIs + Mensagem Educativa

## Contexto do Problema

### Diagnóstico
O usuário **Vitor Severo** (líder do time Marketing) possui o template `kpis_admin_v2` que inclui a permissão `kpis.settings.manage:bu`. Porém, o botão "Novo Indicador" **não aparece** porque o código verifica a key `"kpis:manage"` que **NÃO EXISTE** no catálogo de permissões.

### Evidências

**Templates de Vitor Severo:**
- `collaborator_base_v2`
- `okrs_view_v2`, `okrs_operate_v2`
- `kpis_view_v2`, `kpis_operate_v2`, **`kpis_admin_v2`** ← inclui `kpis.settings.manage:bu`
- `tickets_view_v2`, `tickets_operate_v2`
- `teams_view_v2`, `users_view_v2`, `inventory_view_v2`

**Keys reais no catálogo de KPIs:**
- `kpis.metric.create:bu` - Criar métricas
- `kpis.metric.update:self_or_owner` - Editar métricas próprias
- `kpis.metric.delete:bu` - Excluir métricas
- `kpis.settings.manage:bu` - Gerenciar configurações de KPIs (ADMIN)
- `kpis.value.add:bu` - Adicionar valores

**Key verificada no código (INCORRETA):** `"kpis:manage"` ← Não existe!

---

## Modelo de Governança Correto

| Ação | Quem pode | Permission Key |
|------|-----------|----------------|
| **Criar KPI** (estratégico) | Líderes e Admins | `kpis.settings.manage:bu` |
| **Criar Métrica** (operacional) | Com template `kpis_admin_v2` | `kpis.metric.create:bu` |
| **Editar indicadores** | Owner/Líder do time | `kpis.metric.update:self_or_owner` |
| **Gerenciar (arquivar/excluir)** | Líderes e Admins | `kpis.settings.manage:bu` |
| **Adicionar valores** | Operadores e acima | `kpis.value.add:bu` |

---

## Alterações Necessárias

### 1. KpiDashboardPage.tsx (L36, L122, L174, L178, L179)

**Problema:** Verifica `"kpis:manage"` (inexistente)

**Correção:**
```typescript
// ANTES (linha 36)
const canManageKpis = hasPermission("kpis:manage");

// DEPOIS
// Pode criar se tiver permissão de criar métricas OU gerenciar KPIs
const canCreateIndicator = hasPermission("kpis.metric.create:bu") || hasPermission("kpis.settings.manage:bu");
```

- Substituir todas as referências de `canManageKpis` por `canCreateIndicator`

---

### 2. CreateKpiDialog.tsx (L127, L174, L307-311)

**Problema:** 
- L127: Verifica `"kpis:manage"` (inexistente)
- L174: Bloqueia renderização se não tem `canManageKpis`

**Correção:**
```typescript
// ANTES (linhas 127-128)
const canManageKpis = hasPermission("kpis:manage");
const canCreateKpi = hasPermission("kpis.settings.manage:bu");

// DEPOIS
// Pode criar métricas OU KPIs
const canCreateIndicator = hasPermission("kpis.metric.create:bu") || hasPermission("kpis.settings.manage:bu");
// Pode criar KPIs (estratégicos) - apenas líderes/admins
const canCreateKpi = hasPermission("kpis.settings.manage:bu");
```

**Guarda de renderização (L174):**
```typescript
// ANTES
if (!isLoadingPermission && !canManageKpis) {
  return null;
}

// DEPOIS
if (!isLoadingPermission && !canCreateIndicator) {
  return null;
}
```

**Mensagem educativa (nova, após L340):**
Adicionar aviso quando usuário não pode criar KPIs:
```tsx
{!canCreateKpi && (
  <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
    <Info className="h-4 w-4 mt-0.5 shrink-0" />
    <span>
      <strong>KPIs</strong> são indicadores estratégicos e só podem ser criados por <strong>líderes de time</strong> ou <strong>administradores</strong>. 
      Você pode criar <strong>Métricas</strong> para acompanhamento operacional.
    </span>
  </div>
)}
```

---

### 3. EditKpiDialog.tsx (L122, L187)

**Problema:** Verifica `"kpis:manage"` (inexistente)

**Correção:**
```typescript
// ANTES (linhas 122-123)
const canManageKpis = hasPermission("kpis:manage");
const canCreateKpi = hasPermission("kpis.settings.manage:bu");

// DEPOIS
// Pode editar indicadores (owner/líder ou admin)
const canEditIndicator = hasPermission("kpis.metric.update:self_or_owner") || hasPermission("kpis.settings.manage:bu");
// Pode mudar tipo para KPI (apenas admin)
const canCreateKpi = hasPermission("kpis.settings.manage:bu");
```

**Guarda de renderização (L187):**
```typescript
// ANTES
if (!isLoadingPermission && !canManageKpis) {
  return null;
}

// DEPOIS
if (!isLoadingPermission && !canEditIndicator) {
  return null;
}
```

---

### 4. KpiActionsMenu.tsx (L39, L42)

**Problema:** Verifica `"kpis:manage"` (inexistente)

**Correção:**
```typescript
// ANTES (linha 39)
const canManage = hasPermission("kpis:manage");

// DEPOIS
// Pode gerenciar indicadores (editar/arquivar/excluir)
const canManage = hasPermission("kpis.settings.manage:bu");
```

---

## Resumo das Alterações

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `KpiDashboardPage.tsx` | 36, 122, 174, 178-179 | `canManageKpis` → `canCreateIndicator` |
| `CreateKpiDialog.tsx` | 127, 174, ~340 | Nova lógica + mensagem educativa |
| `EditKpiDialog.tsx` | 122, 187 | `canManageKpis` → `canEditIndicator` |
| `KpiActionsMenu.tsx` | 39 | `canManage` → key correta |

---

## Validação Pós-Implementação

### Vitor Severo (líder Marketing + `kpis_admin_v2`)
- ✅ Botão "Novo Indicador" visível
- ✅ Pode criar KPIs e Métricas
- ✅ Pode editar, arquivar, excluir indicadores

### Colaborador com `kpis_operate_v2` apenas
- ❌ Botão "Novo Indicador" NÃO visível (não tem `kpis.metric.create:bu`)
- ✅ Pode adicionar valores a KPIs existentes

### Colaborador com `kpis_view_v2` apenas  
- ❌ Botão "Novo Indicador" NÃO visível
- ✅ Pode visualizar indicadores e valores

---

## Seção Técnica

### Keys de KPI no Catálogo

| Template | Keys Incluídas |
|----------|----------------|
| `kpis_view_v2` | `kpis.view:bu`, `kpis.metric.view:bu`, `kpis.value.read:bu` |
| `kpis_operate_v2` | + `kpis.value.add:bu`, `kpis.value.create:bu`, `kpis.metric.update:self_or_owner` |
| `kpis_admin_v2` | + `kpis.metric.create:bu`, `kpis.settings.manage:bu`, `kpis.metric.delete:bu` |

### Lógica Final de Permissões

```typescript
// KpiDashboardPage.tsx - Mostrar botão "Novo Indicador"
const canCreateIndicator = hasPermission("kpis.metric.create:bu") || hasPermission("kpis.settings.manage:bu");

// CreateKpiDialog.tsx - Permitir criar KPIs (tipo estratégico)
const canCreateKpi = hasPermission("kpis.settings.manage:bu");

// EditKpiDialog.tsx - Permitir editar indicadores
const canEditIndicator = hasPermission("kpis.metric.update:self_or_owner") || hasPermission("kpis.settings.manage:bu");

// KpiActionsMenu.tsx - Ações de gerenciamento
const canManage = hasPermission("kpis.settings.manage:bu");
```

---

## Documentação a Atualizar

Após implementação, atualizar `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` seção 3.3:

```markdown
| Módulo | Prefixo | Exemplos |
|--------|---------|----------|
| KPIs | `kpis.` | `kpis.metric.create:bu`, `kpis.settings.manage:bu`, `kpis.value.add:bu` |
```

