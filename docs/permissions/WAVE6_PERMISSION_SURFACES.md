# Wave 6 — Permission Surfaces

**Data:** 2026-01-08  
**Versão:** 1.0

---

## 1. Conceito de Surfaces

Uma **Permission Surface** agrupa permissões por intenção de uso, simplificando a UI e a atribuição.

| Surface | Semântica | Cor UI |
|---------|-----------|--------|
| **VIEW** | Leitura e navegação | 🔵 Blue |
| **OPERATE** | Ações operacionais do dia-a-dia | 🟢 Green |
| **ADMINISTER** | Configurações e gestão completa | 🟠 Orange |

---

## 2. Mapeamento por Módulo

### 2.1 Assets: Inventory

| Surface | Keys Canônicas |
|---------|----------------|
| **VIEW** | `assets.inventory.view:bu`, `assets.view:bu` |
| **OPERATE** | `assets.inventory.create:bu`, `assets.inventory.update:bu`, `assets.inventory.checkout:bu`, `assets.inventory.return:bu`, `assets.inventory.transfer:bu`, `assets.inventory.movement.create:bu` |
| **ADMINISTER** | `assets.inventory.delete:bu`, `assets.inventory.write_off:bu`, `assets.inventory.maintenance:bu`, `assets.inventory.sensitive.view:bu`, `assets.categories.manage:bu`, `assets.settings.manage:bu` |

### 2.2 Assets: Keys (Chaves)

| Surface | Keys Canônicas |
|---------|----------------|
| **VIEW** | `assets.keys.view:bu` |
| **OPERATE** | `assets.keys.create:bu`, `assets.keys.update:bu`, `assets.keys.checkout:bu`, `assets.keys.keyring.checkout:bu`, `assets.keys.keyring.return:bu`, `assets.keys.movement.create:bu` |
| **ADMINISTER** | `assets.keys.delete:bu`, `assets.keys.key.manage:bu`, `assets.keys.keyring.manage:bu`, `assets.keys.claviculary.manage:bu`, `assets.keys.hooks.manage:bu`, `assets.keys.hook_override:bu`, `assets.keys.sensitive.view:bu` |

### 2.3 Assets: Gifts (Brindes)

| Surface | Keys Canônicas |
|---------|----------------|
| **VIEW** | `assets.gifts.view:bu` |
| **OPERATE** | `assets.gifts.create:bu`, `assets.gifts.update:bu`, `assets.gifts.movement.create:bu`, `assets.gifts.adjustment.create:bu` |
| **ADMINISTER** | `assets.gifts.delete:bu`, `assets.gifts.item.manage:bu`, `assets.gifts.batch.manage:bu`, `assets.gifts.settings.manage:bu` |

### 2.4 OKRs

| Surface | Keys Canônicas | Scope Notes |
|---------|----------------|-------------|
| **VIEW** | `okrs.view:bu`, `okrs.cycle.view:bu`, `okrs.org_objective.view:bu`, `okrs.team_objective.view:bu`, `okrs.initiative.view:bu`, `okrs.checkin.view:bu` | |
| **OPERATE (Team)** | `okrs.team_objective.create:team`, `okrs.team_objective.update:team`, `okrs.initiative.create:team`, `okrs.initiative.update:team`, `okrs.checkin.create:self`, `okrs.checkin.update:self_or_owner` | Escopo via `user_can_manage_team()` |
| **OPERATE (BU)** | `okrs.org_objective.create:bu`, `okrs.org_objective.update:bu`, `okrs.team_objective.create:bu`, `okrs.team_objective.update:bu` | Admin BU |
| **ADMINISTER** | `okrs.org_objective.cancel:bu`, `okrs.team_objective.cancel:bu`, `okrs.initiative.cancel:bu`, `okrs.cycle.manage:bu`, `okrs.settings.manage:bu` | |

### 2.5 KPIs

| Surface | Keys Canônicas |
|---------|----------------|
| **VIEW** | `kpis.view:bu`, `kpis.metric.view:bu`, `kpis.value.view:bu` |
| **OPERATE** | `kpis.value.create:bu`, `kpis.value.add:bu`, `kpis.value.update_own:bu`, `kpis.metric.update:self_or_owner`, `kpis.metric.update_scoped:team` |
| **ADMINISTER** | `kpis.metric.create:bu`, `kpis.metric.delete:bu`, `kpis.metric.disable:bu`, `kpis.settings.manage:bu` |

### 2.6 Tickets

| Surface | Keys Canônicas |
|---------|----------------|
| **VIEW** | `tickets.view:bu`, `tickets.thread.view:bu`, `tickets.thread.view:self_or_owner` |
| **OPERATE** | `tickets.thread.create:bu`, `tickets.thread.update:bu`, `tickets.thread.assign:bu`, `tickets.message.create:bu`, `tickets.attachment.create:bu`, `tickets.attachment.view:bu` |
| **ADMINISTER** | `tickets.thread.delete:bu`, `tickets.thread.close:bu`, `tickets.category.manage:bu`, `tickets.partner.manage:bu`, `tickets.routing.manage:bu`, `tickets.visibility.manage:bu`, `tickets.settings.manage:bu` |

### 2.7 Teams & Squads

| Surface | Keys Canônicas |
|---------|----------------|
| **VIEW** | `teams.view:bu`, `teams.team.view:bu`, `teams.squad.view:bu` |
| **OPERATE** | `teams.team.update:team`, `teams.squad.update:bu`, `teams.membership.manage:team` |
| **ADMINISTER** | `teams.team.create:bu`, `teams.team.delete:bu`, `teams.squad.create:bu`, `teams.squad.delete:bu`, `teams.settings.manage:bu` |

### 2.8 Users

| Surface | Keys Canônicas |
|---------|----------------|
| **VIEW** | `users.profile.view:bu` |
| **OPERATE** | `users.profile.update:self`, `users.profile.update:bu` |
| **ADMINISTER** | `users.profile.manage:bu`, `users.profile.create:bu`, `users.profile.delete:bu`, `users.membership.manage:bu` |

### 2.9 Hub & Platform

| Surface | Keys Canônicas |
|---------|----------------|
| **VIEW** | `hub.permissions.view:bu`, `platform.modules.view:global`, `platform.integrations.view:global` |
| **ADMINISTER** | `hub.permissions.manage:bu`, `hub.settings.manage:bu`, `platform.modules.manage:global`, `platform.integrations.manage:global`, `platform.bu.manage:global`, `platform.super_admin.assign:global` |

---

## 3. Regras de Hierarquia

```
VIEW < OPERATE < ADMINISTER
```

- Quem tem **ADMINISTER** automaticamente tem OPERATE e VIEW
- Quem tem **OPERATE** automaticamente tem VIEW
- Isso é resolvido na **atribuição de template**, não na key

---

## 4. Uso na UI

### 4.1 Seletor de Permissões Simplificado

```tsx
<PermissionSurfaceSelector
  module="okrs"
  value="operate" // ou "view" | "administer"
  onChange={setSurface}
/>
```

### 4.2 Preview de Keys

Ao selecionar uma surface, mostrar lista de keys incluídas (colapsável).

### 4.3 Escopo via Hierarquia

```tsx
// Scope é resolvido por user_can_manage_team(), não por surface
<ScopeIndicator
  scope="team"
  description="Aplicado ao time que lidera e sub-times"
/>
```

---

## 5. Compatibilidade com Templates v1

- Templates v1 continuam funcionando (lista explícita de keys)
- Templates v2 usam surfaces como base
- UI mostra surface "efetiva" para templates v1 (cálculo reverso)

---

*Mapeamento de surfaces para Wave 6*
