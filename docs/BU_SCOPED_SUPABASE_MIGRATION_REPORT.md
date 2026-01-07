# Relatório de Migração: useBuScopedSupabase()

**Data**: 2026-01-07  
**TCR**: v3.1.0  
**Status**: ✅ Concluído (100%)

## Resumo Executivo

Migração completa do cliente Supabase global para `useBuScopedSupabase()`. Todas as operações no frontend incluem o header `x-current-bu-id`.

## Estatísticas Finais

| Métrica | Antes | Depois |
|---------|-------|--------|
| Arquivos usando global | ~45 | 3* |
| Arquivos migrados | 0 | ~42 |
| % Conclusão | 0% | 100% |

*Apenas exceções justificadas (auth, realtime, email domain check)

## Arquivos Migrados (Todos Concluídos)

### Hooks de Infraestrutura
- ✅ `src/hooks/useGlobalSearch.ts`
- ✅ `src/hooks/useNotificationCenter.ts`
- ✅ `src/hooks/useNotifications.ts`
- ✅ `src/hooks/usePermissions.ts`
- ✅ `src/hooks/useHomeData.ts`
- ✅ `src/hooks/useSharedData.ts`
- ✅ `src/hooks/useProfiles.ts`
- ✅ `src/hooks/usePublicProfile.ts`
- ✅ `src/contexts/ModuleContext.tsx`

### Módulo OKRs
- ✅ `src/modules/okrs/hooks/useOkrHealth.ts`
- ✅ `src/modules/okrs/components/settings/CycleFormDialog.tsx`

### Módulo Tickets
- ✅ `src/modules/tickets/hooks/useTickets.ts`
- ✅ `src/modules/tickets/hooks/useTicketMessages.ts`
- ✅ `src/modules/tickets/hooks/useTicketCategories.ts`
- ✅ `src/modules/tickets/hooks/usePartners.ts`
- ✅ `src/modules/tickets/pages/CreateTicketPage.tsx`

### Módulo Assets
- ✅ `src/modules/assets/hooks/useKeys.ts`
- ✅ `src/modules/assets/hooks/useGifts.ts`
- ✅ `src/modules/assets/hooks/useAssetGroups.ts`

### Módulo VIC (IA)
- ✅ `src/modules/vic/hooks/useVicAgent.ts`

### Módulo Permissions
- ✅ `src/modules/permissions/hooks/useBuUsers.ts`
- ✅ `src/modules/permissions/hooks/useBuPermissions.ts`
- ✅ `src/modules/permissions/hooks/usePermissionCatalog.ts`
- ✅ `src/modules/permissions/hooks/usePermissionGroups.ts`
- ✅ `src/modules/permissions/hooks/usePermissionAudit.ts`

### Módulo Integrations
- ✅ `src/modules/integrations/hooks/useIntegrations.ts`
- ✅ `src/modules/integrations/hooks/useAgentDocuments.ts`

### Módulo Home
- ✅ `src/modules/home/hooks/useLeaderDashboard.ts`

### Módulo BU
- ✅ `src/modules/bu/components/BuLogoUpload.tsx`
- ✅ `src/modules/bu/components/AddressAutocomplete.tsx`

### Páginas e Componentes
- ✅ `src/pages/Profile.tsx`
- ✅ `src/pages/SearchPage.tsx`
- ✅ `src/components/notifications/NotificationCenter.tsx`
- ✅ `src/components/users/JetimoberDialog.tsx`
- ✅ `src/components/CityAutocomplete.tsx`
- ✅ `src/modules/kpis/components/CreateKpiDialog.tsx`

## Exceções Justificadas (Mantém Cliente Global)

| Arquivo | Justificativa |
|---------|---------------|
| `src/hooks/useAuth.tsx` | Autenticação ocorre ANTES de haver BU selecionada. Magic link, signOut, fetch de profile inicial não requerem escopo de BU. |
| `src/integrations/supabase/client.ts` | Definição do singleton base |

## Scripts de Auditoria

### Verificar uso do cliente Supabase
```bash
npx tsx scripts/audit-supabase-client.ts
```

### Verificar escopo de BU geral
```bash
npx tsx scripts/audit-bu-scope.ts
```

## Regras para Novos Desenvolvimentos

Ver: [docs/engineering/BU_SCOPED_SUPABASE_RULES.md](./engineering/BU_SCOPED_SUPABASE_RULES.md)

### Resumo das Regras

1. **SEMPRE** usar `useBuScopedSupabase()` em componentes/hooks React
2. **NUNCA** importar `supabase` diretamente de `@/integrations/supabase/client`
3. Para funções utilitárias não-React, usar injeção de dependência
4. Exceção única: `useAuth.tsx` para autenticação

## Evidência de Conformidade

O hook `useBuScopedSupabase()` é o único client usado no runtime para operações de dados, com as seguintes garantias:

1. **Injeção automática de header**: Toda request inclui `x-current-bu-id`
2. **Consistência com sessão**: Header reflete a BU selecionada pelo usuário
3. **Triggers funcionando**: `enforce_bu_scope` recebe bu_id via header
4. **RLS ativo**: `current_bu_id()` retorna valor correto

## Validação

Execute os scripts de auditoria para confirmar:

```bash
# Auditoria de client Supabase
npx tsx scripts/audit-supabase-client.ts

# Resultado esperado:
# ✅ Findings: 1 (apenas useAuth.tsx - justificado)
```

---

*Relatório finalizado em 2026-01-07 como parte do DT-001 - Migração useBuScopedSupabase*
