

## Adoção do Documento Canônico "Filosofia de Agentes de IA no Hub"

### Avaliação prévia
Os 5 ajustes propostos (definição de "função cognitiva", distinção curador-orquestrador vs alinhamento-estrategico, proibição de agente por formato de saída, governança `system_prompt` vs `instruction_sources`, matriz de decisão) são **acertos**. Reforçam clareza sem alterar arquitetura. Adoto integralmente, com **três correções factuais** identificadas contra o estado real do banco:

1. **Catálogo incompleto** — o doc lista 9 agentes, mas o banco tem 12: faltam `analista-estrategico`, `vic-greeting`, `vic-persona`. Vou complementar.
2. **`curador-orquestrador` não existe ainda** — o doc o trata como exemplo legítimo de criação. Marcarei explicitamente como **proposto/roadmap**, não como agente existente.
3. **Schema real** — `ai_agents` usa `integration_key` (FK obrigatória) e enum `agent_scope`. Acrescento essa nota técnica.

---

### Entregáveis

#### 1. Novo canônico: `docs/canonical/AI_AGENTS_PHILOSOPHY.md` (v1.0.0)
Documento integral proposto, com os 5 ajustes incorporados e as 3 correções factuais acima. Estrutura:

- Contexto + Princípio central
- Vocabulário canônico (função cognitiva)
- Três regras fundamentais
- **Catálogo real (12 agentes)** com função cognitiva mapeada para cada um
- Distinções críticas entre adjacentes
- Fluxo de decisão (4 passos)
- **Matriz de decisão rápida (5 linhas)**
- Governança de prompts (`system_prompt` vs `instruction_sources`)
- 6 antipadrões (incluindo o novo: agente por formato de saída)
- Quando criar agente é legítimo
- **Aplicação prática Pré-Weekly/Weekly** (mantida, mas marcando `curador-orquestrador` como roadmap)
- Entregáveis obrigatórios em PRs
- Revisão periódica + Resumo

#### 2. Atualização `docs/canonical/README.md`
Adicionar linha na tabela de documentos:
```
| AI_AGENTS_PHILOSOPHY.md | Governança de criação/reutilização de agentes IA | v1.0.0 |
```

#### 3. Atualização `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (bump v3.27.0)
- **§2.5** — após o bloco `ai_agents`, inserir parágrafo curto: *"A criação, reutilização e governança de agentes seguem obrigatoriamente `AI_AGENTS_PHILOSOPHY.md` (canônico)."*
- **§4** — nova subseção `4.12 Governança de Agentes de IA` com referência ao canônico e a matriz de decisão resumida (5 linhas) inline para consulta rápida.
- **Status** no topo: adicionar `**AI Agents Philosophy v1.0** ✅`.

#### 4. Atualização `docs/canonical/DEVELOPMENT_STANDARDS.md`
Adicionar item à checklist obrigatória de PRs que mexem em IA: *"Toda criação/modificação de agente deve apresentar os 9 entregáveis listados em `AI_AGENTS_PHILOSOPHY.md` §Entregáveis obrigatórios."*

#### 5. Memórias canônicas (`mem://`)
- Criar `mem://standards/ai/agents-philosophy-canonical.md` — referência ao canônico + síntese da matriz de decisão (5 linhas) + os 6 antipadrões nominais.
- Atualizar `mem://index.md` na seção **Memories** com nova linha:
  `[Agents Philosophy](mem://standards/ai/agents-philosophy-canonical) — Reuso primeiro; criar genérico por função cognitiva; matriz 5-linhas`
- Atualizar **Core** com regra curta: *"AI Agents: reutilizar antes de criar; nunca por cadência/rito/persona/formato; ver AI_AGENTS_PHILOSOPHY.md."*

---

### Detalhes técnicos relevantes

- **Não há mudança de schema, código ou edge function.** Trabalho 100% documental + memória.
- **Catálogo do doc será sincronizado com banco real** (consulta `SELECT slug, name FROM ai_agents` produziu 12 registros, vs 9 no draft).
- **`curador-orquestrador`** entra como exemplo de "criação legítima futura" e é o único agente proposto no doc — marcado claramente como **NÃO IMPLEMENTADO**, evitando confusão. Sua eventual criação seguirá o próprio fluxo de decisão do canônico.
- **Sem alteração em `ai_agents.scope`, `output_format` ou enums** — o canônico apenas formaliza disciplina sobre uso correto desses campos já existentes.
- **Compatível com infra atual**: `ai_agent_instruction_sources` (já em uso conforme `useInstructionSources.ts`) é exatamente a camada que o canônico privilegia para adaptações contextuais.

### Critérios de aceite
- 5 arquivos atualizados (1 novo canônico + README + TCR + DEV_STANDARDS + memória).
- TCR bumped para v3.27.0 com referência cruzada ao novo canônico.
- `mem://index.md` atualizado em Core e Memories.
- Catálogo do canônico bate exatamente com `SELECT slug FROM ai_agents`.
- Zero mudança em código de aplicação, banco ou edge functions.

