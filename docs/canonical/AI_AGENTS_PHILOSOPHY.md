# Filosofia de Agentes de IA no Hub

**Versão:** 1.0.0
**Última atualização:** 2026-04-21
**Status:** Normativo (canônico)
**Referência cruzada:** TCR §2.5 (`ai_agents`) · TCR §4.12 · DEVELOPMENT_STANDARDS §H.2

---

## Contexto

Este documento é **canônico** e deve ser consultado **antes** de qualquer decisão sobre criação, modificação ou uso de agentes de IA no Hub da Jet.

O Hub opera com uma estrutura de agentes centralizada na tabela `ai_agents`, executada via **Lovable AI Gateway** através do `agent-loader` (edge function), e logada em `ai_agent_logs`. Cada agente é um registro configurável com `system_prompt`, `output_format`, `allowed_tools`, `model_name`, `integration_key` (FK obrigatória para `hub_integrations_catalog`), `scope` (`global` | `bu`) e parâmetros de inferência.

Adaptações contextuais a casos de uso específicos vivem em `ai_agent_instruction_sources` (já consumida via `useInstructionSources.ts`), preservando o `system_prompt` base livre de inchaço.

Este documento define como decidir entre **reutilizar** agentes existentes ou **criar novos**.

---

## Princípio central

> **Reutilizar quando óbvio. Criar agente genérico quando necessário. Evitar agente específico por caso de uso.**

A filosofia do Hub é **acumular aprendizado em poucos agentes bem refinados**, não proliferar agentes por cadência ou por rito.

---

## Vocabulário canônico

### Função cognitiva

**Função cognitiva é o tipo de trabalho intelectual que a IA executa sobre os dados, independentemente do rito em que isso acontece.**

Exemplos de funções cognitivas distintas:
- Analisar variações de KPIs
- Validar qualidade metodológica de OKRs
- Estruturar decisões emergentes em deliberações formais
- Curar insumos cross-times em pauta executiva priorizada
- Sugerir insights contextuais

Duas perguntas diferentes:
- ❌ "Qual rito estamos implementando?" → **não determina** qual agente usar
- ✅ "Qual função cognitiva a IA precisa executar?" → **determina** qual agente usar

Esta distinção é crítica. Ritos diferentes frequentemente exigem a mesma função cognitiva — e portanto o mesmo agente. O que muda entre ritos são os **dados de entrada**, não a capacidade do agente.

---

## Três regras fundamentais

### Regra 1 — Sempre avaliar reutilização antes de criar

Antes de propor qualquer agente novo, analisar se algum dos agentes existentes cobre a função cognitiva. A análise deve ser **explícita** e registrada no PR.

### Regra 2 — Quando criar, criar genérico

Se for necessário criar um agente novo, ele deve ser **genérico por função cognitiva** e não específico por cadência, rito ou cliente.

| ✅ Correto | ❌ Errado |
|------------|-----------|
| `curador-orquestrador` (serve Weekly, MBR, QBR) | `curador-weekly` |
| `analista-kpis` (serve qualquer rito) | `analista-kpis-mbr` |

### Regra 3 — Variação vive no input, não no agente

Quando o mesmo agente serve cadências diferentes, a diferença entre invocações vem do **input** (dados, contexto, parametrização), não da identidade do agente.

Exemplo:
- `curador-orquestrador` invocado com insumos semanais → Abertura Executiva da Weekly
- `curador-orquestrador` invocado com insumos mensais → Abertura Executiva do MBR
- Mesmo agente, mesmo `system_prompt`, diferentes dados de entrada

Isso permite que o agente acumule refinamento atendendo múltiplos casos.

---

## Catálogo de agentes existentes

> **Sincronizado com banco em 2026-04-21.** Sempre consultar `SELECT slug, name, scope FROM ai_agents` antes de propor agente novo.

