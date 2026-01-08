# Frontend Legacy Audit Report

**Data:** 2026-01-08  
**Autor:** Auditoria Automatizada  
**Versão:** 1.0

---

## Sumário Executivo

Esta auditoria analisou o código frontend React/TypeScript do Hub, identificando componentes, hooks, rotas e padrões legados ou não utilizados.

**Estatísticas:**
- Páginas: 17
- Módulos: 13
- Hooks: 21
- Contexts: 2
- Componentes UI: 50+

---

## 1. Rotas e Páginas

### 1.1 Rotas Ativas (Confirmadas)

| Rota | Página | Módulo | Status |
|------|--------|--------|--------|
| `/auth` | Auth | Core | ACTIVE |
| `/` | Index | Home | ACTIVE |
| `/select-bu` | SelectBu | Core | ACTIVE |
| `/profile` | Profile | Core | ACTIVE |
| `/users` | Users | Admin | ACTIVE |
| `/users/:id` | UserProfile | Admin | ACTIVE |
| `/business-units` | BuManagementPage | Admin | ACTIVE |
| `/modules` | Modules | Admin | ACTIVE |
| `/search` | SearchPage | Core | ACTIVE |
| `/teams` | TeamsPage | Teams | ACTIVE |
| `/teams/:id` | TeamDetailPage | Teams | ACTIVE |
| `/okrs` | OkrDashboardPage | OKRs | ACTIVE |
| `/okrs/manage` | OkrsPage | OKRs | ACTIVE |
| `/okrs/executive` | ExecutiveDashboardPage | OKRs | ACTIVE |
| `/okrs/org-view` | OrgViewListPage | OKRs | ACTIVE |
| `/okrs/org-view/:id` | OrgObjectiveViewPage | OKRs | ACTIVE |
| `/okrs/team-contribution/:teamId` | TeamContributionPage | OKRs | ACTIVE |
| `/kpis` | KpiDashboardPage | KPIs | ACTIVE |
| `/assets/*` | AssetsPage + nested | Assets | ACTIVE |
| `/assets/inventory/:id` | InventoryDetailPage | Assets | ACTIVE |
| `/tickets/*` | TicketsPage + nested | Tickets | ACTIVE |
| `/hub/*` | Settings Pages | Admin | ACTIVE |
| `/dashboard/external` | ExternalDashboardPage | External | ACTIVE |
| `/me/notifications` | NotificationPreferences | Core | ACTIVE |
| `/settings/permissions` | BuPermissionsPage | Admin | ACTIVE |
| `/settings/notifications` | SettingsNotifications | Admin | ACTIVE |

### 1.2 Rotas Legacy/Redirect

| Rota | Handler | Propósito | Status |
|------|---------|-----------|--------|
| `/p/assets/:code` | PublicAsset | QR codes públicos | ACTIVE |
| `/assets/:code` | PublicAssetRedirect | Redirect interno | ACTIVE |
| `/go/:entity/:id` | ResolveContextPage | Context resolver | ACTIVE |

### 1.3 Páginas Não Linkadas no Menu

| Página | Observação | Status |
|--------|------------|--------|
| NotFound | Acessível via 404 | ACTIVE |
| LegacyAssetRedirect | Backward compat | LEGACY |

---

## 2. Componentes

### 2.1 Componentes Potencialmente Não Utilizados

| Arquivo | Tipo | Problema | Ação |
|---------|------|----------|------|
| `src/components/CityAutocomplete.tsx` | Utility | Usado apenas em profile | LEGACY |
| `src/components/NavLink.tsx` | Wrapper | Sistema usa NavLink direto | SUSPECT |
| `src/components/CopyLinkButton.tsx` | Utility | Sem uso detectado | SUSPECT |

### 2.2 Componentes UI Shadcn Não Utilizados

| Componente | Status | Ação |
|------------|--------|------|
| `pagination.tsx` | SUSPECT | Sem paginação server-side |
| `input-otp.tsx` | SUSPECT | Sem OTP implementado |
| `carousel.tsx` | SUSPECT | Sem carrosséis na UI |
| `menubar.tsx` | SUSPECT | Não detectado em uso |

### 2.3 Componentes Ativos (Críticos)

| Componente | Uso | Status |
|------------|-----|--------|
| ErrorBoundary | App.tsx wrapper | ACTIVE |
| ReportProblemDialog | NotFound page | ACTIVE |
| LoadingState | Multiple pages | ACTIVE |
| HubLayout | Layout principal | ACTIVE |
| SettingsLayout | Admin pages | ACTIVE |

---

## 3. Hooks

### 3.1 Hooks Potencialmente Não Utilizados

| Hook | Arquivo | Problema | Status |
|------|---------|----------|--------|
| `useUrlState` | `src/hooks/useUrlState.ts` | Migrado para shared/url | LEGACY |

### 3.2 Hooks Legacy (Wrappers)

| Hook | Arquivo | Observação | Status |
|------|---------|------------|--------|
| `useNotifications` | `src/hooks/useNotifications.ts` | Wrapper para useNotificationCenter | LEGACY |
| `useUserProfile` | `src/hooks/useSharedData.ts` | Duplicado em módulos | SUSPECT |
| `useProfilesList` | `src/hooks/useSharedData.ts` | Duplicado em assets/hooks | SUSPECT |

