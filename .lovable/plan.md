## Causa-raiz

O log da Edge `mbr-curate-opening` mostra:

```
LLM API error: 400 — Unsupported parameter: 'max_tokens' is not supported with this model.
Use 'max_completion_tokens' instead.
```

Os modelos OpenAI da família **GPT-5** rejeitam `max_tokens` e exigem `max_completion_tokens`. Hoje o `_shared/llm-client.ts` envia sempre `max_tokens` no payload (linhas 324 e 420), tanto em `llmComplete` quanto em `llmStream`. Como o agente `curador-orquestrador` (usado por MBR/Weekly e outros ritos) está configurado com um modelo GPT-5, toda chamada falha com 400 → o frontend cai no fallback "modo manual" e exibe o toast.

Impacto: afeta **qualquer Edge Function** que use `llmComplete`/`llmStream` com modelos `openai/gpt-5*`. Hoje sabemos que `mbr-curate-opening` quebra; provavelmente `weekly-curate-opening` e outros também (mesmo agente).

## Plano

### 1. Corrigir `_shared/llm-client.ts` (SSOT do payload)
Detectar o modelo no momento de montar o payload e usar a chave correta:

- Se `config.model` começar com `openai/gpt-5` → enviar `max_completion_tokens`.
- Caso contrário (Gemini, modelos OpenAI antigos) → manter `max_tokens`.

Aplicar nos dois pontos:
- `llmComplete` (payload sync, ~linha 321-326).
- `llmStream` (payload streaming, ~linha 417-423).

Extrair um helper privado `buildTokenLimitField(model, maxTokens)` que devolve o objeto `{ max_tokens }` ou `{ max_completion_tokens }` para evitar duplicação.

### 2. Validar via teste real

- Após o deploy automático, chamar `mbr-curate-opening` via `curl_edge_functions` e confirmar 200 + curadoria gerada.
- Conferir logs para ausência do erro `unsupported_parameter`.

### 3. Registrar memória

Salvar `mem://standards/ai/openai-gpt5-token-param` documentando que GPT-5 exige `max_completion_tokens` e que o helper em `llm-client.ts` é o ponto canônico (atualizar índice).

### 4. Atualizar `docs/audits/PERFORMANCE_PLAN_2026-05-04.md`

Adicionar nota de bugfix (não é otimização, mas é débito recente da Wave 1.B).

## Fora de escopo

- Não trocar o modelo do agente `curador-orquestrador`.
- Não alterar a lógica de fallback no frontend (continua válido como rede de proteção).
- Não auditar todos os modelos cadastrados — o helper cobre o universo OpenAI GPT-5 conhecido hoje; se surgir outra família com a mesma exigência, basta estender a função.

## Detalhes técnicos

```ts
function buildTokenLimitField(model: string, maxTokens: number) {
  // OpenAI GPT-5 family rejects max_tokens; requires max_completion_tokens.
  if (/^openai\/gpt-5/i.test(model)) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens };
}

// llmComplete
const payload: Record<string, unknown> = {
  model: config.model,
  messages,
  ...buildTokenLimitField(config.model, maxTokens),
  temperature,
};

// llmStream
const payload = {
  model: config.model,
  messages,
  ...buildTokenLimitField(config.model, options?.maxTokens ?? config.maxTokens),
  temperature: options?.temperature ?? config.temperature,
  stream: true,
};
```

Mudança mínima, cirúrgica, sem efeito colateral em chamadas Gemini ou OpenAI antigos.