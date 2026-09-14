# Servidor MCP do Next

Expõe o Next como servidor MCP para assistentes (Claude, ChatGPT, Cursor).
Somente leitura, sempre com as permissões da pessoa conectada.

## Endereço

`https://<project-ref>.supabase.co/functions/v1/mcp`

Também visível em **Configurações > Chaves de API** (card "Consultar o Next por assistentes de IA").

## Autenticação

- Supabase Auth atua como authorization server OAuth 2.1 com DCR
  (`supabase--configure_oauth_server`).
- Consentimento em `/.lovable/oauth/consent` (`src/pages/OAuthConsent.tsx`,
  rota pública). Sem sessão, redireciona para `/auth?next=<url completa>`
  (login por link mágico do Next).
- `defineMcp.auth = auth.oauth.issuer({ issuer: https://<ref>.supabase.co/auth/v1 })`.
- Nenhuma ferramenta usa `service_role` nem `anon`: todo acesso passa por
  `supabaseForUser(ctx)` (`src/lib/mcp/supabase.ts`), com o token verificado no
  header — RLS roda como a pessoa.

## Estrutura

```text
src/lib/mcp/
  index.ts                 defineMcp (name "next") — registro das ferramentas
  supabase.ts              fábrica de cliente com o token do usuário
  lib/context.ts           identidade, resolução de BU e de pessoa
  lib/result.ts            jsonResult, assertNoError (PT-BR), clampLimit
  lib/args.ts              argumentos comuns (bu, limite, busca)
  lib/person-performance.ts agregação de performance por pessoa
  tools/*.ts               uma ferramenta por arquivo
supabase/functions/mcp/index.ts  GERADO pelo mcpPlugin() — nunca editar
```

## Ferramentas (21, todas de leitura)

`whoami`, `list_people`, `person_performance`, `team_performance`,
`list_org_structure`, `list_cycles`, `list_objectives`, `list_key_results`,
`list_checkins`, `list_initiatives`, `list_kpis`, `kpi_history`,
`list_projects`, `list_tickets`, `get_ticket`, `list_rituals`, `list_assets`,
`list_assessments`, `list_partners`, `list_analyses`, `search_next`.

## Regras de manutenção

1. Uma ferramenta por arquivo em `src/lib/mcp/tools/`, registrada em `index.ts`.
2. BU sempre resolvida no servidor (`resolveScope`) via `bu_user_memberships`
   ou `partner_contact_bu_associations` — nunca aceitar identidade do input.
3. Colunas explícitas (sem `select('*')`); filtrar `deleted_at`/`cancelled_at`.
4. Progresso de KR sempre via `calculateProgress`; tendência de KPI via
   `classifyKpiTrendSeries`.
5. Sem campos sensíveis (CPF, data completa de nascimento, telefone pessoal).
6. Após qualquer mudança: `app_mcp_server--extract_mcp_manifest` e novo publish
   (o deploy da função `mcp` acontece na publicação).
7. Escrita (check-in, KPI, ticket) é etapa 2 — hoje o servidor é read-only.
