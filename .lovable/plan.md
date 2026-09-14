# Prompt para o projeto comercial.jetimob.com — cadastro de pessoas a partir dos usuários do Next

## Como usar

1. Em `https://next.jetimob.com/settings/api-keys` (BU desejada), gere uma chave
   com acesso de **leitura** no módulo "Usuários e times". Copie a chave
   (`jet_...`) — ela só aparece uma vez — e também o **endereço base da API**
   mostrado no card de documentação da mesma página.
2. No projeto `comercial.jetimob.com`, salve a chave como segredo
   `NEXT_HUB_API_KEY` e o endereço base como `NEXT_HUB_API_URL`
   (nunca no código do site, só no cofre de segredos do backend).
3. Cole o prompt abaixo no chat daquele projeto.

---

## Prompt (copiar a partir daqui)

Quero um fluxo de adição de pessoas neste projeto que puxe os usuários já
cadastrados no Hub da Jetimob (next.jetimob.com), em vez de digitar tudo à mão.

Contexto da API do Hub:

- Autenticação: header `x-api-key: <chave>` (a chave começa com `jet_`).
  A chave é escopada a uma unidade de negócio — todo retorno já vem filtrado por
  ela, não existe parâmetro de BU.
- A chave e o endereço base estão nos segredos do backend:
  `NEXT_HUB_API_KEY` e `NEXT_HUB_API_URL`.
  A chave **nunca** pode ir para o frontend nem para variáveis `VITE_*`;
  todas as chamadas passam por uma função de backend deste projeto.
- Endpoints de leitura disponíveis:
  - `GET /users?limit=100&offset=0` → lista paginada; resposta
    `{ data: [...], pagination: { limit, offset, total } }`
  - `GET /users/by-email?email=<email>` → `{ data: {...} }` ou 404
  - `GET /users/:id` → `{ data: {...} }`
  - `GET /teams` e `GET /areas` → mesma forma paginada
- Campos de cada usuário: `id`, `display_name`, `first_name`, `last_name`,
  `email`, `work_email`, `photo_url`, `employment_status`
  (`active` | `vacation` | `terminated` | `external`), `team_id`,
  `job_title_id`, `work_mode` (`onsite` | `hybrid` | `remote`),
  `role_in_bu` (só na listagem).
- Erros vêm como `{ error: { code, message } }`. Trate 401 (chave inválida),
  403 (chave sem o escopo `users:read`), 429 (limite por minuto — respeite o
  header `Retry-After`) e 404.
- A API é somente leitura para usuários: não crie, edite nem remova nada no Hub.

O que construir:

1. Uma função de backend `hub-users` que receba `search`, `limit` e `offset`,
   chame `GET /users` no Hub com a chave do segredo e devolva apenas os campos
   necessários (id, nome, e-mail, foto, time, situação). Ela deve exigir usuário
   autenticado neste projeto e nunca repassar a chave nem a resposta bruta.
2. Uma tela/modal "Adicionar pessoa" com duas opções:
   - **Importar do Hub** (padrão): busca por nome ou e-mail com resultados
     paginados, seleção múltipla, e um aviso de "já cadastrado" para quem já
     existe aqui (comparar por e-mail, considerando `email` e `work_email`).
   - **Cadastro manual**: formulário normal, para quem não está no Hub.
3. Ao confirmar a importação, criar os registros locais guardando também
   `hub_profile_id` (o `id` do Hub) para futuras sincronizações; usar upsert por
   e-mail para não duplicar. Mostrar um resumo: importados, ignorados
   (já existiam), com erro.
4. Por padrão trazer apenas pessoas com `employment_status = 'active'`, com um
   filtro para incluir as demais.
5. Cache das buscas no cliente com invalidação após a importação, estados de
   carregamento e vazio, mensagens de erro em português, e nenhuma chave
   sensível no bundle.

Não implemente login novo: o acesso continua o que já existe neste projeto.

---

## Detalhes técnicos (referência)

- A API do Hub é a edge function `bu-api`, autenticada por hash SHA-256 da
  chave, com escopos `<modulo>:<read|write>`; `users` é somente leitura.
- Limite de paginação: `limit` máximo 500 (padrão 100).
- Rate limit por chave (padrão configurado na criação); excedido → 429 com
  `Retry-After: 60`.
- Uso e latência de cada chamada ficam registrados em
  `/settings/api-keys` (aba de uso), útil para depurar a integração.
