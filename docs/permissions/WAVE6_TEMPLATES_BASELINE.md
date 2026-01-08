# Wave 6 — Templates Baseline

**Data:** 2026-01-08  
**Baseline para:** Wave 6 - Permissions Simplification

---

## 1. Resumo de Templates

| Template (slug) | Total Keys | Tipo | Status |
|-----------------|------------|------|--------|
| bu_admin | 135 | system | active |
| okrs_bu_manager | 37 | system | active |
| tickets_admin | 23 | system | active |
| okrs_team_manager | 16 | system | active |
| keys_admin | 16 | system | active |
| inventory_admin | 16 | system | active |
| kpi_admin | 13 | system | active |
| gifts_admin | 11 | system | active |
| inventory_manager | 10 | system | active |
| collaborator_base | 9 | system | active |
| tickets_operator | 8 | system | active |
| keys_manager | 7 | system | active |
| kpi_editor | 7 | system | active |
| okrs_viewer | 6 | system | active |
| gifts_manager | 5 | system | active |
| kpi_viewer | 4 | system | active |
| external_contact_base | 4 | system | active |

---

## 2. Análise de Sobreposição

### 2.1 Alta Sobreposição (>60%)

| Template 1 | Template 2 | Overlap | % do menor |
|------------|------------|---------|------------|
| bu_admin (135) | collaborator_base (9) | 9 | 100% |
| bu_admin (135) | okrs_viewer (6) | 6 | 100% |
| bu_admin (135) | kpi_viewer (4) | 4 | 100% |
| bu_admin (135) | ALL others | 100% | 100% |
| okrs_bu_manager (37) | okrs_team_manager (16) | 16 | 100% |
| okrs_bu_manager (37) | okrs_viewer (6) | 6 | 100% |
| tickets_admin (23) | tickets_operator (8) | 8 | 100% |
| kpi_admin (13) | kpi_editor (7) | 7 | 100% |
| kpi_admin (13) | kpi_viewer (4) | 4 | 100% |
| keys_admin (16) | keys_manager (7) | 7 | 100% |
| inventory_admin (16) | inventory_manager (10) | 10 | 100% |
| gifts_admin (11) | gifts_manager (5) | 5 | 100% |

### 2.2 Observação

O template `bu_admin` contém **100% das keys de todos os outros templates**. Isso é esperado (admin tem tudo), mas indica:
- Templates de nível inferior são subsets corretos
- Hierarquia respeitada

---

## 3. Composição dos Templates Base

### 3.1 collaborator_base (9 keys)
```
assets.view:bu
home.view:bu
kpis.view:bu
okrs.view:bu
teams.view:bu
tickets.attachment.create:bu
tickets.message.create:bu
tickets.thread.create:bu
users.profile.update:self
```

### 3.2 external_contact_base (4 keys)
```
tickets.thread.view:self_or_owner
tickets.message.create:bu
tickets.attachment.create:bu
tickets.attachment.view:self_or_owner
```

---

## 4. Análise por Módulo nos Templates

### 4.1 okrs_team_manager vs okrs_bu_manager

| Aspecto | team_manager | bu_manager |
|---------|--------------|------------|
| Scope predominante | :team | :bu |
| Pode cancelar | ❌ | ✅ |
| Pode configurar | ❌ | ✅ |
| Keys totais | 16 | 37 |

**Conclusão:** Hierarquia correta, `bu_manager` é superset.

### 4.2 inventory_manager vs inventory_admin

| Aspecto | manager | admin |
|---------|---------|-------|
| CRUD básico | ✅ | ✅ |
| delete/write_off | ❌ | ✅ |
| settings.manage | ❌ | ✅ |
| categories.manage | ❌ | ✅ |
| Keys totais | 10 | 16 |

**Conclusão:** Hierarquia correta.

---

## 5. Problemas Identificados

### 5.1 bu_admin muito grande
- 135 keys em um template = difícil auditar
- Solução: manter como wildcard (`*`) em vez de lista explícita

### 5.2 Nomes pouco semânticos
- `okrs_viewer` vs `okrs_team_manager` vs `okrs_bu_manager`
- Não fica claro que viewer < team_manager < bu_manager

### 5.3 Falta template intermediário
- Não há `tickets_viewer` (apenas operator e admin)
- Não há `assets_viewer` (todos têm via collaborator_base)

---

## 6. Recomendações Wave 6

1. **Criar templates v2** com naming consistente:
   - `<module>_viewer_v2`
   - `<module>_operator_v2`
   - `<module>_admin_v2`

2. **Usar surfaces** para agrupar semanticamente:
   - VIEW = leitura
   - OPERATE = ações do dia-a-dia
   - ADMINISTER = configurações

3. **Simplificar bu_admin**:
   - Considerar wildcard `*` em vez de listar todas as keys
   - Ou marcar como "herda automaticamente todas as keys ativas"

4. **Manter compatibilidade**:
   - Não remover templates v1
   - Criar aliases old -> new
   - Migração gradual via UI

---

*Gerado automaticamente como baseline para Wave 6*
