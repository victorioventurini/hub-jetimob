## Trocar todos os agentes de ritos para `google/gemini-2.5-pro`

### 1. Migração SQL — `ai_agents`
Atualizar `model_name = 'google/gemini-2.5-pro'` para todos os 13 agentes (alinhamento-estrategico, analista-estrategico, analista-kpis, coach-okrs, coach-produtividade, cultura, curador-orquestrador, facilitador-decisoes, onboarding-buddy, revisor-comunicacao, validador-metodologico-okrs, vic-greeting, vic-persona).

### 2. Hardcodes em edge functions
- `supabase/functions/qbr-clevel-learnings-summary/index.ts:72` — `"google/gemini-3-flash-preview"` → `"google/gemini-2.5-pro"`
- `supabase/functions/culture-message/index.ts:137,179` — `"google/gemini-2.5-flash"` → `"google/gemini-2.5-pro"` (modelo + `model_used`)

### 3. Default do resolver
- `supabase/functions/_shared/llm-client.ts:158` — `DEFAULT_MODEL = "google/gemini-3-flash-preview"` → `"google/gemini-2.5-pro"`

### 4. Documentação interna (opcional, mas consistente)
- `supabase/functions/_shared/tcr/agents.ts:9,15` — atualizar referências textuais ao modelo padrão.

### Não alterado
- `mbr-executive-report` e `qbr-executive-report` já estão em `gemini-2.5-pro`.
- `_shared/llm-models.ts` mantém o catálogo de constantes intacto.

### Deploy
Deploy de: `qbr-clevel-learnings-summary`, `culture-message`, e todas as functions que usam `resolveLLMConfig` (já que o default mudou): `mbr-pre-month-analysis`, `mbr-curate-opening`, `weekly-curate-opening`, `qbr-pre-summary`, `qbr-meeting-summary`, `qbr-post-summary`, `clevel-checkin-summary`, `invoke-vic`, `mbr-executive-report`, `qbr-executive-report`, `qbr-clevel-learnings-summary`.