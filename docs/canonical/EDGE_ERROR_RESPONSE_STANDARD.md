# Edge Functions — Error Response Standard

> Convenção canônica para respostas de erro em todas as edge functions.

## Regra de Ouro

**Sucessos**: cada função define seu próprio formato (compatibilidade com clients legados).

**Erros**: SEMPRE usar os helpers de `_shared/response.ts`:

| Cenário | Helper |
|---------|--------|
| 400 — Campo obrigatório ausente | `badRequestResponse("msg", "MISSING_REQUIRED_FIELD")` |
| 400 — Validação falhou | `errorResponse("msg", 400, "VALIDATION_ERROR", details)` |
| 401 — Sem auth | `unauthorizedResponse()` |
| 403 — Sem permissão | `forbiddenResponse()` |
| 404 — Não encontrado | `notFoundResponse("Resource not found")` |
| 409 — Conflito | `conflictResponse("msg")` |
| 429 — Rate limit | `rateLimitedResponse("msg", retryAfterSec)` |
| 500 — Erro interno | `internalErrorResponse(err.message)` |
| 502 — Upstream falhou (Google/OpenAI) | `errorResponse("msg", 502, "UPSTREAM_ERROR")` |
| 503 — Indisponível | `serviceUnavailableResponse("msg", retryAfterSec)` |

## Formato de erro padronizado

```json
{
  "success": false,
  "error": {
    "message": "...",
    "code": "ERROR_CODE",
    "details": { ... }
  },
  "requestId": "..."
}
```

## Funções já migradas (referência)

- ✅ `search-address` (v2)
- ✅ `search-cities` (v2)
- ✅ `get-place-details` (v2)
- ✅ `health-check` (já usava `healthResponse`)

## Funções pendentes (migração futura)

As funções abaixo ainda retornam `JSON.stringify({ error })` cru. **Não migrar sem testar contratos** — alguns clients dependem do shape exato:

- `get-public-asset`
- `process-agent-document`
- `cron-dispatcher`
- `process-notification-outbox`
- `evaluate-notification-health`
- `auth-email-hook` (Supabase exige formato específico)
- `get-tcr`
- `okr-org-health-review`
- Demais funções de IA/sumarização (24 no total)

## Quando NÃO migrar

- `auth-email-hook`: contrato fixado pelo Supabase Auth
- Funções consumidas por webhooks externos com schema rígido
- Funções com `verify_jwt = false` chamadas por serviços que esperam erro flat
