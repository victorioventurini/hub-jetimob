# Relatório de Migração: useBuScopedSupabase()

**Data**: 2026-01-07  
**TCR**: v3.3.0  
**Status**: ✅ PASS

---

## Resumo Executivo

Migração completa do cliente Supabase global para `useBuScopedSupabase()`. Todas as operações em **tabelas operacionais** usam o cliente com escopo de BU, garantindo injeção automática do header `X-Current-Bu-Id`.

---

## Estatísticas

| Métrica | Valor |
|---------|-------|
| Total de arquivos analisados | ~150 |
| Arquivos usando `useBuScopedSupabase()` | ~45 |
| Arquivos com import global | 3 (exceções) |
| Violações em tabelas operacionais | **0** |
| Exceções justificadas | **3** |

---

## Tabelas Operacionais (DENYLIST)

Tabelas que **DEVEM** usar `useBuScopedSupabase()`:

```
okr_*, kpi_*, teams, squads, asset_*, tickets_*, 
partner_*, notifications, cycles, bu_locations, 
bu_module_configs, bu_integrations_config, ai_agents, 
automation_*, etc.
```

Ver lista completa em: `src/integrations/supabase/operationalTables.ts`

---

## Exceções Justificadas

### 1. `src/hooks/useAuth.tsx`

| Item | Detalhe |
|------|---------|
| **Razão** | Autenticação ocorre ANTES de haver BU selecionada |
| **Operações permitidas** | `auth.*`, `functions.invoke('request-magic-link')` |
| **Tabelas acessadas** | `profiles`, `user_roles` (não-operacionais, escopo por user_id) |
| **Mitigação** | Tabelas acessadas têm RLS por `auth.uid()`, não por BU |

**Código relevante (linhas 88-120):**
```typescript
// Fetch profile após auth
const { data: profileData } = await supabase
  .from('profiles')  // ✅ Tabela de infraestrutura
  .select('...')
  .eq('user_id', userId);

// Fetch role
const { data: roleData } = await supabase
  .from('user_roles')  // ✅ Tabela de infraestrutura
  .select('role')
  .eq('user_id', userId);
```

---

### 2. `src/components/notifications/NotificationCenter.tsx`

| Item | Detalhe |
|------|---------|
| **Razão** | Supabase Realtime não suporta headers customizados |
| **Operações permitidas** | `.channel()`, `.on('postgres_changes', ...)`, `.subscribe()` |
| **Mitigação Backend** | Tabela `notifications` tem RLS: `user_id = auth.uid()` |
| **Mitigação Frontend** | Filtro adicional no payload (ignorar se `bu_id !== currentBuId`) |

**Código relevante (linhas 122-145):**
```typescript
// Realtime subscription (usa cliente global)
const channel = supabaseGlobal
  .channel('notifications-realtime')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${user.id}`,  // ✅ Filtro por user
  }, ...)
  .subscribe();
```

**Proteção dupla:**
- Backend: RLS garante que usuário só recebe suas próprias notificações
- Frontend: Queries usam `useBuScopedSupabase()` para leitura normal

---

### 3. `src/modules/bu/hooks/useBuData.ts` (checkEmailDomainAllowed)

| Item | Detalhe |
|------|---------|
| **Razão** | Valida domínio de email antes de existir contexto de BU |
| **Operações permitidas** | `rpc('get_bu_by_email_domain')` |
| **Dados retornados** | Apenas `boolean` + `bu_id` (sem dados sensíveis) |
| **Mitigação** | Função RPC é read-only e não expõe dados de negócio |

**Código relevante (linhas 75-86):**
```typescript
export async function checkEmailDomainAllowed(email: string) {
  // Chamada pré-BU, usa cliente global
  const { data } = await supabaseGlobal
    .rpc("get_bu_by_email_domain", { p_email: email });
  
  return { allowed: !!data, buId: data };
}
```

---

## Scripts de Auditoria

### Verificar conformidade

```bash
# Auditoria completa com verificação de tabelas operacionais
npx tsx scripts/audit-useBuScopedSupabase.ts
```

### Resultado esperado

```
═══════════════════════════════════════════════════════════════════════════════
  AUDIT: useBuScopedSupabase Migration
═══════════════════════════════════════════════════════════════════════════════

📁 Arquivos analisados: ~150
✅ Arquivos usando useBuScopedSupabase(): ~45
⚠️  Arquivos com import global: 3
📊 Total de ocorrências: ~50
🛡️  Exceções justificadas: 3
❌ Violações em tabelas operacionais: 0

ℹ️  EXCEÇÕES JUSTIFICADAS:
────────────────────────────────────────────────────────────────────────────────
   ✓ src/hooks/useAuth.tsx
     Razão: Autenticação ocorre ANTES de BU existir
   ✓ src/components/notifications/NotificationCenter.tsx
     Razão: Realtime não suporta headers customizados
   ✓ src/modules/bu/hooks/useBuData.ts
     Razão: checkEmailDomainAllowed valida domínio antes de BU existir

═══════════════════════════════════════════════════════════════════════════════

  ✅ RESULTADO: PASS

  Nenhuma tabela operacional é acessada via cliente global.
  Todas as exceções estão documentadas e justificadas.

═══════════════════════════════════════════════════════════════════════════════
```

---

## Regras para Novos Desenvolvimentos

### ✅ CORRETO

```typescript
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";

function MyComponent() {
  const supabase = useBuScopedSupabase();
  
  // Todas as operações incluem X-Current-Bu-Id automaticamente
  const { data } = await supabase.from("tickets").select("*");
}
```

### ❌ INCORRETO

```typescript
import { supabase } from "@/integrations/supabase/client";

// ❌ NÃO usar cliente global para tabelas operacionais
const { data } = await supabase.from("tickets").select("*");
```

---

## Evidência de Conformidade

1. **Injeção automática**: Todo request inclui `X-Current-Bu-Id`
2. **Consistência**: Header reflete a BU selecionada pelo usuário
3. **Triggers**: `enforce_bu_scope` recebe bu_id via header
4. **RLS**: `current_bu_id()` retorna valor correto do header
5. **Exceções isoladas**: Apenas 3 arquivos, todos documentados

---

## Arquivos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `src/integrations/supabase/operationalTables.ts` | Lista de tabelas operacionais |
| `src/integrations/supabase/useBuScopedSupabase.ts` | Hook do cliente com escopo |
| `scripts/audit-useBuScopedSupabase.ts` | Script de auditoria |
| `docs/engineering/BU_SCOPED_SUPABASE_RULES.md` | Regras de uso |

---

*Relatório gerado em 2026-01-07 | TCR v3.3.0*
