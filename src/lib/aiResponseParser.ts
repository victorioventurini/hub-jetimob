/**
 * AI Response Parser — helper canônico para extrair JSON de respostas de LLM.
 *
 * Por que existir:
 * Modelos (Gemini/GPT) frequentemente retornam JSON envolvido em texto livre,
 * fences markdown (```json ... ```), prefixos ("Aqui está minha análise:") ou
 * sufixos ("Observação: ..."). Um `JSON.parse` direto falha em todos esses
 * casos, fazendo com que componentes mostrem texto cru ao usuário em vez de
 * acionar o fluxo estruturado (alternativas, dependências, etc.).
 *
 * Este helper centraliza a extração e a normalização. NUNCA reimplemente
 * regex de fence/JSON em componentes — sempre importe daqui.
 *
 * Mirror leve da estratégia usada nas Edge Functions
 * (supabase/functions/_shared/extractJsonPayload), mantendo paridade de
 * comportamento entre cliente e servidor.
 */

/**
 * Normaliza uma string candidata a JSON:
 *   - remove fences markdown (```json ... ``` ou ``` ... ```)
 *   - remove vírgulas finais antes de `}` ou `]` (trailing commas)
 *   - corta texto antes do primeiro `{`/`[` e depois do último `}`/`]`
 *
 * Não joga; sempre devolve uma string (pode ainda ser inválida).
 */
export function stripJsonNoise(raw: string): string {
  let s = (raw ?? "").trim();
  if (!s) return s;

  // 1) Fence markdown ```json ... ``` (ou ``` ... ```), inclusive sem fechar.
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (fenced && fenced[1]) {
    s = fenced[1].trim();
  }

  // 2) Recorta do primeiro `{`/`[` até o último `}`/`]` correspondente.
  //    Cobre casos "Aqui está minha análise: { ... } Observação...".
  const firstBrace = s.search(/[{[]/);
  if (firstBrace > 0) s = s.slice(firstBrace);

  // Encontra o último fechamento que combine com a abertura do primeiro caractere.
  const opener = s[0];
  const closer = opener === "{" ? "}" : opener === "[" ? "]" : "";
  if (closer) {
    const lastClose = s.lastIndexOf(closer);
    if (lastClose > 0 && lastClose < s.length - 1) {
      s = s.slice(0, lastClose + 1);
    }
  }

  // 3) Remove trailing commas comuns: ",}" e ",]"
  s = s.replace(/,\s*([}\]])/g, "$1");

  return s.trim();
}

/**
 * Tenta parsear JSON tolerando ruído típico de LLMs.
 * Retorna `null` (e nunca lança) quando não é possível recuperar.
 *
 * Estratégia em camadas:
 *   1. Parse direto (caso o modelo já tenha respeitado o contrato).
 *   2. Parse após `stripJsonNoise`.
 *   3. Salvage: maior bloco `{...}` ou `[...]` balanceado encontrado no texto.
 */
export function tryParseAiJson<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw || typeof raw !== "string") return null;

  // Camada 1: parse direto
  try {
    return JSON.parse(raw) as T;
  } catch {
    // continua
  }

  // Camada 2: limpeza padrão
  const cleaned = stripJsonNoise(raw);
  if (cleaned) {
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // continua
    }
  }

  // Camada 3: salvage — encontra o maior bloco balanceado
  const salvaged = salvageBalancedJson(raw);
  if (salvaged) {
    try {
      return JSON.parse(salvaged) as T;
    } catch {
      // sem sorte
    }
  }

  return null;
}

/**
 * Procura no texto o maior bloco `{...}` ou `[...]` balanceado
 * (respeitando strings com aspas e escapes). Útil quando o JSON está
 * cercado por texto livre antes e depois.
 */
function salvageBalancedJson(input: string): string | null {
  const s = input ?? "";
  let best: { start: number; end: number } | null = null;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== "{" && ch !== "[") continue;
    const end = findBalancedEnd(s, i);
    if (end > i) {
      if (!best || end - i > best.end - best.start) {
        best = { start: i, end };
      }
    }
  }

  if (!best) return null;
  return s.slice(best.start, best.end + 1);
}

function findBalancedEnd(s: string, start: number): number {
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}
