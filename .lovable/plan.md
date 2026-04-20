

## Plano: Auditoria + Teste + Correção dos Agentes de IA do Hub

### Pré-checklist (executado)
- ✅ TCR / DEVELOPMENT_STANDARDS / DATA_MODEL_REGISTRY / IDENTITY_CONVENTION / DOCUMENTATION_INDEX consultados
- ✅ Tabela `ai_agents` inspecionada (12 registros)
- ✅ Logs `ai_agent_logs` últimos 30 dias inspecionados (1 erro histórico, agentes ativos saudáveis)
- ✅ Memórias `mem://features/okrs/methodological-validator-agent` e `mem://architecture/ai-multi-llm-gateway-standard-v2-0-0` revisadas
- ✅ Mapa de edge functions consumidoras já levantado (11 functions)

### Diagnóstico — Inventário completo dos agentes

**12 agentes cadastrados em `ai_agents` (todos `is_active=true`, scope=global, integration_key=chatgpt):**

| # | Slug | Nome | Status uso (7d) | Observação |
|---|------|------|-----------------|------------|
| 1 | `cultura` | Guardião da Cultura | ✅ 124 success | OK |
| 2 | `coach-okrs` | Coach de OKRs | ✅ 6 success | OK |
| 3 | `validador-metodologico-okrs` | Validador Metodológico | ✅ 117 success | OK (1 erro em 07/04 antigo) |
| 4 | `analista-kpis` | Analista de KPIs | ✅ 34 success | OK |
| 5 | `facilitador-decisoes` | Facilitador de Decisões | ⚠️ Sem chamadas recentes | Verificar invocação |
| 6 | `alinhamento-estrategico` | Alinhamento Estratégico | ✅ 124 success | OK |
| 7 | `revisor-comunicacao` | Revisor de Comunicação | ✅ 6 success | OK |
| 8 | `onboarding-buddy` | Onboarding dos Jetimobers | ⚠️ Sem chamadas recentes | Verificar invocação |
| 9 | `analista-estrategico` | Analista Estratégico | ⚠️ Sem chamadas recentes | **Não existe no `VicAgentSlug` do front** |
| 10 | `vic-persona` | Persona do Vic | ⚠️ Sem chamadas recentes | **Não existe no `VicAgentSlug`** (filtrado em `BuIaSettings`) |
| 11 | `vic-greeting` | Persona do Vic / Saudações | ⚠️ Sem chamadas recentes | **Não existe no `VicAgentSlug`** (filtrado em `BuIaSettings`) |
| 12 | (NULL) | Coach de produtividade | ❌ **slug NULL** | **BUG CRÍTICO** — o tipo TS espera `coach-produtividade` mas o registro no banco tem `slug = NULL`. Qualquer invocação via `invoke-vic` falha em `loadAgent()`. |

### Problemas confirmados

1. **🔴 Crítico — `coach-produtividade` com `slug = NULL` no banco**
   - O tipo `VicAgentSlug` declara `"coach-produtividade"` e `VIC_AGENTS["coach-produtividade"]` está mapeado em `src/modules/vic/types.ts:145`
   - Edge function `invoke-vic` carrega agentes por `slug` em `loadAgent()` → retorna `null` → erro `AGENT_DISABLED` ou similar
   - **Fix:** UPDATE no banco para definir `slug = 'coach-produtividade'`

2. **🟡 Médio — Agentes "órfãos" não declarados no front**
   - `analista-estrategico`, `vic-persona`, `vic-greeting` existem no banco mas não estão em `VicAgentSlug` nem em `VIC_AGENTS`
   - `vic-persona` / `vic-greeting` são filtrados explicitamente em `BuIaSettings.tsx` (provavelmente uso interno de Greeting/Persona via outras edge functions, não via `invoke-vic`)
   - `analista-estrategico` (output_format=json, max_tokens=4000) provavelmente é usado pela edge `analysis-generate` — **verificar**
   - **Fix:** documentar uso de cada um e, se forem invocáveis pelo usuário via Vic, adicionar ao tipo

3. **🟢 Cobertura de testes funcionais**
   - Todos os agentes com chamadas recentes estão `success` — saudáveis
   - Agentes sem chamadas (5, 8, 9, 10, 11, 12) precisam ser testados manualmente via `supabase--curl_edge_functions` para confirmar funcionamento

### Plano de execução (3 etapas)

**Etapa 1 — Correção crítica do `slug` NULL** (banco)
- Migration: `UPDATE ai_agents SET slug = 'coach-produtividade' WHERE name = 'Coach de produtividade' AND slug IS NULL`
- Adicionar constraint `CHECK (slug IS NOT NULL AND slug <> '')` para prevenir recorrência (NOT VALID inicialmente, validate depois)
- Adicionar índice único `UNIQUE (slug)` se ainda não existir

**Etapa 2 — Teste funcional de cada agente** (sem mudança de código)
- Para cada um dos 12 slugs, invocar `invoke-vic` (para os user-facing) ou a edge function que o consome (para os de backend) com payload mínimo válido
- Para agentes de backend (`analista-estrategico` em `analysis-generate`, `vic-persona` em `vic-greeting`) inspecionar a edge function correspondente para confirmar slug usado
- Registrar resultado: ✅ funciona / ❌ falha + mensagem de erro
- Conferir logs em `ai_agent_logs` após cada teste

**Etapa 3 — Correções pontuais** (somente para falhas reais detectadas na Etapa 2)
- Se `coach-produtividade` continuar falhando após Etapa 1 → investigar `invoke-vic` `loadAgent()`
- Se `facilitador-decisoes` ou `onboarding-buddy` falharem → diagnosticar prompt/config
- Para agentes "órfãos" (analista-estrategico, vic-persona, vic-greeting): documentar uso interno em comentário no código onde são invocados; não adicionar ao `VicAgentSlug` se não forem expostos ao usuário via Vic

### Critérios de aceite
1. `coach-produtividade` invocável sem erro `AGENT_NOT_FOUND`
2. Tabela final com status de funcionamento dos 12 agentes
3. Zero divergência silenciosa entre `slug` no banco e `VicAgentSlug` no código (ou documentada)
4. Constraint `slug NOT NULL` aplicada para prevenir recorrência

### Não-objetivos (fora do escopo)
- ❌ Alterar prompts de sistema dos agentes
- ❌ Alterar modelos LLM ou parâmetros (temperature/max_tokens)
- ❌ Adicionar novos agentes
- ❌ Refatorar `invoke-vic` ou edge functions consumidoras

### Arquivos/recursos afetados
- 1 migration de banco (UPDATE + CONSTRAINT + INDEX)
- Possíveis ajustes em `src/modules/vic/types.ts` (apenas se análise da Etapa 2 indicar)
- Comentários de documentação em edge functions consumidoras dos agentes "órfãos" (se necessário)

### Riscos
- 🟢 Baixo: UPDATE em 1 linha, constraint NOT VALID, sem impacto em RLS, sem mudança de schema relacional
- 🟢 Baixo: Testes funcionais usam payloads de sondagem mínimos — não geram dados persistentes problemáticos

