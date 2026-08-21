# Chaves de API por BU (Configurações)

Novo local em Configurações da BU para gerar, listar e revogar chaves de API que sistemas externos usam para consumir dados do Hub daquela BU. Ao criar a chave, o admin escolhe **quais módulos** ela acessa e **qual permissão** (somente leitura ou leitura + escrita) em cada um.

## O que foi verificado no projeto

- Existe uma API interna (`internal-api`) que autentica por um **único token compartilhado** guardado como segredo, expõe usuários/BUs/áreas/times de forma **global** (sem escopo de BU) e é somente leitura. Não serve para dar chave a terceiros por BU.
- Existe a tabela `automation_incoming_tokens` (BU-scoped, com hash de token, `allowed_actions`, rate limit, validade) usada pelo módulo de automações — mas hoje **sem nenhuma tela**: a página de automações só tem as abas Eventos, Ações e Logs. Ela é voltada a disparar ações, não a servir dados.
- As configurações da BU (`/settings`) são uma lista de cards (Permissões, Notificações, Áreas, Ritos, Parceiros). Não há nada de API.

Por isso a proposta cria uma superfície própria de chaves de API de leitura/escrita de dados, sem mexer nos tokens de automação.

## Experiência do usuário

Novo card em `/settings` → **Chaves de API**, visível e acessível apenas para administradores da BU, levando a `/settings/api-keys`:

- **Lista de chaves**: nome, sistema consumidor, módulos e nível de acesso (badges), prefixo da chave (ex.: `jet_a1b2…`), validade, último uso, status (ativa / expirada / revogada).
- **Criar chave** (diálogo): nome, descrição opcional, sistema consumidor, validade (30/90/365 dias ou sem expiração), e uma matriz de módulos com o nível por módulo:

```text
Módulo                Sem acesso   Leitura   Leitura e escrita
Usuários e times          o           x              o
OKRs                      o           o              x
KPIs                      o           x              o
Projetos                  x           o              o
Tickets                   x           o              o
Ritos                     x           o              o
```

- **Chave exibida uma única vez** após a criação, com botão de copiar e aviso de que não será mostrada novamente (só o hash é guardado).
- **Ações por chave**: revogar (com confirmação), renomear, editar escopos, e "gerar nova chave" (revoga e cria substituta).
- **Aba de uso**: últimas chamadas por chave (endpoint, status, data), para depuração de quem está consumindo.
- **Painel de documentação** na própria página: URL base, exemplo de chamada com `curl`, lista dos endpoints liberados pelos escopos escolhidos.

## Como a API funciona

- Autenticação por header `Authorization: Bearer <chave>`. A chave nunca é armazenada em texto — guardamos hash SHA-256 + prefixo visível para identificação.
- Toda requisição é resolvida para **uma BU** (a BU dona da chave); nenhum dado de outra BU é acessível, independentemente do endpoint.
- Cada endpoint exige um escopo (ex.: `okrs:read`, `kpis:write`). Sem o escopo, resposta 403.
- Endpoints de escrita ficam limitados ao essencial: registrar valor de KPI, criar check-in de KR e abrir ticket. O restante é leitura.
- Rate limit por chave (padrão 60 req/min) e registro de cada chamada para a aba de uso.
- Chaves revogadas ou expiradas respondem 401.

## Notas técnicas

- Nova tabela `bu_api_keys` (bu_id, name, description, consumer_system, key_hash, key_prefix, scopes text[], status, expires_at, last_used_at, created_by, revoked_at/by, soft delete) + `bu_api_key_usage_logs` (chave, método, rota, status, latência, ip, data). Ambas com GRANTs explícitos e RLS: leitura/gestão apenas para admin da BU (`is_current_bu(bu_id)` + checagem de admin), escrita de logs apenas via service role.
- Criação da chave em edge function (`bu-api-keys`), que valida sessão + admin da BU, gera o valor aleatório, grava só o hash e devolve o valor uma única vez. Frontend nunca gera nem guarda o segredo.
- Nova edge function `bu-api` como gateway público: valida a chave, resolve BU e escopos, aplica rate limit, roteia para handlers por módulo e grava o log. Reaproveita os shapes de usuários/times/áreas já existentes em `internal-api` (movidos para `_shared/`), sem alterar o comportamento atual daquela função.
- Frontend: `src/modules/settings/api-keys/` com `BuApiKeysPage`, diálogo de criação, tabela de chaves e aba de uso; hooks com query keys em `src/lib/queryKeys`, cliente BU-scoped, colunas explícitas (sem `select('*')`), filtros/abas em URL state.
- Rota `/settings/api-keys` protegida por `BuAdminRoute` (mesmo padrão de `/settings/rituals`), e novo card em `BuSettingsPage` renderizado só para admin da BU.
- Catálogo de escopos centralizado em um único arquivo, consumido pela UI e pelas edge functions, para não divergirem.
