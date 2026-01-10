# OKR Wizards - Uma Jornada Guiada de Gestão por Resultados

> Documento de storytelling para análise e melhoria dos wizards de OKRs do Hub da Jet.
> Data: Janeiro 2026 | Versão: 1.0

---

## Introdução

No Hub da Jet, acreditamos que **gestão de OKRs não é sobre preencher formulários** — é sobre criar rituais que conectem estratégia à execução diária. Por isso, desenvolvemos uma família de **wizards guiados** que transformam processos complexos em jornadas intuitivas, adaptadas ao papel de cada pessoa na organização.

Cada wizard foi desenhado para um momento específico do ciclo de OKRs e para uma persona distinta. Juntos, eles formam um **ecossistema de rituais** que mantém a organização alinhada, do colaborador individual ao C-Level.

---

## A Família de Wizards

### Visão Geral

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CICLO TRIMESTRAL                                  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  PLANEJAMENTO (Início do Q)                                       │   │
│  │                                                                    │   │
│  │  🎯 OKR Creation Wizard ─────────────────────────────────────────│   │
│  │     Líder + Time → Define objetivos e KRs para o trimestre        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  EXECUÇÃO (Semanalmente)                                          │   │
│  │                                                                    │   │
│  │  👤 Collaborator Check-in ──── Individual atualiza seus KRs       │   │
│  │            ↓                                                       │   │
│  │  📋 Leader Prep ───────────── Líder prepara a reunião do time     │   │
│  │            ↓                                                       │   │
│  │  👥 Team Check-in ─────────── Time discute coletivamente          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  ALINHAMENTO ESTRATÉGICO (Mensal)                                 │   │
│  │                                                                    │   │
│  │  🔄 Managers Check-in ─────── Gestores alinham entre áreas        │   │
│  │            ↓                                                       │   │
│  │  👑 C-Level Check-in ──────── Executivos revisam estratégia       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. 🎯 OKR Creation Wizard — "A Orquestra do Planejamento"

### O Momento
Início de cada trimestre. O time precisa definir seus OKRs alinhados à estratégia da empresa.

### A Persona
**Líder de time** (Squad Lead, Tech Lead, Head de Área) conduzindo o planejamento com seu time.

### A Jornada (10 passos)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INTRODUÇÃO                                                              │
│  ┌─────────┐                                                            │
│  │  Intro  │  Saudação personalizada + explicação do processo           │
│  └────┬────┘  "Olá, João! É hora de definir os OKRs do time Revenue."   │
│       │                                                                  │
│       ▼                                                                  │
│  CONTEXTO ESTRATÉGICO                                                    │
│  ┌─────────┐                                                            │
│  │ Context │  Mostra OKRs de empresa e KPIs estratégicos                │
│  └────┬────┘  "Como seu time pode impactar essas metas?"                │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────┐                                                        │
│  │ Retrospect. │  Análise automática do ciclo anterior                  │
│  └─────┬───────┘  "Vocês atingiram 78%. O que aprendemos?"              │
│        │                                                                 │
│        ▼                                                                 │
│  DEFINIÇÃO DO OBJETIVO                                                   │
│  ┌───────────┐                                                          │
│  │ Objective │  Criação do título e descrição do objetivo               │
│  └─────┬─────┘  Input: título inspirador + descrição do impacto         │
│        │                                                                 │
│        ▼                                                                 │
│  ┌─────────┐                                                            │
│  │ Sharing │  Define se é objetivo compartilhado com outros times       │
│  └────┬────┘  "Marketing quer contribuir? Como dividimos?"              │
│       │                                                                  │
│       ▼                                                                  │
│  PLANEJAMENTO DE KRs                                                     │
│  ┌─────────┐                                                            │
│  │ KR Type │  Planeja quantos KRs de cada tipo                          │
│  └────┬────┘  Foundational (core) / Contribution / Enabler              │
│       │                                                                  │
│       ▼                                                                  │
│  ┌───────────┐                                                          │
│  │ KR Detail │  Para cada KR: título, métrica, meta, responsável        │
│  └─────┬─────┘  Loop: cria KR → define detalhes → próximo KR            │
│        │                                                                 │
│        ▼                                                                 │
│  RISCOS E AÇÕES                                                          │
│  ┌──────────────┐                                                       │
│  │ Dependencies │  Mapeia dependências de outros times                  │
│  └──────┬───────┘  "Quem precisa entregar algo para vocês?"             │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────┐                                                       │
│  │ Initiatives  │  Define ações/projetos que impulsionam KRs            │
│  └──────┬───────┘  Vincula iniciativas aos KRs                          │
│         │                                                                │
│         ▼                                                                │
│  CONCLUSÃO                                                               │
│  ┌────────┐                                                             │
│  │ Review │  Resumo completo + criação do OKR                           │
│  └────────┘  "Tudo certo? Clique para criar seu OKR!"                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Funcionalidades Especiais
- **Persistência de rascunho**: localStorage + banco de dados (nunca perde dados)
- **URL State**: cada passo fica na URL, permitindo compartilhar link do wizard
- **Insights de IA**: Vic (nossa IA) analisa contexto e sugere reflexões
- **Retrospectiva automática**: puxa dados do ciclo anterior sem esforço

