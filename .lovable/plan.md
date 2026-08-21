# Prompt para replicar o padrão de Login + Magic Link em outro projeto Lovable

Copie o bloco abaixo e cole no chat do outro projeto. Ele descreve as regras de UX e de sessão já validadas aqui (Auth.tsx, useAuth, useIdleTimeout, globalClient, request-magic-link, email-sender).

---

## Prompt (copiar daqui)

Implemente autenticação por **magic link** (sem senha) com a seguinte experiência e regras. Use Lovable Cloud para auth e edge functions.

### 1. Tela de login (`/auth`)

Layout em duas colunas: à esquerda um painel de marca (logo + tagline), à direita o formulário. Um único campo de e-mail + botão primário.

Três estados na mesma rota:
- `first-access`: e-mail vazio, título de boas-vindas, CTA "Entrar".
- `returning`: quando existe e-mail salvo, pré-preencher o campo e saudar pelo primeiro nome derivado do e-mail (`joao.silva@…` → "Olá, Joao"), com link secundário "Usar outro e-mail" que limpa o campo e volta para `first-access`.
- `link-sent`: confirmação "Enviamos um link para <e-mail>", instrução de checar a caixa de entrada/spam, botão "Reenviar link" com **cooldown de 60s** (contador visível) e link "Trocar e-mail".

Regras de "lembrar do usuário":
- Persistir o último e-mail usado em `localStorage` sob a chave `<app>_last_email`, no formato `{ email, savedAt }`, com **TTL de 30 dias**; ao ler, se expirado, remover a chave e tratar como primeiro acesso. Envolver leitura/escrita em `try/catch` (modo privativo pode lançar).
- Salvar o e-mail **somente depois** do envio bem-sucedido do link.
- Aceitar `?email=` na URL como override do valor salvo (útil para convites).

Redirecionos e estados de carregamento:
- Se já houver sessão, redirecionar para o destino original (`location.state.from`) ou `/`.
- Enquanto o auth carrega, exibir "Verificando sessão…", mas com **timeout de segurança de 5s** que revela o formulário mesmo assim — nunca deixar o usuário travado num spinner.
- Construir o `redirectTo` como `${window.location.origin}` + caminho de destino normalizado (só paths internos que começam com `/` e não com `//`; se vier um `next` aninhado, achatar para evitar loop de callback).

Mensagens de erro humanas (nunca códigos técnicos):
- E-mail com formato inválido: "Ops, esse e-mail não parece válido."
- Domínio/usuário não autorizado: erro inline abaixo do campo — "Esse e-mail não tem acesso ao <App>."
- Falha de rede/timeout: toast com orientação de tentar novamente.
- Erro inesperado: "Algo deu errado. Tenta de novo?"
- Limpar o erro inline assim que o usuário edita o e-mail.

### 2. Sessão e duração

- Um **único** cliente Supabase singleton (guardado em `globalThis` para sobreviver ao HMR) com `persistSession: true`, `autoRefreshToken: true`, `storage: localStorage` e `detectSessionInUrl: false`.
- **Não** substituir o lock nativo do GoTrue (Navigator LockManager) por no-op: ele coordena o refresh de token entre abas. Sem ele, duas abas consomem o mesmo refresh token e uma delas cai em sign-out silencioso.
- No `useAuth`, confiar apenas no evento `INITIAL_SESSION` do `onAuthStateChange` para hidratar a sessão inicial; **não** chamar `getSession()` em paralelo no mount (gera deadlock de lock). Manter um safety timeout de ~20s para liberar `isLoading`.
- Adicionar listener de `visibilitychange` que, ao voltar para a aba, revalida a sessão com `getSession()` de forma silenciosa (cobre retorno de sleep/VPN sem flash de tela de login).
- **Idle timeout de 8 horas** (1 jornada) via hook dedicado: monitorar `mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll`, `pointerdown` e `visibilitychange` (só quando `visible`); gravar o timestamp da última atividade em `localStorage` (funciona cross-tab e sobrevive a reload) e checar a cada 1 min; ao exceder, limpar a chave e fazer `signOut()`. Expor a constante de duração em um único lugar para ajuste fácil.

### 3. Callback do link

- Rota `/auth/callback` que lê `token_hash` e `type` como **query params** (não hash fragment — trackers de clique de provedores de e-mail removem o fragmento) e chama `verifyOtp({ token_hash, type: 'magiclink' })`.
- Classificar o erro em três categorias com CTA própria: `expired` ("Este link já foi usado ou expirou. Solicite um novo link."), `network` ("Sua rede ou navegador pode estar bloqueando a conexão" → tentar outra rede/janela anônima) e `generic`.
- Rota alternativa `/auth/confirm` com um botão "Acessar o <App>" que só então executa a verificação. Usar para domínios cujo gateway corporativo (Mimecast/Proofpoint/Defender ATP) faz *URL detonation* e consome o token single-use antes do usuário clicar. Manter a lista desses domínios como um array no backend, fácil de estender.

### 4. Edge function `request-magic-link`

Recebe `{ email, redirectTo }`, valida os campos e o formato do e-mail, checa se o e-mail/domínio é autorizado (usuários internos por domínio permitido + convidados externos cadastrados), gera o link com `auth.admin.generateLink({ type: 'magiclink' })` e envia o e-mail próprio (não o template padrão). Rodar as consultas de autorização em paralelo (`Promise.all`) para manter a resposta rápida. Logar tudo com um `requestId` e devolver erros tipados (`FORBIDDEN`, `INVALID_FORMAT`, `SERVICE_UNAVAILABLE`) com mensagem pronta para exibição.

### 5. Assunto e corpo do e-mail

**Assunto:** `Seu link de acesso ao <App> - DD/MM às HH:MM` (data/hora local do usuário, fuso do produto). O timestamp no assunto evita agrupamento na thread pelo cliente de e-mail e deixa óbvio qual é o link mais recente.

**Corpo (HTML inline, mobile-first, card branco de 480px centralizado sobre fundo `#f4f4f5`, radius 12px, padding 40px, fonte system-ui):**
- Topo: nome/logo do produto centralizado.
- `Olá, <PrimeiroNome>!` (capitalizado; fallback "usuário").
- `Clique no botão abaixo para acessar o <App>.` + nova linha: `Este link é válido por 10 minutos.`
- Botão CTA centralizado, cor primária da marca, texto branco, radius 8px, padding 14px 32px: **"Acessar o <App>"**.
- Nota discreta: `Se você não solicitou este link, pode ignorar este e-mail com segurança.`
- `<hr>` + rodapé em 12px cinza com a tagline do produto.
- Sem imagens externas obrigatórias, sem CSS em `<style>` e sem `dangerouslySetInnerHTML` — tudo inline para sobreviver a Gmail/Outlook.
- Toda URL contextual no e-mail deve ser **absoluta** (prefixar com o domínio público quando vier como path relativo).

Envio: usar o provedor de e-mail do projeto (no Lovable, os e-mails nativos), com fallback para um segundo provedor em caso de falha, e log estruturado do provedor usado.

---

## Observações

- O prompt acima é auto-contido: não depende de nenhum arquivo deste projeto.
- Ajuste `<App>`, a tagline, a cor primária e o fuso antes de colar.
