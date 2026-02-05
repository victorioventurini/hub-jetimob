# Wave 8: Auditoria e Consolidação do Catálogo de Permissões

## Status: ✅ CONCLUÍDA

### Progresso

| Fase | Status | Detalhes |
|------|--------|----------|
| Fase 1: Keys fantasmas no frontend | ✅ Concluída | `LeaderDashboard.tsx` corrigido |
| Fase 2: Keys faltantes no catálogo | ✅ Concluída | 4 keys `bu.*` adicionadas |
| Fase 3: Expandir collaborator_base_v2 | ✅ Concluída | Template expandido de 1→11 keys |
| Fase 4: Auditoria RLS | ✅ Concluída | 43 keys faltantes adicionadas |
| Fase 5: Padronização nomenclatura | ✅ Concluída | 19 keys deprecated + aliases |
| Fase 6: Documentação | ✅ Concluída | TCR v2.92.0 |

---

## Alterações Realizadas

### 1. Frontend - Keys Corrigidas

**Arquivo:** `src/modules/home/components/LeaderDashboard.tsx`

| Antes | Depois |
|-------|--------|
| `okrs.read` | `okrs.view:bu` |
| `kpis.read` | `kpis.view:bu` |
| `tickets.read` | `tickets.ticket.view:bu` |
| `assets.read` | `assets.view:bu` |

### 2. Catálogo - Keys Adicionadas

4 novas keys no módulo `bu`:

| Key | Descrição |
|-----|-----------|
| `bu.settings.manage:bu` | Gerenciar configurações gerais da BU |
| `bu.settings.view:bu` | Visualizar configurações da BU |
| `bu.location.manage:bu` | Gerenciar sedes e localizações da BU |
| `bu.location.view:bu` | Visualizar sedes e localizações da BU |

### 3. Template Expandido

**`collaborator_base_v2`** expandido de 1 para 11 keys:

| Key | Módulo |
|-----|--------|
| `notifications.user.manage:self` | notifications (já existia) |
| `home.view:bu` | home |
| `okrs.view:bu` | okrs |
| `kpis.view:bu` | kpis |
| `assets.view:bu` | assets |
| `teams.view:bu` | teams |
| `users.list.view:bu` | users |
| `users.profile.view:bu` | users |
| `tickets.ticket.view:bu` | tickets |
| `bu.settings.view:bu` | bu |
| `bu.location.view:bu` | bu |

---

## Próximas Fases

### Fase 4: Auditoria RLS vs Catálogo

Verificar todas as RLS policies que usam `has_permission()` e confirmar que as keys existem no catálogo.

### Fase 5: Padronização de Nomenclatura

Criar aliases para keys sem sufixo `:scope` e deprecar gradualmente.

### Fase 6: Documentação

Atualizar:
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
- `docs/canonical/RBAC_TEMPLATES_V3.md`
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` → Bump para v2.92.0

