# Legacy Classification Matrix

**Data:** 2026-01-08  
**Autor:** Auditoria Automatizada  
**Versão:** 1.0

---

## Legenda de Classificações

| Classificação | Descrição |
|---------------|-----------|
| **ACTIVE** | Uso confirmado, manter |
| **LEGACY** | Ainda em uso, deve ser substituído |
| **SUSPECT** | Sem evidência clara de uso |
| **OBSOLETE** | Comprovadamente sem uso, pode remover |

---

## Tabela Consolidada

### 1. BANCO DE DADOS

#### 1.1 Tabelas

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| `metrics` | DB | OBSOLETE | Baixo | Nenhuma | Remover Wave 3 |
| `user_notification_preferences` | DB | LEGACY | Médio | Migrar para v2 | Deprecar Wave 2 |
| `okr_dependencies` | DB | SUSPECT | Baixo | OKRs | Avaliar Wave 2 |
| `okr_coaching_events` | DB | SUSPECT | Baixo | OKRs | Avaliar Wave 2 |
| `squad_memberships` | DB | SUSPECT | Baixo | Squads | Avaliar uso |
| `automation_*` (4 tabelas) | DB | SUSPECT | Baixo | Feature | Avaliar lançamento |

#### 1.2 Colunas

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| `profiles.job_title` | DB | LEGACY | Médio | `job_title_id` | Deprecar Wave 2 |

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
| `CityAutocomplete.tsx` | Front | LEGACY | Baixo | Profile/JetimoberDialog | Avaliar remoção |
| `NavLink.tsx` | Front | SUSPECT | Baixo | Nenhuma detectada | Remover Wave 1 |
| `CopyLinkButton.tsx` | Front | SUSPECT | Baixo | Nenhuma detectada | Remover Wave 1 |
| `ui/pagination.tsx` | Front | SUSPECT | Baixo | Shadcn | Manter (pode usar) |
| `ui/input-otp.tsx` | Front | SUSPECT | Baixo | Shadcn | Manter (pode usar) |
| `ui/carousel.tsx` | Front | SUSPECT | Baixo | Shadcn | Manter (pode usar) |

#### 2.2 Hooks

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| `useUrlState.ts` | Front | LEGACY | Baixo | Migrado | Remover Wave 1 |
| `useNotifications.ts` | Front | LEGACY | Médio | useNotificationCenter | Consolidar Wave 2 |
| `useUserProfile` (shared) | Front | SUSPECT | Baixo | Duplicado | Consolidar |
| `useProfilesList` (shared) | Front | SUSPECT | Baixo | Duplicado | Consolidar |

#### 2.3 Páginas

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| `LegacyAssetRedirect.tsx` | Front | ~~LEGACY~~ **REMOVIDO** | - | - | ✅ Removido (dead code) |
| Todas as outras | Front | ACTIVE | - | - | Manter |

---

### 3. EDGE FUNCTIONS

| Item | Camada | Classificação | Risco | Dependências | Recomendação |
|------|--------|---------------|-------|--------------|--------------|
| `send-magic-link` | Edge | LEGACY | Baixo | request-magic-link | Remover Wave 2 |
| `request-magic-link` | Edge | ACTIVE | - | SendGrid | Manter |
| `auth-email-hook` | Edge | ACTIVE | - | Supabase Auth | Manter |
| `search-cities` | Edge | ACTIVE | - | Google Maps | Manter |
| `search-address` | Edge | ACTIVE | - | Google Places | Manter |
| `get-place-details` | Edge | ACTIVE | - | Google Places | Manter |
| `audit-permissions` | Edge | ACTIVE | - | RBAC | Manter |
| `process-agent-document` | Edge | ACTIVE | - | IA | Manter |
| `global-search` | Edge | ACTIVE | - | Busca | Manter |
| `get-public-asset` | Edge | ACTIVE | - | Assets | Manter |
| `invoke-vic` | Edge | ACTIVE | - | IA | Manter |
| `culture-message` | Edge | ACTIVE | - | IA | Manter |
| `hub-greeting` | Edge | ACTIVE | - | Home | Manter |
| `process-notification-outbox` | Edge | ACTIVE | - | Notificações | Manter |
| `get-tcr` | Edge | ACTIVE | - | Custom GPT | Manter |

---

## Sumário por Classificação

### ACTIVE (Manter)
- **DB:** 85+ tabelas, 7 views, 70+ funções SQL
- **Front:** 17 páginas, 13 módulos, 18+ hooks, 2 contexts
- **Edge:** 14 funções

### LEGACY (Deprecar/Substituir)
- **DB:** 
  - `user_notification_preferences` → v2
  - `profiles.job_title` → `job_title_id`
- **Front:**
  - `useUrlState.ts`
  - `useNotifications.ts` (wrapper)
  - `CityAutocomplete.tsx`
  - `LegacyAssetRedirect.tsx` (manter para compat)
- **Edge:**
  - `send-magic-link`

### SUSPECT (Avaliar)
- **DB:**
  - `metrics`
  - `okr_dependencies`
  - `okr_coaching_events`
  - `squad_memberships`
  - `automation_*` (4 tabelas)
- **Front:**
  - `NavLink.tsx`
  - `CopyLinkButton.tsx`
  - Componentes shadcn não utilizados

### OBSOLETE (Remover)
- **DB:** `metrics` (após confirmação)
- **Front:** Nenhum confirmado
- **Edge:** Nenhum confirmado

---

## Métricas de Saúde

| Métrica | Valor | Status |
|---------|-------|--------|
| Cobertura RLS | 100% | ✅ Excelente |
| Tabelas com bu_id | 70/92 | ⚠️ Verificar exceções |
| QueryKeys centralizados | ~95% | ✅ Bom |
| Identity convention | ~90% | ✅ Bom |
| Hooks ativos | 18/21 | ✅ Bom |
| Edge functions ativas | 14/15 | ✅ Excelente |

---

## Próximos Passos

1. Revisar itens SUSPECT com stakeholders
2. Criar tickets para deprecações LEGACY
3. Planejar remoções por Wave
4. Atualizar documentação após cada Wave