### Dores que Resolve
- Times criando OKRs desconectados da estratégia
- Perda de trabalho ao fechar aba acidentalmente
- Líderes sem visibilidade do ciclo anterior
- Falta de rastreabilidade de dependências

---

## 2. 👤 Collaborator Check-in Wizard — "O Ritual Individual"

### O Momento
Sexta-feira (ou qualquer momento da semana). O colaborador precisa atualizar seus KRs.

### A Persona
**Qualquer pessoa com KRs atribuídos** — desenvolvedores, designers, analistas, etc.

### A Jornada (5 passos)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  👤 CHECK-IN DO COLABORADOR                                              │
│                                                                          │
│  ┌─────────┐  Mostra todos os KRs do usuário                            │
│  │ Context │  Estatísticas: total, em dia, atrasados                    │
│  └────┬────┘  "Você tem 4 KRs. 2 precisam de atenção."                  │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────┐  Para cada KR, sequencialmente:                            │
│  │ Check-in│  • Valor atual da métrica                                  │
│  └────┬────┘  • Nível de confiança (😟 😐 😊)                            │
│       │       • Comentário opcional                                      │
│       │       • Bloqueadores                                             │
│       │       [Salvar e Próximo] ou [Pular]                              │
│       ▼                                                                  │
│  ┌────────────┐  Mostra iniciativas vinculadas aos KRs                  │
│  │ Initiatives│  Permite marcar como "em risco"                         │
│  └──────┬─────┘  "A integração com Salesforce está travada?"            │
│         │                                                                │
│         ▼                                                                │
│  ┌────────────┐  Duas perguntas abertas:                                │
│  │ Reflection │  "O que mais impactou seus resultados?"                 │
│  └──────┬─────┘  "Precisa de ajuda em algo específico?"                 │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────┐  Resumo copiável (Markdown)                                │
│  │ Summary │  Estatísticas + KRs atualizados + bloqueios                │
│  └─────────┘  [Copiar] [Ver OKRs] [Fechar]                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Funcionalidades Especiais
- **Modo sequencial**: um KR por vez, menos sobrecarga cognitiva
- **Confiança visual**: emojis para indicar sentimento (baixa/média/alta)
- **Resumo copiável**: Markdown para colar no Slack/Teams
- **Conexão com iniciativas**: não é só sobre números, mas sobre ações

### Dores que Resolve
- Check-ins esquecidos (aparece no dashboard às sextas)
- Formulários longos e cansativos
- Desconexão entre KRs e trabalho real (iniciativas)
- Líderes sem visibilidade de bloqueios

---

## 3. 📋 Leader Prep Wizard — "A Preparação do Maestro"

### O Momento
Antes da reunião de check-in do time. Geralmente segunda-feira de manhã.

### A Persona
**Líder de time** se preparando para conduzir a reunião semanal.

