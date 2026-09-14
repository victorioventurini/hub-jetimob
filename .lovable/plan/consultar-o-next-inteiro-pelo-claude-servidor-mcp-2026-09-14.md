# Consultar o Next inteiro pelo Claude (servidor MCP)

Objetivo: transformar o Next em um servidor MCP para que o Claude (e outros assistentes)
consultem tudo o que está registrado no Hub — pessoas, OKRs, KPIs, projetos, tickets,
ritos, ativos, avaliações, parceiros, times e áreas — respondendo perguntas como
"como está a performance da Luisa?", "quais KRs estão em risco no Q3?",
"quais tickets da Ferrigolo estão abertos?".

## Como você vai usar

1. No Claude, adicione o Next como conector (um endereço só).
2. Você entra com a sua conta do Next (a mesma do login por link).
3. O Claude passa a ver apenas o que você já vê no Hub: mesma unidade, mesmas permissões.
4. Pergunta em linguagem natural; o Claude escolhe as ferramentas e monta a resposta.

Sem chave para colar, sem senha, sem dado saindo das suas permissões.

## Ferramentas por módulo

**Pessoas e estrutura**
- buscar pessoa (nome/e-mail), ficha de trabalho, lista de times, áreas, squads, cargos.

**Performance da pessoa** (a pergunta que originou isso)
- panorama consolidado: time/área/cargo, OKRs que lidera, KRs de que é responsável com
  progresso e farol, últimos check-ins e atrasos, KPIs sob responsabilidade com valor,
  meta e tendência, projetos e marcos, participação nos ritos, e alertas do que merece
  atenção.

**OKRs**
- ciclos, objetivos (org e time), KRs com progresso e farol, check-ins, iniciativas,
  dependências e contribuições entre times.

**KPIs**
- lista de indicadores com responsável, meta, periodicidade e farol; série histórica;
  tendência (crescimento/estabilidade/queda); indicadores sem atualização.

**Projetos**
- projetos com saúde e responsável, marcos com prazos e atrasos, vínculos com KRs.

**Tickets**
- solicitações internas e externas com status, categoria, responsável, empresa parceira,
  prazo e histórico de mensagens.

**Ritos**
- ocorrências (weekly, MBR, QBR), quem entregou o pré-rito, resumos e decisões registradas.

**Ativos**
- inventário, chaves e brindes: o que existe, com quem está e movimentações.

**Avaliações**
- avaliações, convites, envios e resultados por pessoa.

**Parceiros**
- empresas parceiras, usuários externos vinculados e situação.

**Busca geral**
- uma ferramenta de busca ampla que encontra o registro por texto em qualquer módulo e
  indica qual ferramenta usar para aprofundar.

Todas de leitura nesta primeira versão. Escrita (registrar check-in, atualizar KPI,
abrir ticket) fica para uma segunda etapa, depois que você validar as respostas.

## Segurança e privacidade

- Login por conta, não por chave: o Claude age como você, com as regras de acesso do Hub
  (unidade ativa, permissões, visibilidade de tickets, dados de parceiros).
- Campos pessoais sensíveis ficam fora das ferramentas: CPF, data de nascimento completa,
  telefone pessoal e endereço nunca são retornados.
- Nenhuma ferramenta usa credencial privilegiada; tudo passa pelas mesmas travas do Hub.
- Cada consulta fica registrada para auditoria.

## Detalhes técnicos

- Servidor MCP com `@lovable.dev/mcp-js`: uma ferramenta por arquivo em
  `src/lib/mcp/tools/`, registro em `src/lib/mcp/index.ts` (`defineMcp`, name `next`,
  title `Next`), `mcpPlugin()` no `vite.config.ts`. A edge function
  `supabase/functions/mcp/index.ts` é gerada pelo plugin (nunca editada à mão) e
  precisa de deploy a cada mudança.
- Autenticação OAuth 2.1 do Supabase como authorization server
  (`supabase--configure_oauth_server`), rota de consentimento em
  `/.lovable/oauth/consent` reaproveitando o login por link do Next (preservando o
  destino em senha, e-mail e social), e `auth.oauth.issuer` com
  `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/auth/v1`.
- Cliente por usuário em `src/lib/mcp/supabase.ts` (`supabaseForUser`) encaminhando o
  token verificado — RLS roda como a pessoa. Proibido `service_role` e proibido
  `supabaseAnon` nas ferramentas.
- Escopo de BU: cada ferramenta aceita `bu` opcional (slug/nome); sem ela, usa a
  única unidade ativa da pessoa e, havendo várias, pede que escolha. Todo filtro por
  `bu_id` resolvido no servidor a partir de `bu_user_memberships` — nunca do input.
- Padrões do projeto: colunas explícitas (sem `select('*')`), filtros
  `deleted_at`/`cancelled_at`, agregações em `Promise.all`, progresso de KR sempre via
  `calculateKrProgress` (`_shared/okr-progress.ts`), tendência de KPI pela mesma
  regressão linear de `/kpis/evolution`.
- Consulta de performance agregada em `src/lib/mcp/lib/person-performance.ts`,
  reutilizada pela ferramenta de panorama e pela de time.
- Manifest validado (`extract_mcp_manifest`) e função `mcp` publicada ao fim.
- Documentação em `docs/canonical/MCP_SERVER.md` e card em Configurações explicando
  como conectar no Claude.
- As chaves de API por BU (`bu-api`) continuam como estão, para sistemas externos.

## Ordem de execução

1. Base: SDK, plugin, OAuth, consentimento, cliente por usuário, resolução de BU,
   ferramentas de pessoas e o panorama de performance.
2. OKRs, KPIs e projetos.
3. Tickets, ritos e busca geral.
4. Ativos, avaliações e parceiros.