| Slug | Função cognitiva | Casos de uso típicos |
|------|------------------|----------------------|
| `cultura` | Curadoria de mensagens culturais | Reconhecimentos, celebrações, tom organizacional |
| `coach-okrs` | Coaching metodológico de OKRs durante a jornada | Insights sobre KRs, sugestões de ajuste, guiding questions |
| `validador-metodologico-okrs` | Validação metodológica de OKRs no momento da criação | Verificação de qualidade na criação de objetivos e KRs |
| `analista-kpis` | Análise de variações de KPIs | Leitura de variações, tendências, hipóteses de causa |
| `analista-estrategico` | Análise estratégica consolidada de múltiplas fontes | Relatório executivo de QBR, narrativas estratégicas cross-time |
| `facilitador-decisoes` | Estruturação de decisões emergentes | Transformar discussões em decisões formais com dono/prazo |
| `alinhamento-estrategico` | Avaliação de coerência entre execução e estratégia | Identificar desalinhamentos entre KRs de time e KRs org |
| `revisor-comunicacao` | Revisão de tom e clareza | Revisão de textos antes de envio, ajuste de linguagem |
| `onboarding-buddy` | Onboarding de usuários | Suporte a novos Jetimobers no Hub |
| `coach-produtividade` | Coaching individual de produtividade | Orientações sobre produtividade pessoal |
| `vic-persona` | Persona conversacional do Vic | Camada de identidade e tom para interações conversacionais |
| `vic-greeting` | Saudações contextuais do Vic | Mensagens de abertura personalizadas no Hub |

**Total ativo: 12 agentes (todos `scope=global`, `integration_key=chatgpt`).**

### Agentes propostos / roadmap (NÃO IMPLEMENTADOS)

| Slug proposto | Função cognitiva | Status |
|---------------|------------------|--------|
| `curador-orquestrador` | Curadoria executiva — agrega insumos cross-times e prioriza pauta | **Roadmap** — só criar via fluxo de decisão deste documento |

---

## Distinções críticas entre agentes adjacentes

Alguns agentes têm funções próximas mas operam sobre intenções distintas. Ter claras estas distinções:

### `alinhamento-estrategico` vs `curador-orquestrador` (futuro)
- **`alinhamento-estrategico`** → avalia **coerência** entre execução e estratégia. Função **analítica**, produz juízo sobre se o que está sendo feito move o que foi planejado.
- **`curador-orquestrador`** → organiza insumos dispersos em uma **pauta executiva priorizada**. Função de **síntese**, produz ordenação e destilação.

### `analista-kpis` vs `analista-estrategico`
- **`analista-kpis`** → lê e interpreta variações de **um conjunto de KPIs**. Função focal, dataset homogêneo.
- **`analista-estrategico`** → consolida **múltiplas fontes** (KPIs + OKRs + decisões + scorecards) em narrativa estratégica. Função integradora.

### `coach-okrs` vs `validador-metodologico-okrs`
- **`coach-okrs`** → acompanha a **jornada**, oferece insights **durante** a execução.
- **`validador-metodologico-okrs`** → valida **no momento da criação**, verifica aderência às boas práticas.

### `analista-kpis` vs `facilitador-decisoes`
- **`analista-kpis`** → lê, interpreta, explica o que os números mostram.
- **`facilitador-decisoes`** → estrutura **o que fazer** com o que foi identificado.

### `vic-persona` vs `vic-greeting`
- **`vic-persona`** → camada de identidade e tom **transversal** a interações conversacionais.
- **`vic-greeting`** → função estreita de **saudação contextual** (entrada no Hub, transições).

---

## Fluxo de decisão para agentes

### Passo 1 — Definir a função cognitiva

> "Qual é a função cognitiva específica que a IA precisa executar aqui?"

Não "qual rito estamos implementando?", mas **"o que a IA precisa fazer com os dados?"**. Ritos diferentes podem ter a mesma função cognitiva.

### Passo 2 — Consultar o catálogo

Para cada função identificada no Passo 1, verificar se existe agente no catálogo que cubra a função.

**Tipos de match:**
- **Match direto** — agente existente cobre a função sem ajuste. Ex.: KPIs em alerta durante Pré-Weekly → `analista-kpis`.
- **Match parcial (com ajuste)** — agente existente cobre a função, mas precisa de parametrização via `ai_agent_instruction_sources` para o novo contexto. Ex.: `coach-okrs` ganha instrução adicional para operar em cadência semanal.
- **Sem match** — nenhum agente existente cobre a função. **Só neste caso**, ir para o Passo 3.

### Passo 3 — Decidir criação

Se não houver match, a criação deve responder:

**3.1 — O agente proposto é específico ou genérico?**
Se o nome contiver referência a cadência (`weekly`, `monthly`), rito (`mbr`, `qbr`), persona (`line-manager`, `c-level`) ou cliente → **redesenhar** como genérico por função cognitiva.

