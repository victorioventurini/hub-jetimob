/**
 * Wrapper para invoke-vic com tratamento de erro padronizado.
 *
 * Por que existir
 * ---------------
 * Vários modos do okr-construction-review fazem a MESMA chamada a
 * `invoke-vic` mudando só o agentSlug/contexto. Centralizar aqui:
 *   - mantém forwarding consistente de auth/correlation/bu;
 *   - traduz HTTP 4xx do invoke-vic em mensagens amigáveis ao usuário
 *     em PT-BR (rate limit, créditos, agente desativado etc.);
 *   - falha alto se a resposta vier vazia (em vez de propagar `null`
 *     contaminando o parser).
 */

import { corsHeaders } from '../_shared/middleware.ts';

export interface CallInvokeVicResult {
  content: string | null;
  /** Já é uma Response pronta com mensagem de erro PT-BR. Caller só faz `return error`. */
  error: Response | null;
}

export async function callInvokeVic(
  supabaseUrl: string,
  authHeader: string,
  buId: string,
  correlationId: string,
  payload: {
    agentSlug: string;
    actionContext: string;
    context: Record<string, unknown>;
    userQuestion: string;
  }
): Promise<CallInvokeVicResult> {
  const vicResponse = await fetch(`${supabaseUrl}/functions/v1/invoke-vic`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'x-current-bu-id': buId,
      'x-correlation-id': correlationId,
    },
    body: JSON.stringify({
      buId,
      ...payload,
      stream: false,
    }),
  });

  if (!vicResponse.ok) {
    const errorText = await vicResponse.text();
    console.error('[okr-construction-review] invoke-vic error:', vicResponse.status, errorText);

    const errorMap: Record<number, string> = {
      429: 'Limite de requisições excedido. Tente novamente em alguns minutos.',
      402: 'Créditos de IA esgotados.',
      404: 'Agente validador-metodologico-okrs não encontrado. Configure o agente em Integrações.',
      403: 'Agente validador-metodologico-okrs não está ativado para esta BU.',
    };

    const errorMessage = errorMap[vicResponse.status];
    if (errorMessage) {
      return {
        content: null,
        error: new Response(
          JSON.stringify({ error: errorMessage }),
          { status: vicResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        ),
      };
    }

    throw new Error(`invoke-vic error: ${vicResponse.status}`);
  }

  const vicData = await vicResponse.json();
  const content = vicData.data?.response || vicData.response || vicData.content || vicData.message;

  if (!content) {
    console.error('[okr-construction-review] Empty response from agent:', JSON.stringify(vicData));
    throw new Error('Resposta vazia do agente');
  }

  return { content, error: null };
}
