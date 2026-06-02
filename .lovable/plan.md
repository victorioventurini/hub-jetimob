# Acelerar fallback do LLM em `analysis-generate` (e demais usuários de `invokeAgentDirect`)

## Causa raiz observada nos logs
Quando o modelo principal (`gemini-3.5-flash`) está sob 429 (rate-limit), o `llmComplete` faz até **5 tentativas com backoff exponencial** *antes* do `invokeAgentDirect` cair no próximo modelo da cadeia. Resultado: cada agente leva ~30–60s só esperando o backoff de um único modelo saturado, e em chamadas paralelas (analista-estrategico + facilitador-decisoes) o usuário vê o relatório travar/“falhar” muito antes de tudo terminar. Quando o segundo modelo *também* está sob 503, o ciclo se repete.

Esse é o mesmo problema que foi resolvido no MBR: lá passamos `maxAttempts: 1` para evitar retry interno e pular direto para o fallback de modelo.

## Mudança
Aplicar o mesmo padrão centralmente em `supabase/functions/_shared/invoke-agent.ts`:

1. Passar `maxAttempts: 1` ao `llmComplete` dentro de `invokeAgentDirect`, **sem** retry interno por modelo. A resiliência fica 100% na cadeia de modelos (`FALLBACK_MODEL_CHAIN`), que mistura provedores.
2. Aceitar `maxAttempts?: number` em `InvokeAgentOptions` para quem quiser override (default 1).
3. Adicionar uma opção `throwOnAllExhausted?: boolean` (default mantém o comportamento atual: lançar). Permite a `analysis-generate` desligar isso quando quiser gracefully degradar.

Em `supabase/functions/analysis-generate/index.ts`:

4. Quando ambos os agentes (`analista-estrategico` + `facilitador-decisoes`) falharem mesmo após a cadeia, gravar `status = "failed"` com `error_message = "Todos os modelos de IA estão indisponíveis. Tente novamente em alguns minutos."` em vez de marcar como `complete` com corpo vazio. Hoje o report fica `complete` com texto genérico — confuso para o usuário.
5. Manter o agente `analista-estrategico` (fase 1, sugestão de módulos) usando `throwOnMissingConfig: false`, sem alterar fluxo: ele já é melhor-esforço.

## Impacto colateral
Todos os outros consumidores de `invokeAgentDirect` (mbr-summary, qbr-*, team-checkin-summary, etc.) passam a usar a cadeia de modelos muito mais rápido — exatamente o comportamento desejado, alinhado ao fix anterior do MBR.

## Validação
1. Deploy de `analysis-generate` + reload do `_shared`.
2. Disparar um novo relatório em `/analysis` — logs devem mostrar **uma** chamada por modelo, com fallback imediato em 429/503.
3. Em caso de exaustão total, `analysis_reports.status = "failed"` com mensagem clara, e o frontend exibe erro tratado.
