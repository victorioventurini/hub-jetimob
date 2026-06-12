## Objetivo

Transformar `/analysis` de **gerador de relatório único** em **copiloto CEO conversacional**, isolado por BU, com qualidade analítica equivalente ao que você obtém colando CSV no Claude.

## Por que hoje fica aquém do Claude com CSV

O `/analysis` atual:
1. Você manda 1 premissa → recebe 1 análise → fim. Sem follow-up.
2. Os "data collectors" mandam **recortes/resumos** dos módulos, não as linhas cruas.
3. Modelo configurado por agente — não necessariamente o top da casa.

Quando você cola CSV no Claude, ele tem **a tabela inteira** + **conversa iterativa**. Vamos replicar isso.

## O que muda para o usuário

`/analysis` ganha 3 modos (a "premissa" atual continua sendo um atalho):

1. **Conversa aberta** — chat com threads, hist�órico persistido, "continue", "aprofunda", "e se".
2. **Premissa rápida** (atual) — gera relatório como hoje, mas com modelo melhor e mais dados.
3. **Anexos** — você pode colar CSV/texto na conversa (ex: dado externo que não está no Hub).

Cada thread é **escopada à BU ativa** (RLS). Trocou de BU → outra lista de threads.

## Arquitetura técnica

### 1. Modelo
- Default: **`google/gemini-2.5-pro`** (1M tokens de contexto, raciocínio profundo, melhor da casa para análise tabular).
- Escalada automática para **`openai/gpt-5.4-pro`** quando o agente detectar premissa de "decisão estratégica" (heurística simples).
- Flash só para roteamento/sugestão de módulos (passo barato).

### 2. Tools (AI SDK `tool` calls)
O agente decide quais puxar, sem orquestração rígida. Cada tool é uma RPC server-side já filtrada por `bu_id` via JWT:

| Tool | O que retorna |
|------|---|
| `query_okrs` | Org + Times + KRs + progresso canônico (por ciclo, status, área) |
| `query_kpis` | Metadados + séries de valores (período arbitrário, com variação/tendência calculada) |
| `query_projects` | Projetos, milestones, riscos, vínculos com KRs |
| `query_rituals` | Check-ins, decisões, atas MBR/QBR (com sinais qualitativos) |
| `query_people` | Times, áreas, responsáveis (sem dados pessoais sensíveis) |
| `cross_search` | Busca textual em descrições/comentários/decisões |

Diferente do `data-collectors.ts` atual (que devolve resumos), as tools devolvem **linhas estruturadas** que o modelo lê e cruza sozinho.

### 3. Persistência de conversa
Nova tabela `analysis_threads` + `analysis_messages` (BU-scoped, RLS por `auth.uid()` = owner). Mensagens em formato `UIMessage[]` da AI SDK (suporta tool calls + texto).

Rota: `/analysis/:threadId`. Reload restaura a thread. Threads antigas listadas em sidebar.

### 4. Streaming
Edge function `analysis-chat` com `streamText` + `toUIMessageStreamResponse`. UI usa `useChat` (AI SDK React). Latência: primeiro token em ~2-4s; análise completa 15-40s para queries cross-módulo.

### 5. Manter o que já existe
- `analysis-generate` (premissa única, salva como `analysis_reports`) → preservado, vira "Gerar relatório" dentro do chat.
- Templates de premissa em `AnalysisTemplatesPage` → preservados, viram "prompts iniciais" do chat.
- `AnalysisResultPage` → preservado para visualizar relatórios salvos.

## Escopo desta entrega

**Inclui:**
- Nova edge function `analysis-chat` (streaming + tools).
- 5-6 tools de leitura (OKRs, KPIs, Projects, Rituals, People, Search) com cálculo canônico de progresso.
- Tabelas `analysis_threads` + `analysis_messages` (RLS + grants).
- UI: chat conversacional em `/analysis` com lista de threads, composer, render de `message.parts` (texto + tool calls visíveis).
- Roteador de modelo (flash para sugestão, pro para análise).
- Markdown + tabelas + gráficos inline (Recharts) renderizados a partir do output do modelo.

**Não inclui (fica para depois):**
- Ações de escrita (criar decisões, editar KRs) — escolhido "só leitura".
- Cross-BU agregado — escolhido "1 por BU".
- Anexos binários (PDF/imagem) — só texto/CSV colado por enquanto.

## Detalhes técnicos

```text
Frontend (React, /analysis)
  ├─ useChat (AI SDK) — id = threadId
  ├─ ThreadList sidebar
  └─ POST → /functions/v1/analysis-chat
        │
        ▼
analysis-chat (edge function)
  ├─ Auth + BU validation (middleware existente)
  ├─ streamText({ model: gemini-2.5-pro, tools, stopWhen: stepCountIs(50) })
  ├─ Tools executam queries server-side com bu_id do contexto
  ├─ onFinish → persiste assistant message em analysis_messages
  └─ toUIMessageStreamResponse()
```

Padrões obrigatórios respeitados:
- BU isolation via `currentBuId` síncrono (front) + filtro nas tools (back).
- `tryParseAiJson` para outputs estruturados; `toText` na UI.
- Tools fazem `.select("colunas explícitas")` — nunca `*`.
- Progresso de KR sempre via `calculateKrProgress` (`_shared/okr-progress.ts`).
- Soft delete (`deleted_at IS NULL`, `cancelled_at IS NULL`).
- `stepCountIs(50)` para o loop de tools.
- `LOVABLE_API_KEY` server-side; tabelas com GRANT + RLS no mesmo migration.
- Edge function segue `edge-function-standard-v4` (factory + middleware + structured logs).

## Custo e expectativas

- Conversa típica (3-5 turnos com 2-3 tools cada): R$ 0,30-0,80 em créditos Lovable AI.
- Análise profunda single-shot (premissa atual): R$ 0,15-0,40.
- Latência: primeiro token 2-4s; resposta cross-módulo completa 15-40s.
- Qualidade analítica: equivalente ao Claude Sonnet 4.5 com CSV colado (mesmo gap que você sentia agora desaparece, porque o modelo passa a ter as linhas cruas via tools).

## Riscos

- **Tool calls profundos podem estourar contexto** em BUs com muitos KRs/KPIs. Mitigação: cada tool tem `limit` default + filtros obrigatórios (ciclo/período).
- **Threads acumulam custo** se conversa ficar muito longa. Mitigação: sumarizar threads >20 mensagens em background.
- **Modelo top é mais lento.** Mitigação: streaming + skeleton states, e roteamento para flash em perguntas triviais.

## Entregáveis sequenciais

1. Migration: `analysis_threads`, `analysis_messages` + RLS + GRANT.
2. Tools compartilhadas em `supabase/functions/_shared/analysis-tools/`.
3. Edge function `analysis-chat` (streaming).
4. UI nova de chat em `/analysis` (preserva templates + relatórios salvos como tabs).
5. Atualizar `analysis-generate` para usar `gemini-2.5-pro` (alinha qualidade do modo "premissa rápida").