**3.2 — Existem outros casos de uso futuros que esse agente atenderia?**
Listar ao menos **2 casos de uso potenciais**, mesmo que futuros. Se só existir 1 caso, questionar se a função pode ser absorvida por agente existente com ajuste.

**3.3 — Qual a assinatura de função única?**
Definir em uma frase o que **só esse agente faz**. Se a frase começar com "como o X mas para Y", provavelmente é ajuste do X existente.

**3.4 — É apenas diferença de formato de saída?**
Diferença de `output_format`, estrutura de resposta ou camada de apresentação **não justifica, sozinha**, a criação de novo agente. Use `output_format` e `output_schema` parametrizados na invocação.

### Passo 4 — Registrar a decisão

Toda decisão de criar agente novo deve ser registrada com os 9 entregáveis listados em [§Entregáveis obrigatórios](#entregáveis-obrigatórios-em-prs-que-criammodificam-agentes).

---

## Matriz de decisão rápida

> Consultar **antes** de ler o fluxo completo. Resolve a maioria dos casos em segundos.

| Situação | Decisão |
|----------|---------|
| Função idêntica a agente existente | **Reutilizar** sem ajuste |
| Função coberta por agente existente, mas com contexto novo | **Reutilizar + adicionar `instruction_source`** |
| Função nova e reaproveitável em múltiplos ritos/casos | **Criar agente genérico** por função cognitiva |
| Função nova mas ainda não validada | **Criar agente experimental** com critério de consolidação |
| Diferença apenas de formato, estrutura de saída ou contexto | **Não criar agente novo** — parametrizar invocação |

Se o caso não se enquadra claramente em nenhuma das 5 linhas, seguir o fluxo completo dos passos 1 a 4.

---

## Governança de prompts

### Camadas de prompt

O Hub tem **duas camadas** onde instruções para o agente podem viver:

**1. `system_prompt` (base)**
- **Função:** capacidades permanentes e identidade do agente
- **Quando ajustar:** apenas quando o refinamento beneficia **todos** os casos de uso que usam o agente
- **Risco:** alto — afeta todos os usos; alterações devem ser validadas em pelo menos 2 contextos distintos

**2. `ai_agent_instruction_sources` (contextual)**
- **Função:** adaptações contextuais a casos de uso específicos
- **Quando usar:** para ajustar um agente a um contexto, persona ou BU específicos sem afetar outros usos
- **Risco:** baixo — escopo isolado; facilmente reversível

### Princípio

> **Use `ai_agent_instruction_sources` para adaptar um agente a um contexto específico. Use o `system_prompt` base apenas para capacidades permanentes do agente.**

Isso evita inchaço do `system_prompt` com contextos específicos, preserva identidade clara do agente e facilita acumulação de refinamento ao longo do tempo.

### Modificações seguras vs sensíveis

**Seguras (baixo risco):**
- Adicionar `instruction_source` para novo contexto
- Ajustar `allowed_tools` (adicionar ferramentas novas)
- Ajustar `temperature` ou `max_tokens` para casos específicos

**Sensíveis (alto risco):**
- Modificar `system_prompt` base
- Remover `allowed_tools` já em uso
- Alterar `output_format` ou `output_schema` base

Modificações sensíveis exigem validação em múltiplos contextos e preservação de histórico em `ai_agent_logs`.

---

## Antipadrões a evitar

### Antipadrão 1 — Agente por cadência
- ❌ `curador-weekly`, `curador-mbr`, `curador-qbr`
- ✅ `curador-orquestrador` (serve as três cadências, invocado com insumos diferentes)

### Antipadrão 2 — Agente por rito específico
- ❌ `agente-abertura-executiva`, `agente-kpi-gate`
- ✅ Reutilizar `analista-kpis` para KPI Gate; `curador-orquestrador` para Abertura Executiva

### Antipadrão 3 — Agente por persona
- ❌ `coach-para-lideres`, `coach-para-colaboradores`
- ✅ `coach-okrs` parametrizado por contexto de persona via `VicContext`

### Antipadrão 4 — Duplicação funcional
- ❌ Criar `analista-weekly` que faz análise de KPIs em cadência semanal, quando `analista-kpis` já faz isso.
- ✅ `analista-kpis` recebe insumos semanais e gera análise adequada.

### Antipadrão 5 — Agente por formato de saída
- ❌ Criar `analista-kpis-json` porque um caso precisa de JSON e outro de texto.
- ✅ `analista-kpis` com `output_format` parametrizado na invocação.

### Antipadrão 6 — Inchaço do `system_prompt`
- ❌ Acumular no `system_prompt` base todas as variações contextuais que o agente encontra.
- ✅ Manter `system_prompt` focado em identidade permanente; colocar variações em `instruction_sources`.

---

## Quando é legítimo criar agente novo

Criar agente novo é legítimo em **três situações**:

### 1. Função cognitiva genuinamente nova
Nenhum agente existente executa nada próximo da função cognitiva necessária.

*Exemplo legítimo:* criar `curador-orquestrador` porque a função "agregar insumos cross-times e priorizar pauta executiva" é distinta de análise, coaching, validação ou revisão.

### 2. Separação necessária por razões de segurança ou governança
Quando dois casos de uso precisam de configurações radicalmente diferentes: `allowed_tools` conflitantes, escopos de dados distintos, ou níveis de permissão incompatíveis.

### 3. Experimentação isolada antes de consolidar
Criar agente experimental para validar uma hipótese antes de modificar agente existente. Documentar como experimental e definir critério de consolidação ou descarte.

---

## Aplicação prática: Pré-Weekly e Weekly

### Para insights durante preenchimento do Pré-Weekly

| Step | Função cognitiva | Agente |
|------|------------------|--------|
| KPIs do Time | Análise de variações e tendências | `analista-kpis` (match direto) |
| KRs em Atenção | Insights metodológicos sobre KRs | `coach-okrs` (match direto) |
| `InlineDecisionInput` | Estruturação de decisões | `facilitador-decisoes` (match direto) |

**Nenhum agente novo necessário.** Apenas reutilização com parametrização de contexto.

### Para Abertura Executiva da Weekly

**Função cognitiva:** agregar insumos de todos os Pré-Weekly, identificar padrões cross-times, priorizar pauta executiva, destacar itens fora de pauta.

**Análise do catálogo:**
- `alinhamento-estrategico` — função correlata mas distinta (coerência ≠ curadoria).
- `analista-estrategico` — consolida narrativa, mas não foca em **priorização de pauta executiva**.
- Nenhum outro agente cobre curadoria executiva.

**Decisão:** criar agente novo, mas como **genérico por função cognitiva**.

**Agente a criar (ROADMAP — NÃO IMPLEMENTADO):**
- `slug`: `curador-orquestrador`
- `scope`: `global` (customizável por BU via `instruction_sources`)
- **Função cognitiva única:** curadoria executiva de rituais decisórios — agrega insumos, identifica padrões cross-times, prioriza pauta
- **Casos de uso atuais:** Abertura Executiva da Weekly
- **Casos de uso futuros:** Abertura Executiva do MBR, Contexto Executivo do QBR
- **Não criar `curador-weekly`**

### Para insights futuros no Pré-Weekly (`coach-weekly-prep`)

**Decisão:** **não criar.** Reutilizar `coach-okrs`, `analista-kpis` e `facilitador-decisoes` conforme o step. Qualquer agente específico de preparação semanal violaria o **Antipadrão 1**.

---

## Entregáveis obrigatórios em PRs que criam/modificam agentes

Toda modificação em agentes do Hub deve incluir os **9 entregáveis**:

1. **Função cognitiva identificada** — qual trabalho intelectual o agente executa
2. **Análise do catálogo** — quais agentes existentes foram considerados
3. **Justificativa** — por que nenhum existente serviu (se aplicável)
4. **Posicionamento na matriz de decisão** — qual das 5 linhas o caso se enquadra
5. **Casos de uso** — atuais e futuros previstos (mínimo 2)
6. **Assinatura de função** — o que só esse agente faz, em uma frase
7. **`system_prompt` inicial** — proposto
8. **Estratégia de prompts** — o que vai no `system_prompt` vs o que vai em `instruction_sources`
9. **Previsão de refinamento** — quem acompanha evolução

---

## Revisão periódica

Este documento deve ser revisado a cada novo rito ou feature do Hub que envolva IA.

Se, ao longo do tempo, o catálogo de agentes crescer **além de 14 agentes ativos**, revisar se há consolidação possível.

---

## Resumo em uma frase

> **Antes de criar agente novo, prove que nenhum existente serve. Se criar, faça genérico por função cognitiva. Variação vive no input, refinamento vive no agente, adaptação contextual vive em `instruction_sources`.**
