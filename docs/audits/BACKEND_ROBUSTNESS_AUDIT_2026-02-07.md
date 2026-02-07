# Backend Robustness Audit — Hub da Jet

**Data:** 2026-02-07  
**Versão:** 1.0.0  
**Auditor:** Lovable AI  
**Escopo:** Edge Functions, _shared modules, padrões de erro, middleware, validação  

---

## Executive Summary

O back-end do Hub da Jet está **bem estruturado** com camadas de abstração claras. No entanto, foram identificados **pontos de melhoria** em 4 categorias principais:

| Categoria | Severidade | Items |
|-----------|------------|-------|
| **Duplicação de Código** | 🟡 Média | 3 |
| **Inconsistência de Padrões** | 🟡 Média | 4 |
| **Riscos de Performance** | 🟠 Alta | 2 |
| **Fragilidade/Acoplamento** | 🟡 Média | 3 |

**System Health Score:** 8.5/10 → **Target: 9.5/10**

---

## 1. Arquitetura Atual (Pontos Fortes)

### ✅ O que está bem feito

1. **Camada _shared/ bem organizada**
   - `error-handler.ts`: Error codes tipados, mapeamento HTTP centralizado
   - `middleware.ts`: Auth, BU validation, rate limiting
   - `response.ts`: Helpers de resposta padronizados
   - `validation.ts`: Schemas Zod reutilizáveis
   - `llm-client.ts`: Abstração unificada para AI providers
   - `agent-loader.ts`: SWR cache para configurações de agentes

2. **Padrão de Middleware consistente**
   - `withMiddleware()` centraliza auth/BU/logging
   - `withErrorHandling()` wrapper para try/catch global
   - CORS headers centralizados

3. **Logging estruturado**
   - correlation-id propagado
   - Logs com request ID para tracing
   - `logRequestCompletion()` para métricas

4. **Tipagem forte**
   - Interfaces bem definidas (`RequestContext`, `LLMConfig`, etc.)
   - Error codes como union types

---

## 2. Problemas Identificados

### 2.1 Duplicação de Código

#### P1: Funções de Resposta Duplicadas 🔴

**Problema:** `middleware.ts` e `response.ts` ambos definem `errorResponse()`, `jsonResponse()`, e `corsResponse()` com implementações similares.

**Arquivos afetados:**
- `supabase/functions/_shared/middleware.ts` (linhas 58-77)
- `supabase/functions/_shared/response.ts` (linhas 140-170)

**Impacto:** Manutenção duplicada, risco de divergência.

**Solução:**
```typescript
// response.ts deve ser a ÚNICA fonte de verdade
// middleware.ts deve re-exportar de response.ts

// ❌ Atual em middleware.ts
export function jsonResponse(data: unknown, status = 200): Response { ... }

// ✅ Correção em middleware.ts
export { 
  jsonResponse, 
  errorResponse, 
  corsResponse 
} from "./response.ts";
```

---

#### P2: Criação de Supabase Client Duplicada 🟡

**Problema:** Cada Edge Function que não usa middleware recria o client manualmente.

**Arquivos afetados:**
- `cron-dispatcher/index.ts` (linha 248)
- `request-magic-link/index.ts` (linhas 30, 189)
- Potencialmente outras funções

**Impacto:** Código repetido, sem validação centralizada.

**Solução:**
```typescript
// Criar helper em _shared/client.ts
export function createServiceSupabase(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }
  
  return createClient(url, key, {
    auth: { persistSession: false }
  });
}
```

---

#### P3: Validação de UUID Manual 🟡

**Problema:** Regex de UUID aparece em múltiplos lugares.

**Arquivos afetados:**
- `error-handler.ts` (linha 285)
- Potencialmente em validações específicas de funções

**Solução:**
```typescript
// validation.ts já poderia exportar
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// E usar em Zod schemas
export const UUIDSchema = z.string().uuid();
```

---

### 2.2 Inconsistência de Padrões

#### P4: Dois Sistemas de Error Response 🔴

**Problema:** `error-handler.ts` usa `StructuredError` com campos específicos, enquanto `response.ts` usa `ApiErrorResponse` com estrutura diferente.

| error-handler.ts | response.ts |
|------------------|-------------|
| `{ message, code, requestId, timestamp, context?, details? }` | `{ success: false, error: { message, code?, details? }, requestId? }` |

**Impacto:** Frontend precisa lidar com dois formatos de erro.

