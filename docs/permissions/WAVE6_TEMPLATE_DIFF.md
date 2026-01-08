# Wave 6 — Template Diff (v1 → v2)

**Data:** 2026-01-08  
**Versão:** 1.0

---

## 1. Estratégia de Templates v2

### 1.1 Princípios

1. **Composição sobre herança**: Templates são somáveis
2. **Um template = um módulo** (preferencialmente)
3. **Surfaces como base**: VIEW / OPERATE / ADMINISTER
4. **Nomes semânticos**: `<module>_<surface>_v2`

### 1.2 Compatibilidade

- Templates v1 **NÃO serão removidos**
- Templates v2 coexistem com v1
- Migração é por usuário, via ferramenta admin

---

## 2. Mapeamento v1 → v2

### 2.1 Templates Base

| Template v1 | Template v2 | Mudanças |
|-------------|-------------|----------|
| `collaborator_base` | `collaborator_base_v2` | Mesmo conteúdo, keys normalizadas |
| `external_contact_base` | `external_contact_v2` | Mesmo conteúdo, keys normalizadas |

### 2.2 OKRs

| Template v1 | Template v2 | Surface | Diff |
|-------------|-------------|---------|------|
| `okrs_viewer` | `okrs_view_v2` | VIEW | Keys normalizadas (read → view) |
| `okrs_team_manager` | `okrs_operate_v2` | OPERATE:team | +1 key (checkin self) |
| `okrs_bu_manager` | `okrs_admin_v2` | ADMINISTER | Mesmo conteúdo |

**Detalhe okrs_operate_v2:**
```diff
  okrs.view:bu
  okrs.cycle.view:bu
  okrs.team_objective.view:bu
  okrs.team_objective.create:team
  okrs.team_objective.update:team
  okrs.initiative.view:bu
  okrs.initiative.create:team
  okrs.initiative.update:team
  okrs.checkin.view:bu
+ okrs.checkin.create:self
  okrs.checkin.update:self_or_owner
```

### 2.3 KPIs

| Template v1 | Template v2 | Surface | Diff |
|-------------|-------------|---------|------|
| `kpi_viewer` | `kpis_view_v2` | VIEW | Keys normalizadas |
| `kpi_editor` | `kpis_operate_v2` | OPERATE | Mesmo conteúdo |
| `kpi_admin` | `kpis_admin_v2` | ADMINISTER | Mesmo conteúdo |

### 2.4 Tickets

| Template v1 | Template v2 | Surface | Diff |
|-------------|-------------|---------|------|
| *(novo)* | `tickets_view_v2` | VIEW | Novo template |
| `tickets_operator` | `tickets_operate_v2` | OPERATE | Mesmo conteúdo |
| `tickets_admin` | `tickets_admin_v2` | ADMINISTER | Mesmo conteúdo |

**Novo tickets_view_v2:**
```
tickets.view:bu
tickets.thread.view:bu
tickets.attachment.view:bu
```

### 2.5 Assets: Inventory

| Template v1 | Template v2 | Surface | Diff |
|-------------|-------------|---------|------|
| *(novo)* | `inventory_view_v2` | VIEW | Novo template |
| `inventory_manager` | `inventory_operate_v2` | OPERATE | Mesmo conteúdo |
| `inventory_admin` | `inventory_admin_v2` | ADMINISTER | Mesmo conteúdo |

### 2.6 Assets: Keys

| Template v1 | Template v2 | Surface | Diff |
|-------------|-------------|---------|------|
| *(novo)* | `keys_view_v2` | VIEW | Novo template |
| `keys_manager` | `keys_operate_v2` | OPERATE | Mesmo conteúdo |
| `keys_admin` | `keys_admin_v2` | ADMINISTER | Mesmo conteúdo |

### 2.7 Assets: Gifts

| Template v1 | Template v2 | Surface | Diff |
|-------------|-------------|---------|------|
| *(novo)* | `gifts_view_v2` | VIEW | Novo template |
| `gifts_manager` | `gifts_operate_v2` | OPERATE | Mesmo conteúdo |
| `gifts_admin` | `gifts_admin_v2` | ADMINISTER | Mesmo conteúdo |

### 2.8 Teams

