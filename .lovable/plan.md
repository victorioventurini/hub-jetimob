# Prompt pronto — Regras de login (magic link + lembrar e-mail)

Copie o texto abaixo e cole no outro projeto Lovable. A UI não está descrita — apenas comportamento e regras.

---

```text
Implemente a página de login (/auth) com autenticação exclusivamente por magic link
do Lovable Cloud (e-mail padrão do Lovable, sem domínio customizado). Não descrevo
a UI — siga os padrões do projeto. As REGRAS de comportamento são:

## 1. Magic link (envio padrão do Lovable)
- Use supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } }).
- emailRedirectTo = `${window.location.origin}/auth/callback?next=<destino>`.
- Crie a rota pública /auth/callback que aguarda a sessão hidratar
  (onAuthStateChange / getSession) e só então navega para o destino `next`.
- Valide `next`: aceite apenas caminhos internos começando com "/";
  rejeite "//", URLs absolutas e javascript: (anti open-redirect).
  Destino inválido → "/".
- Se o usuário já estiver logado e abrir /auth, redirecione para o destino.

## 2. Lembrar o último e-mail
- Ao enviar o magic link com sucesso, salve em localStorage a chave
  "<app>_last_email" com JSON { email, savedAt }.
- TTL de 30 dias: ao ler, se expirado, remova e trate como ausente.
- Se houver e-mail salvo (e não houver ?email= na URL), a tela abre no estado
  "returning": saudação personalizada com o primeiro nome derivado do e-mail
  (parte antes do "@", antes do primeiro "."), exibe o e-mail salvo e o botão
  principal envia o link direto sem pedir digitação.
- Sempre ofereça "Trocar e-mail" / "Usar outro e-mail" para voltar ao estado
  de primeiro acesso com o campo vazio.
- O parâmetro ?email= na URL tem precedência sobre o e-mail salvo
  (pré-preenche o campo e força estado de primeiro acesso).

## 3. Estados da tela
- first-access: campo de e-mail + botão "Receber link".
- returning: sem campo; saudação + e-mail salvo + botão "Receber link".
- link-sent: confirmação "Verifique seu e-mail", mostra o endereço, avisa que
  o link expira em 10 minutos e sugere olhar o spam.

## 4. UX e resiliência
- Valide formato de e-mail no submit (regex simples); inválido → toast de erro,
  sem chamar o backend.
- Botão "Reenviar link" com cooldown de 60 segundos (contador visível).
- Enquanto verifica a sessão, mostre loading; se passar de 5 segundos,
  exiba o formulário mesmo assim (nunca prender o usuário no loading).
- Mensagens de erro amigáveis em português: erro de autorização/domínio vira
  mensagem inline no campo; falhas de rede/timeout viram toast genérico
  "Tenta de novo?".
- Ao trocar o e-mail digitado, limpe erros anteriores.
- Botões com estado de loading durante as chamadas.

## 5. Sessão
- Mantenha o padrão do Supabase client (persistSession em localStorage).
- Não implemente senha, OAuth ou signup por aqui — apenas magic link.
```
---

## Observações
- No projeto de origem o "lembrar e-mail" usa localStorage com TTL de 30 dias (não cookie de navegador) — o prompt reflete isso, que é o comportamento real e mais simples.
- O envio de e-mail é o padrão do Lovable (sem edge function customizada), conforme solicitado.
- O anti open-redirect de `next` é mantido por segurança; no projeto de origem ele também aceita URLs de satélites SSO, o que não se aplica ao novo projeto.
