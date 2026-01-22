# Regras de Uso do Cliente Supabase com Escopo de BU

**Versão**: 3.3.0  
**Última atualização**: 2026-01-07

## Visão Geral

O Hub da Jet usa um sistema multi-tenant onde cada Business Unit (BU) possui seus próprios dados isolados. Para garantir que as operações Supabase sempre incluam o contexto de BU correto, **todo acesso a tabelas operacionais deve usar o cliente com escopo**.

## Regra Principal

> **PROIBIDO usar o cliente global `supabase` para acessar tabelas operacionais.**

### ❌ INCORRETO
```typescript
import { supabase } from "@/integrations/supabase/client";

// Em qualquer lugar do componente/hook:
const { data } = await supabase.from("tickets").select("*"); // ❌ PROIBIDO
```

### ✅ CORRETO
```typescript
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";

function MyComponent() {
  const supabase = useBuScopedSupabase();
  
  // Agora todas as operações incluem o header X-Current-Bu-Id
  const { data } = await supabase.from("tickets").select("*"); // ✅ CORRETO
}
```

## Tabelas Operacionais (DENYLIST)

Ver lista completa em: `src/integrations/supabase/operationalTables.ts`

Principais categorias:
- **OKRs**: `okr_*`
- **KPIs**: `kpis`, `kpi_values`, `kpi_targets`
- **Teams**: `teams`, `squads`, `squad_members`
- **Assets**: `asset_*`
- **Tickets**: `tickets`, `ticket_*`
- **Notifications**: `notifications`, `user_notification_preferences`
- **Config**: `bu_*`, `cycles`

## Exceções Autorizadas

| Arquivo | Justificativa |
|---------|---------------|
| `src/hooks/useAuth.tsx` | Autenticação ocorre ANTES de haver BU selecionada |
| `src/components/notifications/NotificationCenter.tsx` | Realtime não suporta headers customizados |
| `src/modules/bu/hooks/useBuData.ts` | `checkEmailDomainAllowed` valida domínio antes de BU |
| `src/integrations/supabase/client.ts` | Definição do singleton |
| `src/integrations/supabase/useBuScopedSupabase.ts` | Wrapper do cliente |

## Operações Afetadas

Todas as operações abaixo DEVEM usar `useBuScopedSupabase()`:

- `supabase.from("table").select()`
- `supabase.from("table").insert()`
- `supabase.from("table").update()`
- `supabase.from("table").upsert()`
- `supabase.from("table").delete()`
- `supabase.rpc("function_name")`
- `supabase.functions.invoke("edge-function")`
- `supabase.storage` (quando aplicável)

## Operações Permitidas com Cliente Global

Apenas para exceções documentadas:
- `supabase.auth.*` (autenticação)
- `supabase.channel()` (Realtime)
- Consultas a tabelas de infraestrutura (`profiles`, `user_roles`, `bu_units`)

## Verificação Automática

Execute o script de auditoria para verificar conformidade:

```bash
npx tsx scripts/audit-useBuScopedSupabase.ts
```

O script:
1. Lista todos os usos de `supabase.from()` no projeto
2. Verifica se tabelas operacionais usam cliente global
3. Valida que exceções estão na lista permitida
4. Retorna PASS/FAIL

## Padrão para Arquivos Não-React

Para funções utilitárias fora de componentes React:

```typescript
// ✅ Opção 1: Receber cliente por injeção
export async function processData(supabase: SupabaseClient, data: any) {
  const { data: result } = await supabase.from("table").insert(data);
  return result;
}

// ✅ Opção 2: Usar factory com buId explícito
import { createBuScopedClient } from "@/integrations/supabase/useBuScopedSupabase";

export async function processData(buId: string, data: any) {
  const supabase = createBuScopedClient(buId);
  const { data: result } = await supabase.from("table").insert(data);
  return result;
}
```

## Consequências de Violação

- **Desenvolvimento**: Script de auditoria falha (exit code 1)
- **Runtime (dev)**: Erro lançado ao acessar tabela operacional via global
- **Runtime (prod)**: Warning logado, operação pode falhar por RLS

---

Ver também:
- `docs/BU_SCOPED_MIGRATION_REPORT.md` - Relatório completo da migração
- `src/integrations/supabase/operationalTables.ts` - Lista de tabelas