| Template v1 | Template v2 | Surface | Diff |
|-------------|-------------|---------|------|
| *(incluso em collaborator_base)* | `teams_view_v2` | VIEW | Separado |
| *(novo)* | `teams_operate_v2` | OPERATE | Novo template |
| *(novo)* | `teams_admin_v2` | ADMINISTER | Novo template |

### 2.9 Users

| Template v1 | Template v2 | Surface | Diff |
|-------------|-------------|---------|------|
| *(novo)* | `users_view_v2` | VIEW | Novo template |
| *(novo)* | `users_operate_v2` | OPERATE | Novo template |
| *(incluso em bu_admin)* | `users_admin_v2` | ADMINISTER | Separado |

### 2.10 BU Admin

| Template v1 | Template v2 | Diff |
|-------------|-------------|------|
| `bu_admin` | `bu_admin_v2` | Usa wildcard `*` ou composição de todos os _admin_v2 |

---

## 3. Resumo de Templates v2

| Slug | Module | Surface | Keys |
|------|--------|---------|------|
| `collaborator_base_v2` | multi | base | 9 |
| `external_contact_v2` | tickets | restricted | 4 |
| `okrs_view_v2` | okrs | VIEW | 6 |
| `okrs_operate_v2` | okrs | OPERATE | 12 |
| `okrs_admin_v2` | okrs | ADMINISTER | 37 |
| `kpis_view_v2` | kpis | VIEW | 3 |
| `kpis_operate_v2` | kpis | OPERATE | 7 |
| `kpis_admin_v2` | kpis | ADMINISTER | 13 |
| `tickets_view_v2` | tickets | VIEW | 3 |
| `tickets_operate_v2` | tickets | OPERATE | 8 |
| `tickets_admin_v2` | tickets | ADMINISTER | 23 |
| `inventory_view_v2` | assets.inv | VIEW | 2 |
| `inventory_operate_v2` | assets.inv | OPERATE | 7 |
| `inventory_admin_v2` | assets.inv | ADMINISTER | 16 |
| `keys_view_v2` | assets.keys | VIEW | 1 |
| `keys_operate_v2` | assets.keys | OPERATE | 6 |
| `keys_admin_v2` | assets.keys | ADMINISTER | 16 |
| `gifts_view_v2` | assets.gifts | VIEW | 1 |
| `gifts_operate_v2` | assets.gifts | OPERATE | 4 |
| `gifts_admin_v2` | assets.gifts | ADMINISTER | 11 |
| `teams_view_v2` | teams | VIEW | 3 |
| `teams_operate_v2` | teams | OPERATE | 3 |
| `teams_admin_v2` | teams | ADMINISTER | 10 |
| `users_view_v2` | users | VIEW | 1 |
| `users_operate_v2` | users | OPERATE | 2 |
| `users_admin_v2` | users | ADMINISTER | 7 |
| `bu_admin_v2` | * | wildcard | * |

**Total:** 27 templates v2

---

## 4. Ferramenta de Migração

### 4.1 UI Admin

```
/hub/permissions/migrate

[ ] Selecionar usuários para migrar
[ ] Preview de mudanças
[ ] Migrar (atômico)
[ ] Rollback disponível por 7 dias
```

### 4.2 Lógica de Migração

```typescript
async function migrateUserToV2(userId: string, buId: string) {
  // 1. Buscar templates v1 atuais
  const v1Templates = await getUserTemplates(userId, buId);
  
  // 2. Mapear para v2
  const v2Templates = v1Templates.map(t => templateMapping[t.slug]);
  
  // 3. Transação: remover v1, adicionar v2
  await supabase.rpc('migrate_user_templates_v2', {
    p_user_id: userId,
    p_bu_id: buId,
    p_v2_templates: v2Templates
  });
}
```

---

## 5. Rollout Plan

| Fase | Ação | Timeline |
|------|------|----------|
| 1 | Criar templates v2 no banco | Wave 6 |
| 2 | UI de seleção v2 para novos usuários | Wave 6 |
| 3 | Ferramenta de migração em massa | Wave 7 |
| 4 | Deprecar templates v1 (warning) | Wave 8 |
| 5 | Sunset templates v1 | Wave 10+ |

---

*Diff de templates para Wave 6*
