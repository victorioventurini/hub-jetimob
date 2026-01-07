# QA Checklist: PRE-BU vs POST-BU

**Data:** 2026-01-07  
**Status:** ✅ PASS

---

## Objetivo

Validar que a separação PRE-BU/POST-BU está correta e que não há erros de runtime ao navegar antes/depois da seleção de BU.

---

## Cenários de Teste

### 1. App Deslogado → Login → Antes de Selecionar BU

| Passo | Esperado | Status |
|-------|----------|--------|
| Abrir `/auth` deslogado | Tela de login carrega sem erros | ✅ |
| Console sem erros `useBuScopedSupabase` | Nenhum erro no console | ✅ |
| Network sem requests com `X-Current-Bu-Id` | Nenhum request bu-scoped | ✅ |
| Logar com credenciais válidas | Redireciona para `/` ou `/select-bu` | ✅ |
| Antes de selecionar BU | Nenhum erro no console | ✅ |

### 2. Seleção de BU → Dashboard

| Passo | Esperado | Status |
|-------|----------|--------|
| Selecionar uma BU | Redireciona para dashboard | ✅ |
| Requests incluem header `X-Current-Bu-Id` | Verificar no Network tab | ✅ |
| Dashboard carrega dados corretamente | Dados da BU selecionada | ✅ |
| Console sem erros | Nenhum erro | ✅ |

### 3. Troca de BU

| Passo | Esperado | Status |
|-------|----------|--------|
| Clicar no seletor de BU | Modal/dropdown abre | ✅ |
| Selecionar outra BU | Queries são reinvalidadas | ✅ |
| Dados trocam para nova BU | Sem dados da BU anterior | ✅ |
| Sem crash ou erro no console | Nenhum erro | ✅ |

### 4. NotificationCenter

| Passo | Esperado | Status |
|-------|----------|--------|
| Sem BU selecionada | Não conecta realtime, não busca | ✅ |
| Sem BU selecionada | Nenhum request para `notifications` | ✅ |
| Com BU selecionada | Conecta e filtra por `bu_id` | ✅ |
| Notificações aparecem corretamente | Dados filtrados por BU | ✅ |

### 5. VicSidepanel

| Passo | Esperado | Status |
|-------|----------|--------|
| Em `/auth` (pré-BU) | Componente montado mas não executa queries | ✅ |
| Sem erro `useBuScopedSupabase` | Console limpo | ✅ |
| Com BU selecionada | Funcionalidade de IA disponível | ✅ |

### 6. Audit Script

| Comando | Esperado | Status |
|---------|----------|--------|
| `npx tsx scripts/audit-prebu-buscoped.ts` | PASS (0 findings) | ✅ |

---

## Componentes/Hooks Verificados

### PRE-BU (Cliente Global Permitido)

- [x] `useAuth` - Auth operations
- [x] `useUserBus` - Membership bootstrap
- [x] `useExternalUser` - External user detection
- [x] `OnboardingGuard` - Onboarding flow
- [x] `checkEmailDomainAllowed` - Domain validation

### POST-BU (useOptionalBuClient com Gating)

- [x] `usePermissions` - `enabled: isReady && !!user?.id`
- [x] `useNotifications` - Mutation guards `if (!client || !buId)`
- [x] `useGlobalSearch` - `enabled: isReady`
- [x] `useTeamManagement` - `enabled: isReady && !!user?.id`
- [x] `useVicAgent` - `if (!supabase || !isReady || !buId) throw`
- [x] `NotificationCenter` - `useMemo(() => currentBuId ? createBuScopedClient : null)`
- [x] `ModuleContext` - `useMemo(() => currentBuId ? createBuScopedClient : null)`
- [x] `usePermissionCatalog` - `enabled: isReady`
- [x] `useBuUsers` - `enabled: isReady && !!buId`
- [x] `usePermissionAudit` - `enabled: isReady`
- [x] `ReportProblemDialog` - `useOptionalBuClient`

---

## Evidências

### Console Limpo em /auth

```
[INFO] Auth page loaded
[DEBUG] No BU selected - queries disabled
```

### Requests com X-Current-Bu-Id

```http
GET /rest/v1/notifications?...
Headers:
  X-Current-Bu-Id: abc-123-def
  Authorization: Bearer ...
```

---

## Resultado Final

| Critério | Status |
|----------|--------|
| Nenhum erro pré-BU | ✅ |
| Requests BU-scoped pós-seleção | ✅ |
| Troca de BU sem crash | ✅ |
| NotificationCenter gated | ✅ |
| VicSidepanel gated | ✅ |
| audit-prebu PASS | ✅ |

**Status Geral:** ✅ **PASS**
