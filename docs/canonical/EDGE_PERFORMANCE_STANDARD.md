# Edge Performance Standard

Padrões obrigatórios para Edge Functions do Hub que envolvam IA, agregações
ou qualquer operação > 500 ms. Estabelecido em **W2** do plano de performance.

---

## 1. Timing wrapper

Toda função que faz chamada externa (LLM, API, agregação multi-tabela) deve
envolver o handler em `withTiming` de `_shared/timing.ts`:

```ts
import { withTiming } from "../_shared/timing.ts";

const report = await withTiming(
  "qbr-executive-report",
  { model: cfg.model, agent: agent.slug, bu_id: buId, requestId },
  () => buildReport(),
);
```

Saída no console:

```
[timing] qbr-executive-report duration_ms=12345 model=google/gemini-2.5-pro agent=qbr-exec bu=... req=... status=ok
```

Esses logs são consumidos pela observabilidade (`function_edge_logs`).

## 2. Cache de prompts determinísticos

Em chamadas LLM com `temperature ≤ 0.3` e prompts repetidos no mesmo
cold start (ex.: validador metodológico chamado para cada KR), o
`llm-client.ts` aplica cache em memória com TTL de 5 minutos.

Como o cache vive na instância, ele é seguro para tenancy: a chave
combina `model + messages` integralmente.

## 3. Streaming progressivo

Funções de IA que retornam relatórios > 5s devem usar `llmStream` em
vez de `llmComplete`, para reduzir TTFB percebido. O frontend deve
consumir via `EventSource`/`fetch` + leitor `ReadableStream`.

## 4. Health endpoint

`health-check` é o endpoint público de monitoramento externo. Mantenha-o
**enxuto**:

- Apenas 1 query SELECT trivial (`bu_units LIMIT 1`).
- Sem chamadas RPC.
- Cache 30s na resposta (TTL no header `Cache-Control`).

## 5. Métricas-alvo

| Função | TTFB alvo | Latência total alvo |
|--------|-----------|---------------------|
| `health-check` | < 100 ms | < 300 ms |
| Agentes simples (vic) | < 1 s | < 5 s |
| Relatórios IA (qbr/okr) | < 2 s | < 30 s (streaming) |
| Cron dispatcher | n/a | < 60 s |

## 6. Anti-patterns

- ❌ Chamar `Promise.all` com > 10 queries sem batch.
- ❌ Logar payloads inteiros (use ids + tamanhos).
- ❌ Fazer JWT verify em loop dentro do handler (faça uma vez).
- ❌ Bloquear na resposta de webhook downstream (use outbox pattern).