### A Jornada (4 passos)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📋 PREPARAÇÃO DO LÍDER                                                  │
│                                                                          │
│  ┌──────────┐  Dashboard do time:                                       │
│  │ Overview │  • Progresso médio dos KRs                                │
│  └────┬─────┘  • KRs em risco / atrasados                               │
│       │        • Checkins pendentes                                      │
│       │        "Seu time está em 67%. 2 KRs precisam de atenção."       │
│       ▼                                                                  │
│  ┌────────────┐  Alertas automáticos:                                   │
│  │ Highlights │  • KRs sem atualização há 14+ dias                      │
│  └──────┬─────┘  • KRs marcados como bloqueados                         │
│         │        • Insights da IA sobre padrões                          │
│         │        "Ana não atualizou há 18 dias. Tudo bem?"              │
│         ▼                                                                │
│  ┌──────┐  Marcar KRs para discussão na reunião                         │
│  │ Prep │  • Checkbox: discutir / não discutir                          │
│  └──┬───┘  • Anotações para a reunião                                   │
│     │      "Quero entender por que Vendas Q4 está travado."             │
│     ▼                                                                    │
│  ┌───────────┐  Contexto de nível superior                              │
│  │ Alignment │  • OKRs da área/empresa                                  │
│  └───────────┘  • Como o time contribui                                 │
│                 [Iniciar Check-in do Time]                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Funcionalidades Especiais
- **Insights automáticos**: IA identifica padrões (estagnação, risco)
- **Marcação para discussão**: prepara pauta da reunião
- **Conexão direta**: ao concluir, abre o Team Check-in Wizard

### Dores que Resolve
- Líderes entrando em reunião sem preparação
- Reuniões improdutivas (discutindo tudo ou nada)
- Falta de visibilidade de problemas silenciosos
- Desconexão entre time e estratégia superior

---

## 4. 👥 Team Check-in Wizard — "A Reunião Guiada"

### O Momento
Reunião semanal do time. Presencial ou remota, com todos os membros.

### A Persona
**Líder conduzindo** + **time participando** da discussão coletiva.

### A Jornada (4 passos)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  👥 CHECK-IN DO TIME                                                     │
│                                                                          │
│  ┌─────────┐  Tela inicial da reunião:                                  │
│  │ Opening │  • Nome do time + ciclo                                    │
│  └────┬────┘  • KRs marcados para discussão (do Prep)                   │
│       │       • Resumo rápido do status                                  │
│       │       "Time Revenue - Q1 2026. 3 itens na pauta."               │
│       ▼                                                                  │
│  ┌───────────┐  Para cada KR marcado:                                   │
│  │ KR Review │  • Card com status, progresso, último check-in           │
│  └─────┬─────┘  • Espaço para discussão                                 │
│        │        • Botão: [Marcar como revisado]                          │
│        │        "O que está impedindo progresso aqui?"                   │
│        ▼                                                                 │
│  ┌─────────────┐  Iniciativas do time:                                  │
│  │ Initiatives │  • Quais estão avançando                               │
│  └──────┬──────┘  • Quais estão travadas                                │
│         │         "A migração de dados atrasou. Impacto?"               │
│         ▼                                                                │
│  ┌───────────┐  Fechamento da reunião:                                  │
│  │ Decisions │  • Registrar decisões tomadas                            │
│  └───────────┘  • Checklist: "Sabemos no que focar?"                    │
│                 • Checklist: "Sabemos o que NÃO fazer?"                  │
│                 • Checklist: "Sabemos quem é responsável?"               │
│                 [Concluir Check-in]                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Funcionalidades Especiais
- **Integração com Leader Prep**: pauta já montada
- **Marcar como revisado**: tracking de quais KRs foram discutidos
- **Checklist de encerramento**: garante que a reunião foi produtiva
- **Registro de decisões**: histórico consultável depois

### Dores que Resolve
- Reuniões sem pauta clara
- Itens discutidos mas não resolvidos
- Falta de registro do que foi decidido
- Times saindo da reunião sem clareza

---

## 5. 🔄 Managers Check-in Wizard — "O Fórum de Gestores"

### O Momento
Encontro mensal de gestores de diferentes áreas. Foco em dependências cruzadas.

### A Persona
**Gestores de área** (Heads, Diretores) discutindo entre si.

