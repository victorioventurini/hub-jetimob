# Corrigir "Erro ao carregar usuários — Sessão expirada"

## O que está acontecendo

Em `next.jetimob.com`, a sessão de login passou a ser guardada em um cookie do domínio
`jetimob.com` (mudança feita para o login único entre os sistemas). Porém a conexão usada
pelas telas de cada BU continua procurando a sessão no armazenamento antigo do navegador,
onde não existe mais nada. Resultado: a tela de Usuários pergunta "existe sessão?", recebe
"não" e mostra "Sessão expirada. Por favor, faça login novamente." — mesmo com o usuário
logado normalmente (o restante das telas funciona porque as requisições reaproveitam o
token por outro caminho).

Confirmado no código: o cliente por BU está fixado no armazenamento local, enquanto o
cliente de login usa o cookie compartilhado.

## Correção

1. Alinhar as duas conexões: a conexão por BU passa a ler a sessão da mesma fonte
   compartilhada usada pelo login (cookie em `jetimob.com`, com queda para o
   armazenamento local em preview/localhost).
2. Na tela de Usuários, a verificação de sessão passa a usar a sessão de autenticação
   já disponível na aplicação, em vez de consultar a conexão por BU.
3. Aplicar o mesmo ajuste nos outros pontos que fazem essa mesma verificação pela
   conexão por BU (mensagens de tickets, comentários de projetos, sedes da BU,
   parceiros/contatos externos), que podem falhar do mesmo jeito.

## Detalhes técnicos

- `src/integrations/supabase/buScopedClient.ts`: trocar `storage: localStorage` por
  `sharedSessionStorage()` (mesma storage do `globalClient`), mantendo
  `autoRefreshToken: false`, `detectSessionInUrl: false` e o lock no-op. Assim
  `created.auth.getSession()` hidrata de verdade em `*.jetimob.com`.
- `src/pages/Users.tsx` (queryFn, ~linha 115): remover o
  `buScopedSupabase.auth.getSession()` e usar a sessão do `useAuth()` / `globalClient`
  como guarda.
- Mesmo padrão em `useTicketMessageMutations.ts`, `useProjectCommentMutations.ts`,
  `useBuLocations.ts`, `usePartners.ts`, `usePartnerContactGlobal.ts`.
- Sem mudanças de banco, RLS ou schema. O envio do header `x-current-bu-id` e a
  injeção de token no fetch continuam iguais.

## Verificação

- Abrir `/users` na BU Jetimob e confirmar a lista carregando (sem o erro).
- Trocar de BU e confirmar que a lista muda corretamente.
- Enviar uma mensagem em ticket e um comentário em projeto para validar as guardas
  ajustadas.
