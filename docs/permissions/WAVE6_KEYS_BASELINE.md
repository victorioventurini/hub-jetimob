# Wave 6 — Permission Keys Baseline

**Data:** 2026-01-08  
**Baseline para:** Wave 6 - Permissions Simplification

---

## 1. Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Total de Permission Keys** | 143 |
| **Módulos** | 10 |
| **Templates (Groups)** | 17 |
| **Keys Ativas** | 143 (100%) |

---

## 2. Distribuição por Módulo

| Módulo | Total Keys | % do Total |
|--------|------------|------------|
| assets | 41 | 28.7% |
| okrs | 37 | 25.9% |
| tickets | 23 | 16.1% |
| kpis | 13 | 9.1% |
| teams | 10 | 7.0% |
| users | 7 | 4.9% |
| hub | 5 | 3.5% |
| platform | 4 | 2.8% |
| settings | 2 | 1.4% |
| home | 1 | 0.7% |

---

## 3. Distribuição por Scope

| Scope | Total Keys |
|-------|------------|
| bu | 117 (81.8%) |
| team | 9 (6.3%) |
| self_or_owner | 9 (6.3%) |
| team_tree | 4 (2.8%) |
| global | 6 (4.2%) |
| self | 2 (1.4%) |

---

## 4. Análise de Naming

### 4.1 Padrão Esperado
```
<module>.<resource>.<action>:<scope>
```

### 4.2 Violações Identificadas

| Tipo | Contagem | Exemplos |
|------|----------|----------|
| Keys sem `:scope` no nome | 2 | `assets.settings.manage`, `hub.permissions.manage` |
| Actions inconsistentes | 6 | `read` vs `view` (duplicidade semântica) |
| Resources com prefixo redundante | 4 | `gifts_adjustment`, `inventory_movement` |

### 4.3 Ações Identificadas no Catálogo

| Action | Contagem | Notas |
|--------|----------|-------|
| view | 18 | Leitura básica |
| read | 11 | Duplica `view` em alguns módulos |
| create | 20 | Criação de recursos |
| update | 13 | Edição de recursos |
| delete | 6 | Exclusão |
| manage | 22 | Gerenciamento (CRUD + config) |
| checkout | 4 | Específico de assets |
| return | 3 | Específico de assets |
| cancel | 5 | Específico de okrs/tickets |
| add | 2 | Específico de kpis |

---

## 5. Keys Usadas no Frontend

Keys ativamente referenciadas em código frontend:

| Key | Arquivo | Uso |
|-----|---------|-----|
| `okrs.org_objective.create:bu` | OkrDashboardPage.tsx | Criar OKR org |
| `okrs.team_objective.create:team` | OkrDashboardPage.tsx | Criar OKR time |
| `okrs.read` | LeaderDashboard.tsx | Visualizar módulo |
| `kpis.read` | LeaderDashboard.tsx | Visualizar módulo |
| `tickets.read` | LeaderDashboard.tsx | Visualizar módulo |
| `assets.read` | LeaderDashboard.tsx | Visualizar módulo |
| `users.profile.manage:bu` | Users.tsx | Gerenciar usuários |
| `teams.team.create:bu` | TeamsPage.tsx | Criar times |
| `teams.squad.update:bu` | SquadDetailDialog.tsx | Gerenciar squads |

### 5.1 Keys no Catálogo mas não usadas no Frontend

> ⚠️ **Nota:** Muitas keys são usadas apenas em RLS (backend). Isso é esperado.
> Keys "read-only" usadas em RLS mas não no frontend: ~80 keys

---

## 6. Problemas Identificados

### 6.1 Duplicidade Semântica
- `view` e `read` usados como sinônimos em alguns módulos
- Exemplo: `assets.inventory.view:bu` vs `assets.inventory.read:bu`

### 6.2 Granularidade Excessiva
- 41 keys apenas para assets (28.7% do total)
- Muitas micro-ações que poderiam ser agrupadas

### 6.3 Inconsistência de Naming
- Algumas keys usam sufixo `:bu` explícito, outras não
- `assets.settings.manage` vs `assets.gifts.settings.manage:bu`

---

## 7. Recomendações Wave 6

1. **Consolidar `view`/`read`** → usar apenas `view` para leitura
2. **Adicionar `:scope`** em todas as keys para consistência
3. **Criar aliases** para keys legadas durante transição
4. **Agrupar em surfaces** (VIEW/OPERATE/ADMINISTER) para simplificar UI

---

*Gerado automaticamente como baseline para Wave 6*
