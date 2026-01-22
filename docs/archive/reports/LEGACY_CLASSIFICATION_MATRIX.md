# Legacy Classification Matrix

**Data:** 2026-01-12  
**Autor:** Auditoria Automatizada  
**Versão:** 2.0

---

## Legenda de Classificações

| Classificação | Descrição |
|---------------|-----------|
| **ACTIVE** | Uso confirmado, manter |
| **LEGACY** | Ainda em uso, deve ser substituído |
| **SUSPECT** | Sem evidência clara de uso |
| **OBSOLETE** | Comprovadamente sem uso, pode remover |
| **REMOVED** | Já removido do sistema |

---

## Wave 2 - Status: ✅ CONCLUÍDO (2026-01-12)

Os seguintes itens foram verificados e confirmados como já removidos:

| Item | Status | Evidência |
|------|--------|-----------|
| `profiles.job_title` | ✅ REMOVIDO | Coluna não existe mais no banco |
| `user_notification_preferences` | ✅ REMOVIDO | Tabela não existe mais |
| `send-magic-link` | ✅ REMOVIDO | 0 chamadas em 30 dias, função deletada |

---

## Tabela Consolidada

### 1. BANCO DE DADOS

#### 1.1 Tabelas

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| `metrics` | DB | OBSOLETE | Baixo | Nenhuma | Remover Wave 3 |
| ~~`user_notification_preferences`~~ | DB | ~~LEGACY~~ REMOVED | - | - | ✅ Wave 2 concluído |
| `okr_dependencies` | DB | SUSPECT | Baixo | OKRs | Avaliar Wave 3 |
| `okr_coaching_events` | DB | SUSPECT | Baixo | OKRs | Avaliar Wave 3 |
| `squad_memberships` | DB | ACTIVE | Baixo | Squads | Em uso por useSquads |
| `automation_*` (4 tabelas) | DB | SUSPECT | Baixo | Feature | Avaliar lançamento |

#### 1.2 Colunas

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| ~~`profiles.job_title`~~ | DB | ~~LEGACY~~ REMOVED | - | - | ✅ Wave 2 concluído |

#### 1.3 Views

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| `identity_rls_violations` | DB | ACTIVE | - | Auditoria | Manter |
| `user_effective_permissions` | DB | ACTIVE | - | RBAC | Manter |
| `v_bu_null_audit_*` | DB | ACTIVE | - | Auditoria | Manter |
| `v_pending_checkins` | DB | ACTIVE | - | OKRs | Manter |

---

### 2. FRONTEND

#### 2.1 Componentes

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| `CityAutocomplete.tsx` | Front | ACTIVE | Baixo | Profile/JetimoberDialog | Em uso |
| `ui/pagination.tsx` | Front | ACTIVE | Baixo | Shadcn | Pode usar |
| `ui/input-otp.tsx` | Front | ACTIVE | Baixo | Shadcn | Pode usar |

#### 2.2 Hooks

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| `useNotifications.ts` | Front | LEGACY | Médio | useNotificationCenter | Consolidar Wave 3 |
| `useUserProfile` (shared) | Front | ACTIVE | Baixo | Canônico | Manter |
| `useProfilesList` (shared) | Front | ACTIVE | Baixo | Canônico | Manter |

#### 2.3 Páginas

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| Todas as páginas | Front | ACTIVE | - | - | Manter |

---

### 3. EDGE FUNCTIONS

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| ~~`send-magic-link`~~ | Edge | ~~LEGACY~~ REMOVED | - | - | ✅ Wave 2 concluído |
| `request-magic-link` | Edge | ACTIVE | - | SendGrid | Manter |
| `auth-email-hook` | Edge | ACTIVE | - | Supabase Auth | Manter |
| `search-cities` | Edge | ACTIVE | - | Google Maps | Manter |
| `search-address` | Edge | ACTIVE | - | Google Places | Manter |
| `get-place-details` | Edge | ACTIVE | - | Google Places | Manter |
| `audit-permissions` | Edge | ACTIVE | - | RBAC | Manter |
| `process-agent-document` | Edge | ACTIVE | - | IA | Manter |
| `get-public-asset` | Edge | ACTIVE | - | Assets | Manter |
| `invoke-vic` | Edge | ACTIVE | - | IA | Manter |
| `culture-message` | Edge | ACTIVE | - | IA | Manter |
| `process-notification-outbox` | Edge | ACTIVE | - | Notificações | Manter |
| `evaluate-notification-health` | Edge | ACTIVE | - | Notificações | Manter |
| `cron-dispatcher` | Edge | ACTIVE | - | Scheduled Jobs | Manter |
| `get-tcr` | Edge | ACTIVE | - | Custom GPT | Manter |
| `send-partner-invite` | Edge | ACTIVE | - | Partners | Manter |

---

## Sumário por Classificação

### ACTIVE (Manter)
- **DB:** 85+ tabelas, 7 views, 70+ funções SQL
- **Front:** 17 páginas, 13 módulos, 18+ hooks, 2 contexts
- **Edge:** 15 funções

### LEGACY (Deprecar/Substituir)
- **Front:**
  - `useNotifications.ts` (wrapper) → consolidar com `useNotificationCenter`

### SUSPECT (Avaliar Wave 3)
- **DB:**
  - `metrics` (OBSOLETE - pode remover)
  - `okr_dependencies`
  - `okr_coaching_events`
  - `automation_*` (4 tabelas - aguardando feature)

### REMOVED (Wave 2 - Concluído)
- **DB:**
  - `user_notification_preferences`
  - `profiles.job_title`
- **Edge:**
  - `send-magic-link`

---

## Métricas de Saúde

| Métrica | Valor | Status |
|---------|-------|--------|
| Cobertura RLS | 100% | ✅ Excelente |
| Tabelas com bu_id | 70/92 | ⚠️ Verificar exceções |
| QueryKeys centralizados | ~98% | ✅ Excelente |
| Identity convention | 100% | ✅ Excelente |
| Hooks ativos | 20/20 | ✅ Excelente |
| Edge functions ativas | 15/15 | ✅ Excelente |

---

## Próximos Passos (Wave 3)

1. Avaliar remoção da tabela `metrics`
2. Decidir sobre `okr_dependencies` e `okr_coaching_events`
3. Consolidar `useNotifications.ts` → `useNotificationCenter`
4. Avaliar tabelas `automation_*` quando feature for lançada
