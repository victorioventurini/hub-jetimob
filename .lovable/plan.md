# SSO centralizado nos projetos VibeCoding (Next como base de autenticação)

## Objetivo

O usuário loga uma única vez no Next. Ao abrir qualquer outro sistema VibeCoding
hospedado em um subdomínio de `jetimob.com`, ele já entra autenticado — sem novo
login, sem novo magic link. Cada sistema continua dono das suas próprias
permissões e dados; o Next fornece apenas a identidade.

## Como funciona (visão simples)

```text
                 ┌──────────────────────────┐
   login único → │  next.jetimob.com (Next) │  ← única tela de login / magic link
                 │  backend de autenticação │
                 └────────────┬─────────────┘
                              │ sessão gravada em cookie
                              │ domain = .jetimob.com
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
 comercial.jetimob.com   rh.jetimob.com      outro.jetimob.com
 (projeto Lovable B)     (projeto C)         (projeto D)
 lê a sessão do cookie   idem                idem
 → usuário já logado     → já logado         → já logado
```

Pontos-chave:

1. **Um só emissor de identidade.** Só o backend do Next emite sessões. Os
   outros projetos não têm tela de login própria: se não houver sessão, eles
   redirecionam para `next.jetimob.com/auth?next=<url-de-volta>`.
2. **Sessão compartilhada por cookie de domínio.** Hoje a sessão do Next fica em
   `localStorage`, que não é compartilhado entre subdomínios. Trocamos o
   armazenamento por cookie com `domain=.jetimob.com`, `Secure`, `SameSite=Lax`.
   Assim todo subdomínio lê a mesma sessão automaticamente.
3. **Cada satélite mantém seu próprio backend** para os dados dele. Ele só ganha
   um segundo cliente de autenticação apontando para o backend do Next
   (URL + chave publicável do Next — ambas públicas, seguro no código).
4. **Autorização fica em cada app.** O satélite recebe `user_id` e e-mail da
   identidade central e resolve papéis/permissões internamente. Nada de RBAC do
   Next atravessando para os outros sistemas.
5. **Verificação server-side no satélite.** Quando o satélite precisa validar o
   usuário no backend dele, valida a assinatura do token contra as chaves
   públicas (JWKS) do emissor do Next. Para isso as chaves de assinatura do Next
   precisam estar em modo assimétrico (ES256) — passo de infraestrutura.
6. **Logout global.** Sair em qualquer app apaga o cookie no domínio raiz, então
   todos os sistemas caem juntos. Mantemos a regra atual de sessão com expiração
   por inatividade (8h) valendo para todos.

## Etapas de implementação

### Fase 1 — Next passa a ser o provedor de identidade (neste projeto)
1. Trocar o storage de sessão do cliente global para um adaptador de cookie em
   `.jetimob.com` (com fallback a `localStorage` no preview do Lovable, que não
   está no domínio).
2. Aceitar e validar o parâmetro `next` em `/auth` para URLs absolutas de
   subdomínios `*.jetimob.com` (hoje só aceita caminhos relativos), e devolver o
   usuário ao sistema de origem após o login/magic link.
3. Migrar as chaves de assinatura do backend para assimétricas (ES256) e liberar
   as URLs de retorno dos subdomínios na lista de redirects permitidos.
4. Expor um endpoint de identidade mínimo (`GET /identity/me`) no gateway já
   existente, retornando `user_id`, e-mail, nome e foto — sem dados de BU/RBAC.
5. Página de contas/sessões: opcional, listar sistemas conectados.

### Fase 2 — Kit de integração para os satélites
Um prompt/snippet padrão para colar em cada projeto Lovable, contendo:
- cliente de autenticação apontando para o backend do Next (URL + chave pública);
- adaptador de cookie idêntico (mesmo nome de chave, mesmo domínio);
- guarda de rota: sem sessão → redireciona para o `/auth` do Next com `next`;
- sincronização de perfil local a partir de `user_id` no primeiro acesso;
- middleware de backend validando o token via JWKS do emissor do Next.

### Fase 3 — Rollout
Aplicar em um satélite piloto, validar login, refresh entre abas e logout
global; depois replicar nos demais.

## Detalhes técnicos

- Chave de cookie: mesma usada pelo cliente de auth (`sb-<ref>-auth-token`),
  gravada como cookie particionado por tamanho se exceder ~4KB.
- Flags: `Secure; SameSite=Lax; Path=/; Domain=.jetimob.com`.
- Apenas o cliente global do Next mantém `autoRefreshToken: true`; nos satélites
  o cliente de identidade também precisa de refresh, mas com o mesmo cookie —
  isso é seguro porque o refresh é serializado pelo lock nativo do GoTrue.
- O satélite NUNCA escreve nas tabelas do Next. Se precisar de dados de perfil,
  consome `GET /identity/me`.
- Preview do Lovable (`*.lovable.app`) não compartilha cookie com
  `jetimob.com`: o adaptador detecta o host e cai para `localStorage`, então o
  SSO real só vale em produção (nos domínios).
- Restrição a considerar: SSO por cookie de domínio exige que todos os sistemas
  fiquem em subdomínios de `jetimob.com`. Um sistema fora desse domínio precisa
  do modelo OAuth (Next como Identity Provider) — dá para adicionar depois sem
  refazer a Fase 1.

## Fora de escopo
- RBAC/permissões centralizadas (cada app resolve as suas).
- Provisionamento automático de usuários nos satélites além do vínculo por `user_id`.
