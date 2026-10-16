# Login de usuários internos somente via Google

## Regras
- Internos entram **só com Google**, e só com estes domínios:
  - Jetimob: `@jetimob.com`
  - Victorio: `@victorio.com.br`
  - Soul: `@jetxp.com.br`
- Externos (parceiros) continuam entrando pelo **link no e-mail**.
- A pessoa interna com `@gmail.com` passa a ser **externa** (segue pelo link no e-mail).

## O que muda para o usuário
- Tela de entrada ganha o botão "Entrar com Google" como caminho principal.
- Se alguém com e-mail de um desses domínios pedir o link por e-mail, aparece a mensagem: "Colaboradores entram com a conta Google corporativa."
- Se alguém entrar com uma conta Google fora dos domínios e sem cadastro de parceiro, o acesso é recusado com aviso claro.
- O SSO entre sistemas (comercial.jetimob.com etc.) continua valendo: o login pelo Google grava a mesma sessão compartilhada.

## Detalhes técnicos
1. Ativar o login Google (credenciais gerenciadas) e usar `lovable.auth.signInWithOAuth("google", { redirect_uri: origin + "/auth/callback" })`, preservando `next` separadamente (sessionStorage) e respeitando `resolveAuthTarget`.
2. `request-magic-link`: recusar envio para domínios internos (lista central em `_shared/internal-domains.ts`), retornando código `use_google_sso`.
3. Bloqueio no servidor (não só na tela): trigger em `auth.identities`/hook validando que contas com domínio interno só têm sessão via provider `google`; `AuthCallback` também checa `app_metadata.provider` e faz `signOut` se um interno vier por e-mail.
4. Contas Google novas de domínio interno são ligadas ao perfil existente pelo e-mail (mesmo `auth.users`, sem duplicar), mantendo histórico e acessos.
5. Contas Google fora dos domínios: só aceitas se o e-mail for contato de parceiro ativo; senão `signOut` + aviso.
6. Converter o perfil `@gmail.com` para `user_type='external'` e papel externo nas BUs.
7. Registrar a regra em `AGENTS.md` e atualizar `docs/canonical/SSO_VIBECODING.md`.
8. Teste: login Google interno, tentativa de link por e-mail interno (recusado), login externo por link.

## Atenção
- Hoje não existe ninguém com `@victorio.com.br` — a regra já fica pronta para quando houver.
- Os domínios precisam ser contas Google Workspace; quem não tiver conta Google no domínio ficará sem acesso.