### A Jornada (3 passos)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔄 CHECK-IN DE GESTORES                                                 │
│                                                                          │
│  ┌──────────┐  Visão consolidada de todas as áreas:                     │
│  │ Panorama │  • Progresso médio por área                               │
│  └────┬─────┘  • Áreas em risco                                         │
│       │        • Comparativo entre times                                 │
│       │        "Revenue: 72%, Produto: 65%, Tech: 81%"                  │
│       ▼                                                                  │
│  ┌──────────────┐  Dependências entre áreas:                            │
│  │ Cross Issues │  • Quem está bloqueando quem                          │
│  └──────┬───────┘  • Compromissos não cumpridos                         │
│         │          • Riscos compartilhados                               │
│         │          "Tech prometeu API para Revenue em 15/jan."          │
│         ▼                                                                │
│  ┌─────────────┐  Decisões de ajuste:                                   │
│  │ Adjustments │  • Repriorização de recursos                           │
│  └─────────────┘  • Novos compromissos                                  │
│                   • Escalações necessárias                               │
│                   [Concluir Check-in]                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Funcionalidades Especiais
- **Visão cross-área**: todas as áreas lado a lado
- **Mapeamento de dependências**: quem depende de quem
- **Registro de ajustes**: compromissos formalizados

### Dores que Resolve
- Silos entre áreas
- Dependências não mapeadas
- Promessas não cumpridas sem visibilidade
- Falta de fórum para resolver bloqueios

---

## 6. 👑 C-Level Check-in Wizard — "A Revisão Estratégica"

### O Momento
Revisão mensal da diretoria. Foco em OKRs de empresa e direcionamentos.

### A Persona
**C-Level** (CEO, CTO, CFO, etc.) revisando a estratégia.

### A Jornada (4 passos)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  👑 CHECK-IN ESTRATÉGICO                                                 │
│                                                                          │
│  ┌──────────────┐  OKRs de empresa:                                     │
│  │ Company OKRs │  • Status de cada objetivo estratégico                │
│  └──────┬───────┘  • Progresso consolidado                              │
│         │          • OKRs em risco                                       │
│         │          "Crescimento: 45% | Produto: 62% | Eficiência: 78%"  │
│         ▼                                                                │
│  ┌──────────┐  Análises e insights:                                     │
│  │ Insights │  • Tendências identificadas                               │
│  └────┬─────┘  • Correlações entre métricas                             │
│       │        • Alertas estratégicos                                    │
│       │        "Crescimento está 30% abaixo do esperado."               │
│       ▼                                                                  │
│  ┌───────────┐  Decisões estratégicas:                                  │
│  │ Decisions │  • O que ajustar na estratégia                           │
│  └─────┬─────┘  • Repriorização de investimentos                        │
│        │        "Pausar iniciativa X para focar em Y."                  │
│        ▼                                                                 │
│  ┌────────────┐  Comunicação para a organização:                        │
│  │ Directives │  • Mensagens para cascatear                             │
│  └────────────┘  • Novas diretrizes                                     │
│                  [Concluir Check-in]                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Funcionalidades Especiais
- **Visão de portfólio**: todos os OKRs de empresa
- **Insights estratégicos**: IA analisa tendências
- **Decisões formais**: registro de decisões executivas
- **Diretrizes**: mensagens para cascatear na organização

### Dores que Resolve
- Reuniões de diretoria sem dados
- Decisões estratégicas sem registro
- Falta de cascateamento de diretrizes
- Desconexão entre C-Level e operação

---

## Arquitetura Técnica

### Infraestrutura Compartilhada

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FULL-PAGE WIZARD SHELL                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Componente base para todos os wizards:                          │    │
│  │  • Stepper lateral com indicador de progresso                    │    │
│  │  • Header com título, subtítulo e contexto                       │    │
│  │  • Área de conteúdo scrollável                                   │    │
│  │  • Indicador de "salvando rascunho..."                           │    │
│  │  • Botões: Salvar Rascunho / Descartar / Fechar                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  PERSISTÊNCIA DE RASCUNHOS                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Duas camadas:                                                    │    │
│  │  1. localStorage: imediato, offline-first                        │    │
│  │  2. okr_wizard_sessions: sync explícito ao clicar "Salvar"       │    │
│  │                                                                   │    │
│  │  Benefícios:                                                      │    │
│  │  • Nunca perde dados ao fechar aba                                │    │
│  │  • Pode continuar em outro dispositivo                            │    │
│  │  • Histórico de sessões para auditoria                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  URL STATE                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Estados na URL:                                                  │    │
│  │  • /okrs/create?team=xxx&step=objective                           │    │
│  │  • /wizards/leader-prep?team=xxx                                  │    │
│  │                                                                   │    │
│  │  Benefícios:                                                      │    │
│  │  • Compartilhar link do wizard                                    │    │
│  │  • Histórico do navegador funciona                                │    │
│  │  • Bookmarks por passo                                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Dados

