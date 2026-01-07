# Regras de Uso do Cliente Supabase com Escopo de BU

## Objetivo

Garantir que TODAS as operações Supabase no frontend injetem o header `x-current-bu-id` para:

1. Consistência com a seleção de BU na sessão do usuário
2. Ativação das políticas RLS que dependem da função `current_bu_id()`
3. Prevenção de vazamentos de dados cross-BU
4. Funcionamento correto dos triggers `enforce_bu_scope`

## Regra Principal

> **PROIBIDO usar o cliente global `supabase` diretamente para operações de dados.**

### ❌ INCORRETO
```typescript
import { supabase } from "@/integrations/supabase/client";

// Em qualquer lugar do componente/hook:
const { data } = await supabase.from("teams").select("*");
```

### ✅ CORRETO
```typescript
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";

function MyComponent() {
  const supabase = useBuScopedSupabase();
  
  // Agora todas as operações incluem o header x-current-bu-id
  const { data } = await supabase.from("teams").select("*");
}
```

## Exceções Autorizadas

Os seguintes arquivos podem usar o cliente global `supabase`:

| Arquivo | Justificativa |
|---------|---------------|
| `src/hooks/useAuth.tsx` | Autenticação (magic link, login) não requer escopo de BU |
| `src/modules/bu/hooks/useBuData.ts` | Carrega lista de BUs do usuário antes de ter contexto |
| `src/integrations/supabase/client.ts` | Definição do singleton |
| `src/integrations/supabase/useBuScopedSupabase.ts` | Wrapper do cliente |
| Canais Realtime (`supabase.channel`) | Realtime não suporta headers customizados |

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

## Verificação

Execute os scripts de auditoria para verificar conformidade:

```bash
# Verifica uso do cliente Supabase
npx tsx scripts/audit-supabase-client.ts

# Verifica escopo de BU geral
npx tsx scripts/audit-bu-scope.ts
```

## Consequências do Não Cumprimento

1. **Vazamento de dados**: Usuário pode ver/modificar dados de outra BU
2. **Erros de RLS**: Policies que usam `current_bu_id()` retornarão NULL
3. **Triggers falham**: `enforce_bu_scope` não consegue obter o bu_id
4. **Inconsistência**: Dados criados sem bu_id correto

## Padrão para Arquivos Não-React

Para funções utilitárias fora de componentes React que precisam acessar Supabase:

```typescript
// Opção 1: Receber supabase por injeção de dependência
async function fetchTeamMembers(supabase: SupabaseClient, teamId: string) {
  const { data } = await supabase.from("profiles").select("*").eq("team_id", teamId);
  return data;
}

// Opção 2: Usar factory quando o buId estiver disponível
import { createBuScopedClient } from "@/integrations/supabase/useBuScopedSupabase";

async function backgroundTask(buId: string) {
  const supabase = createBuScopedClient(buId);
  // ...
}
```

## Histórico

- **v1.0** (2026-01-07): Documento inicial criado como parte do DT-001
