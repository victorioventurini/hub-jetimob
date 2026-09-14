# Consultar a performance de um jetimober pelo Claude

Objetivo: conectar o Claude (Desktop ou app) ao Hub e perguntar em linguagem natural
"como está a performance da Luisa?", recebendo dados reais da unidade — OKRs, KPIs,
check-ins, rituais e projetos da pessoa.

## Como vai funcionar

1. Em Configurações > Chaves de API você gera uma chave para a unidade (já existe hoje).
2. No Claude, você adiciona o Hub como conector, colando o endereço do Hub e a chave.
3. A partir daí o Claude passa a ter "ferramentas" do Hub e pode responder perguntas
   sobre qualquer pessoa da unidade daquela chave.

Tudo continua isolado por unidade: a chave só enxerga dados da unidade em que foi criada.

## Ferramentas que o Claude vai ganhar

- **Buscar pessoa** — encontra o jetimober por nome ou e-mail (evita ambiguidade).
- **Panorama de performance da pessoa** — a resposta pronta, com:
  - dados básicos: time, área, cargo, modelo de trabalho, situação;
  - OKRs: objetivos que lidera e KRs de que é responsável, com progresso, farol e
    orientação (crescer/reduzir/manter);
  - check-ins: último check-in por KR, atrasos e confiança declarada;
  - KPIs: indicadores sob responsabilidade dela, valor mais recente, meta e tendência;
  - rituais: participação no ciclo atual (pré-MBR/MBR/weekly) e pendências;
  - projetos: projetos e marcos em que está envolvida, com atrasos;
  - alertas: o que merece atenção (KR sem check-in, KPI fora da meta, marco atrasado).
- **Detalhes por área** — quatro ferramentas menores (OKRs, KPIs, projetos, rituais)
  para o Claude aprofundar quando você pedir mais detalhe.
- **Comparar time** — panorama resumido de todas as pessoas de um time.

O Claude recebe os dados e escreve a análise; o Hub entrega números, não opinião.

## Escopo e privacidade

- Só dados de trabalho. Nada de CPF, data de nascimento, telefone pessoal, endereço
  ou qualquer campo pessoal sensível — mesmo que a chave tenha permissão de leitura.
- A chave é da unidade, então quem tem a chave vê as pessoas daquela unidade.
  Recomendo criar uma chave separada só para esse uso, com permissão de leitura em
  Usuários, OKRs, KPIs, Projetos e Ritos, e revogá-la se vazar.
- Todo acesso fica registrado no log de uso das chaves.

## Detalhes técnicos

- Nova edge function `mcp` (`supabase/functions/mcp/index.ts`) implementando MCP sobre
  HTTP (JSON-RPC: `initialize`, `tools/list`, `tools/call`), com CORS.
- Autenticação reaproveitando o mesmo caminho de `bu-api`: header `x-api-key` com a
  chave `jet_...`; hash validado, `bu_id` resolvido da chave, checagem de escopos
  (`users:read`, `okrs:read`, `kpis:read`, `projects:read`, `rituals:read`) e registro em
  `bu_api_key_usage_logs` + rate limit já existentes. Extrair esse trecho de
  `bu-api/index.ts` para `_shared/bu-api-auth.ts` e usar nos dois.
- Agregação de performance em `supabase/functions/_shared/person-performance.ts`,
  com todas as consultas em `Promise.all`, colunas explícitas (sem `select('*')`),
  filtro `bu_id` obrigatório e `deleted_at`/`cancelled_at` filtrados conforme o padrão
  do projeto.
- Progresso de KR **sempre** via `_shared/okr-progress.ts` (`calculateKrProgress`),
  nunca cálculo inline.
- Identificação da pessoa por `profiles` + `bu_user_memberships` da BU da chave;
  KPIs por `effective_area`/`effective_team` e `kpi_data_contributors`;
  tendência de KPI pela mesma regressão linear usada em `/kpis/evolution`.
- Documentação do conector (endereço, cabeçalho, exemplos de perguntas) em
  `docs/canonical/MCP_SERVER.md`, e um card em Configurações > Chaves de API
  explicando como conectar no Claude.

## Fora do escopo agora

- Escrita via MCP (registrar check-in, atualizar KPI) — leitura primeiro.
- Login por pessoa no Claude (OAuth): a versão 1 usa chave da unidade.
