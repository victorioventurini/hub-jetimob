## Plano

1. **Corrigir a função `mbr-curate-opening`**
   - Trocar a chamada direta `resolveLLMConfig + llmComplete` por `llmCompleteWithFallback`.
   - Manter o mesmo agente canônico `curador-orquestrador`, sem criar agente novo.
   - Registrar no `ai_agent_logs` o modelo efetivamente usado quando a resposta vier do fallback.

2. **Evitar que 429 derrube a experiência do usuário**
   - Em vez de retornar erro 429 imediatamente para o frontend, tentar automaticamente modelos alternativos.
   - Se todos os modelos falharem, retornar `origin: 'manual'` com motivo claro, para permitir edição manual sem bloquear o MBR.
   - Só manter erro bloqueante para créditos esgotados ou configuração realmente ausente.

3. **Ajustar a cadeia de fallback para este caso**
   - Como os logs mostram quota diária estourada no modelo atual (`gemini-3.5-flash` via chave própria), a cadeia precisa sair do provider saturado e tentar Lovable AI/GPT em seguida.
   - Usar uma sequência resiliente como: modelo do agente → `google/gemini-3-flash-preview` → `google/gemini-2.5-flash-lite` → `openai/gpt-5-mini` → `openai/gpt-5-nano`.
   - Se necessário, priorizar os modelos via Lovable AI quando a chave própria estiver estourando quota.

4. **Revisar funções MBR relacionadas**
   - Confirmar que `mbr-summary` e `mbr-executive-report` já estão usando fallback.
   - Verificar `mbr-pre-month-analysis`, porque ela também aparece como chamada direta de IA e pode gerar o mesmo problema em outro passo do MBR.

5. **Validar em backend**
   - Deployar as funções alteradas.
   - Testar a função `mbr-curate-opening` com payload mínimo válido.
   - Conferir logs para garantir que, diante de 429, a função tenta outro modelo antes de responder ao frontend.

## Causa raiz encontrada

- O backend está saudável.
- Os logs da função `mbr-curate-opening` mostram 429 real do modelo `gemini-3.5-flash`, com quota diária gratuita excedida.
- Essa função ainda não recebeu a arquitetura de fallback aplicada anteriormente em `mbr-summary` e `mbr-executive-report`, por isso o toast continua aparecendo em `/rituals/mbr`.