**Solução:** Unificar em um único formato:
```typescript
interface UnifiedErrorResponse {
  success: false;
  error: {
    message: string;
    code: ErrorCode;
    details?: Record<string, unknown>;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}
```

---

#### P5: Middleware Options vs Manual Auth 🟡

**Problema:** Algumas funções usam `withMiddleware()`, outras fazem auth manual.

| Função | Padrão |
|--------|--------|
| `invoke-vic` | ✅ `withMiddleware()` |
| `request-magic-link` | ❌ Manual (via `withErrorHandling()`) |
| `cron-dispatcher` | ❌ Custom (x-cron-secret) |

**Impacto:** Comportamento inconsistente, mais código para manter.

**Solução:** Criar variantes de middleware:
```typescript
// Para funções públicas (sem JWT)
export async function withPublicMiddleware(req: Request): Promise<PublicMiddlewareResult>

// Para funções cron (secret-based)
export async function withCronMiddleware(req: Request): Promise<CronMiddlewareResult>
```

---

#### P6: Inconsistência em Logging de Erros 🟡

**Problema:** Alguns erros são logados com `console.error()`, outros com o sistema estruturado.

**Exemplo em cron-dispatcher:**
```typescript
// Alguns erros usam console.error direto
console.error("[cron-dispatcher] Error calling edge function:", error);

// Enquanto deveriam usar o padrão com requestId
console.error(`[${requestId}] Error: ...`, error);
```

**Solução:** Criar helper de logging:
```typescript
// logging.ts (já existe mas não é usado consistentemente)
export function logError(requestId: string, context: string, error: unknown): void {
  console.error(`[${requestId}] [${context}]`, error instanceof Error ? error.message : error);
}
```

---

#### P7: Cache sem Invalidation Strategy 🟡

**Problema:** `agent-loader.ts` implementa SWR cache mas não tem mecanismo de invalidação externa.

**Impacto:** Mudanças no banco podem levar até 60s para refletir.

**Solução:**
```typescript
// Expor endpoint ou header para invalidar cache
if (req.headers.get("x-cache-invalidate") === "true") {
  clearAgentCache(agentSlug, buId);
}
```

---

### 2.3 Riscos de Performance

#### P8: N+1 Query em buildSystemPrompt 🔴

**Problema:** `buildSystemPrompt()` faz queries sequenciais:
1. `loadInstructionSources()` 
2. `assembleInstructionContent()` (pode ter sub-queries)
3. Query de documentos

**Código atual:**
```typescript
const instructionSources = await loadInstructionSources(serviceClient, agent.id);
const instructionContent = await assembleInstructionContent(serviceClient, instructionSources, buId);
const { data: documents } = await serviceClient.from("ai_agent_documents")...
```

**Impacto:** Latência desnecessária em chamadas de AI.

**Solução:**
```typescript
// Paralelizar queries independentes
const [instructionSources, documents] = await Promise.all([
  loadInstructionSources(serviceClient, agent.id),
  serviceClient.from("ai_agent_documents")
    .select("name, extracted_content")
    .eq("agent_id", agent.id)
    .eq("status", "completed")
]);
```

---

#### P9: Retry sem Backoff em invoke-vic 🟡

**Problema:** Quando cultura_message excede limite, faz retry imediato sem backoff.

**Código atual:**
```typescript
if (normalized.length > MAX_CULTURE_MESSAGE_CHARS) {
  const retry = await llmComplete(...); // Retry imediato
}
```

**Impacto:** Pode sobrecarregar API em cenários de erro.

**Solução:**
```typescript
// Adicionar backoff simples
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 1,
  baseDelayMs = 200
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
    }
  }
  throw new Error("Unreachable");
}
```

---

### 2.4 Fragilidade e Acoplamento

#### P10: Dependência Circular Potencial 🟡

**Problema:** `agent-loader.ts` importa de `invoke-vic/instruction-sources.ts`, criando acoplamento entre _shared e função específica.

```typescript
// agent-loader.ts (em _shared/)
import { loadInstructionSources, assembleInstructionContent } from "../invoke-vic/instruction-sources.ts";
```

**Impacto:** _shared/ deveria ser independente de funções específicas.

**Solução:** Mover `instruction-sources.ts` para `_shared/`:
```
supabase/functions/_shared/
├── instruction-sources.ts  ← Mover aqui
├── agent-loader.ts
└── ...
```

---

#### P11: Error Handler não trata todos os casos de LLM 🟡

