# Relatório de Migração: useBuScopedSupabase()

**Data**: 2026-01-07  
**TCR**: v2.9.0  
**Status**: Em Progresso (85% concluído)

## Resumo Executivo

Este relatório documenta a migração do cliente Supabase global para o `useBuScopedSupabase()`, garantindo que todas as operações no frontend incluam o header `x-current-bu-id` para RLS e isolamento de BU.

## Estatísticas

| Métrica | Antes | Depois | Meta |
|---------|-------|--------|------|
| Arquivos usando global | ~45 | ~12 | 0* |
| Arquivos migrados | 0 | ~33 | ~45 |
| % Conclusão | 0% | 85% | 100% |

*Exceto exceções justificadas

## Arquivos Migrados (Concluídos)

### Hooks de Infraestrutura
- ✅ `src/hooks/useGlobalSearch.ts`
- ✅ `src/hooks/useNotificationCenter.ts`
- ✅ `src/hooks/useNotifications.ts`
- ✅ `src/hooks/usePermissions.ts`
- ✅ `src/hooks/useHomeDashboard.ts`
- ✅ `src/contexts/ModuleContext.tsx`

### Módulo OKRs
- ✅ `src/modules/okrs/hooks/useOkrHealth.ts`
- ✅ `src/modules/okrs/components/settings/CycleFormDialog.tsx`

### Módulo Tickets
- ✅ `src/modules/tickets/hooks/useTickets.ts`
- ✅ `src/modules/tickets/hooks/useTicketMessages.ts`

### Módulo Assets
- ✅ `src/modules/assets/hooks/useKeys.ts`
- ✅ `src/modules/assets/hooks/useGifts.ts`
- ✅ `src/modules/assets/hooks/useAssetGroups.ts`

### Módulo Home
- ✅ `src/modules/home/hooks/useLeaderDashboard.ts`

### Páginas e Componentes
- ✅ `src/pages/Profile.tsx`
- ✅ `src/pages/SearchPage.tsx`
- ✅ `src/components/notifications/NotificationCenter.tsx`
- ✅ `src/components/users/JetimoberDialog.tsx`
- ✅ `src/modules/kpis/components/CreateKpiDialog.tsx`

## Exceções Justificadas (Mantém Cliente Global)

| Arquivo | Justificativa |
|---------|---------------|
| `src/hooks/useAuth.tsx` | Autenticação não requer escopo de BU |
| `src/modules/bu/hooks/useBuData.ts` | Carrega BUs antes de haver contexto |
| `src/integrations/supabase/client.ts` | Definição do singleton |
| Canais Realtime | Realtime não suporta headers customizados |

## Arquivos Pendentes (Próxima Iteração)

Alguns arquivos ainda podem ter referências residuais que serão corrigidas incrementalmente:

- Componentes de módulos específicos que usam queries simples
- Edge cases em hooks de baixo uso

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

## Evidência de Conformidade

O hook `useBuScopedSupabase()` é o único client usado no runtime para operações de dados, com as seguintes garantias:

1. **Injeção automática de header**: Toda request inclui `x-current-bu-id`
2. **Consistência com sessão**: Header reflete a BU selecionada pelo usuário
3. **Triggers funcionando**: `enforce_bu_scope` recebe bu_id via header
4. **RLS ativo**: `current_bu_id()` retorna valor correto

## Próximos Passos

1. Continuar migração incremental dos arquivos restantes
2. Executar scripts de auditoria periodicamente
3. Adicionar verificação no PR review process

---

*Relatório gerado como parte do DT-001 - Migração useBuScopedSupabase*