### 3.3 Hooks Ativos (Críticos)

| Hook | Uso | Status |
|------|-----|--------|
| `useAuth` | Autenticação global | ACTIVE |
| `useIdentity` | Identity convention | ACTIVE |
| `usePermissions` | RBAC | ACTIVE |
| `usePageTitle` | SEO | ACTIVE |
| `useGreeting` | Home dashboard | ACTIVE |
| `useBuScope` | BU-scoped client | ACTIVE |
| `useNotificationCenter` | Sistema de notificações | ACTIVE |
| `useGlobalSearch` | Busca global | ACTIVE |
| `useTeamManagement` | Gestão de times | ACTIVE |
| `useCultureMessage` | Mensagem de cultura | ACTIVE |
| `useHomeDashboard` | Dashboard home | ACTIVE |
| `useHomeData` | Dados do home | ACTIVE |
| `useHubBranding` | Branding dinâmico | ACTIVE |
| `usePublicProfile` | Perfil público | ACTIVE |

---

## 4. Contexts e Providers

### 4.1 Contexts Ativos

| Context | Arquivo | Status |
|---------|---------|--------|
| `BuContext` | `src/contexts/BuContext.tsx` | ACTIVE |
| `ModuleContext` | `src/contexts/ModuleContext.tsx` | ACTIVE |
| `AuthProvider` | `src/hooks/useAuth.tsx` | ACTIVE |
| `VicProvider` | `src/modules/vic/index.ts` | ACTIVE |

### 4.2 Providers Hierarquia (App.tsx)

```
QueryClientProvider
└── TooltipProvider
    └── BrowserRouter
        └── AuthProvider
            └── BuProvider
                └── ModuleProvider
                    └── VicProvider
                        └── ErrorBoundary
                            └── Routes
```

---

## 5. Queries e Padrões

### 5.1 QueryKeys Centralizados

✅ O sistema usa `src/lib/queryKeys.ts` para centralizar query keys.

### 5.2 Padrões Problemáticos Encontrados

| Padrão | Localização | Problema | Ação |
|--------|-------------|----------|------|
| `useCyclesList` | `useSharedData.ts` | queryKey inline `['cycles-list']` | Migrar para queryKeys |

### 5.3 Validação de Padrões

| Validação | Status |
|-----------|--------|
| BU-scoped queries | ✅ Maioria usa `useBuScopedSupabase` |
| Identity convention | ✅ Migrado para `useIdentity` |
| Select específico vs `*` | ⚠️ Alguns hooks ainda usam `select('*')` |

---

## 6. Módulos

### 6.1 Estrutura de Módulos

| Módulo | Path | Status |
|--------|------|--------|
| assets | `src/modules/assets/` | ACTIVE |
| automations | `src/modules/automations/` | ACTIVE |
| bu | `src/modules/bu/` | ACTIVE |
| external | `src/modules/external/` | ACTIVE |
| home | `src/modules/home/` | ACTIVE |
| integrations | `src/modules/integrations/` | ACTIVE |
| kpis | `src/modules/kpis/` | ACTIVE |
| okrs | `src/modules/okrs/` | ACTIVE |
| permissions | `src/modules/permissions/` | ACTIVE |
| settings | `src/modules/settings/` | ACTIVE |
| teams | `src/modules/teams/` | ACTIVE |
| tickets | `src/modules/tickets/` | ACTIVE |
| vic | `src/modules/vic/` | ACTIVE |

### 6.2 Módulos com Mais Complexidade

| Módulo | Componentes | Hooks | Pages |
|--------|-------------|-------|-------|
| OKRs | 30+ | 15+ | 7 |
| Assets | 25+ | 10+ | 6 |
| Tickets | 15+ | 8+ | 4 |

---

## 7. Recomendações

### Alta Prioridade (Wave 1)
1. ✅ QueryKeys já centralizados
2. ⚠️ Remover hooks duplicados em `useSharedData.ts`
3. ⚠️ Marcar `CopyLinkButton`, `NavLink` como deprecated

### Média Prioridade (Wave 2)
1. Remover componentes shadcn não utilizados
2. Consolidar `useNotifications` → `useNotificationCenter`
3. Remover `useUrlState` se migração completa

### Baixa Prioridade (Wave 3)
1. Refatorar padrões de select('*') para campos específicos
2. Implementar paginação server-side onde falta

---

## Anexo: Scripts de Auditoria Existentes

O projeto já possui scripts de auditoria:

- `scripts/audit-bu-scope.ts` - Valida uso de `bu_id`
- `scripts/audit-useBuScopedSupabase.ts` - Valida uso do client BU-scoped
- `scripts/audit-permission-keys.ts` - Valida chaves de permissão
- `scripts/audit-rbac.ts` - Valida padrões RBAC
- `scripts/audit-identity-usage.ts` - Valida convenção de identity
- `scripts/audit-querykeys.ts` - Valida query keys
- `scripts/check-query-keys.sh` - Lint gate para query keys
- `scripts/check-identity-convention.sh` - Lint gate para identity