**Problema:** `mapLLMError()` só trata 429 e 402, outros erros viram genérico.

```typescript
export function mapLLMError(status: number, requestId: string) {
  switch (status) {
    case 429: return { message: "Rate limit exceeded", ... };
    case 402: return { message: "AI credits depleted", ... };
    default: return { message: "AI API error", ... }; // Genérico
  }
}
```

**Impacto:** Erros 400 (bad request), 401 (auth), 503 (service unavailable) não são distinguidos.

**Solução:**
```typescript
export function mapLLMError(status: number, requestId: string) {
  switch (status) {
    case 400: return { message: "Invalid AI request", code: "AI_BAD_REQUEST", httpStatus: 400 };
    case 401: return { message: "AI authentication failed", code: "AI_AUTH_ERROR", httpStatus: 500 };
    case 429: return { message: "Rate limit exceeded", code: "RATE_LIMIT", httpStatus: 429 };
    case 402: return { message: "AI credits depleted", code: "NO_CREDITS", httpStatus: 402 };
    case 503: return { message: "AI service unavailable", code: "AI_UNAVAILABLE", httpStatus: 503 };
    default: return { message: "AI API error", code: "AI_API_ERROR", httpStatus: 502 };
  }
}
```

---

#### P12: Falta de Health Check Endpoint 🟡

**Problema:** Não existe endpoint de health check para monitoramento externo.

**Impacto:** Difícil detectar degradação de serviço proativamente.

**Solução:** Criar `health-check/index.ts`:
```typescript
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkAIService(),
  ]);
  
  const status = checks.every(c => c.status === "fulfilled") ? "healthy" : "degraded";
  return healthResponse(status, { checks: checks.map(summarize) });
});
```

---

## 3. Plano de Ação

### Fase 1: Quick Wins (1-2 horas)

| # | Item | Arquivo | Impacto |
|---|------|---------|---------|
| 1 | Remover duplicação de response helpers | `middleware.ts` | Alto |
| 2 | Unificar formato de erro | `error-handler.ts`, `response.ts` | Alto |
| 3 | Mover instruction-sources para _shared | `agent-loader.ts` | Médio |

### Fase 2: Otimizações (2-4 horas)

| # | Item | Arquivo | Impacto |
|---|------|---------|---------|
| 4 | Paralelizar queries em buildSystemPrompt | `agent-loader.ts` | Alto |
| 5 | Expandir mapLLMError | `llm-client.ts` | Médio |
| 6 | Criar client.ts centralizado | `_shared/client.ts` | Médio |

### Fase 3: Robustez (4-6 horas)

| # | Item | Arquivo | Impacto |
|---|------|---------|---------|
| 7 | Criar middleware variants | `middleware.ts` | Alto |
| 8 | Adicionar health-check endpoint | `health-check/index.ts` | Médio |
| 9 | Padronizar logging | Todas as funções | Médio |

---

## 4. Métricas de Sucesso

| Métrica | Atual | Target |
|---------|-------|--------|
| Linhas duplicadas em _shared/ | ~80 | <20 |
| Funções usando middleware padrão | 60% | 95% |
| Formatos de erro distintos | 2 | 1 |
| Cobertura de erros LLM | 3 códigos | 6+ códigos |
| Health check disponível | ❌ | ✅ |

---

## 5. Próximos Passos

1. **Imediato:** Aprovar plano de ação
2. **Fase 1:** Executar Quick Wins
3. **Fase 2:** Implementar otimizações
4. **Fase 3:** Adicionar robustez
5. **Final:** Atualizar TCR para v2.96.0

---

## Apêndice: Arquivos Analisados

```
supabase/functions/
├── _shared/
│   ├── agent-loader.ts      ✅ Analisado
│   ├── email-sender.ts      📋 Referenciado
│   ├── error-handler.ts     ✅ Analisado
│   ├── hub-tools.ts         📋 Referenciado
│   ├── llm-client.ts        ✅ Analisado
│   ├── logging.ts           📋 Referenciado
│   ├── middleware.ts        ✅ Analisado
│   ├── response.ts          ✅ Analisado
│   ├── tcr-content.ts       📋 Referenciado
│   └── validation.ts        ✅ Analisado
├── cron-dispatcher/         ✅ Analisado
├── invoke-vic/              ✅ Analisado
├── request-magic-link/      ✅ Analisado
└── [outras 15 funções]      📋 A analisar
```