```sql
-- Tabela de sessões de wizard
CREATE TABLE okr_wizard_sessions (
  id UUID PRIMARY KEY,
  bu_id UUID NOT NULL,              -- Unidade de negócio
  cycle_id UUID,                    -- Ciclo (Q1, Q2...)
  team_id UUID,                     -- Time (se aplicável)
  wizard_type TEXT NOT NULL,        -- collaborator, leader-prep, etc.
  started_by UUID NOT NULL,         -- Quem iniciou
  started_at TIMESTAMPTZ,           -- Quando começou
  completed_at TIMESTAMPTZ,         -- Quando terminou
  status TEXT,                      -- in_progress, completed, abandoned
  session_data JSONB,               -- Dados do rascunho
  step_actions JSONB[],             -- Histórico de ações por passo
  completed_steps TEXT[],           -- Passos já concluídos
  metadata JSONB                    -- Contexto adicional
);
```

---

## Oportunidades de Melhoria

### 1. Experiência do Usuário
- [ ] **Onboarding contextual**: primeira vez em cada wizard, mostrar tour guiado
- [ ] **Atalhos de teclado**: navegar entre passos com setas
- [ ] **Modo foco**: esconder stepper lateral durante edição intensa
- [ ] **Preview mobile**: alguns wizards são longos demais para mobile

### 2. Inteligência Artificial
- [ ] **Sugestões de KRs**: baseado em histórico e benchmark
- [ ] **Análise de sentimento**: detectar frustração nos comentários
- [ ] **Previsão de risco**: antecipar KRs que vão falhar
- [ ] **Resumo executivo automático**: gerar síntese para líderes

### 3. Colaboração
- [ ] **Check-in em grupo**: colaboradores fazendo check-in juntos
- [ ] **Comentários inline**: discutir KRs dentro do wizard
- [ ] **Menções**: @mencionar pessoas nos comentários
- [ ] **Notificações inteligentes**: lembrar de check-in pendente

### 4. Gamificação
- [ ] **Streaks**: sequência de check-ins sem falhar
- [ ] **Conquistas**: badges por comportamentos positivos
- [ ] **Leaderboard de times**: ranking de consistência

### 5. Integrações
- [ ] **Slack/Teams**: resumo automático após check-in
- [ ] **Calendário**: agendar reunião de check-in
- [ ] **Jira/Linear**: sincronizar iniciativas

---

## Métricas de Sucesso

| Métrica | Descrição | Meta |
|---------|-----------|------|
| Taxa de conclusão | % de wizards iniciados que são concluídos | > 85% |
| Tempo médio | Minutos para completar cada wizard | < 10min |
| Frequência | % de usuários fazendo check-in semanal | > 80% |
| NPS do wizard | Satisfação com a experiência | > 50 |
| Rascunhos recuperados | Sessões retomadas após interrupção | Tracking |

---

## Conclusão

Os wizards de OKRs do Hub da Jet não são apenas formulários bonitos — são **rituais de gestão** que criam uma cadência de alinhamento em toda a organização. Do colaborador atualizando seu KR na sexta-feira ao CEO revisando a estratégia mensalmente, cada pessoa tem seu momento guiado de reflexão e ação.

O objetivo final é simples: **fazer com que OKRs sejam fáceis de manter e impossíveis de esquecer**.

---

*Documento gerado para análise e brainstorming de melhorias. Sinta-se à vontade para questionar, sugerir e desafiar qualquer aspecto descrito aqui.*
