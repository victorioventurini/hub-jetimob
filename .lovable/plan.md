
## Objetivo

Substituir o domínio canônico do Hub de `hub.jetimob.com` por `next.jetimob.com` em todas as camadas (DNS/hospedagem, código, banco, e-mails), com hard cutover e redirect 301 do antigo para o novo.

## Estratégia (definida com você)

- **Web:** `next.jetimob.com` vira o canônico. `hub.jetimob.com` passa a 301 → `next.jetimob.com`.
- **E-mails:** remetente migra para `no-reply@next.jetimob.com` e BCC global para `hub@next.jetimob.com`.
- **DNS:** configuração do `next.jetimob.com` faz parte do plano.

## Fases

### Fase 0 — Pré-requisitos (manuais, fora do código)

1. Criar a caixa `hub@next.jetimob.com` (ou alias) no Google Workspace para receber o BCC.
2. Provisionar credenciais SendGrid (primário) e Resend (fallback) para o novo remetente.

Sem esses dois itens prontos, os e-mails param após o cutover.

### Fase 1 — DNS e custom domain no Lovable

1. No DNS da `jetimob.com`, criar `next.jetimob.com` apontando para o Lovable (CNAME conforme o painel de Custom Domain).
2. No Lovable, adicionar `next.jetimob.com` como domínio customizado deste projeto e aguardar emissão de SSL.
3. Validar que `https://next.jetimob.com` serve o app idêntico ao preview.

### Fase 2 — DNS de envio de e-mail (`next.jetimob.com`)

Replicar no novo subdomínio o que existe hoje no antigo:

- **SPF/DKIM** do SendGrid para `next.jetimob.com` (CNAMEs `s1._domainkey`, `s2._domainkey`, link tracking, etc.).
- **DKIM** do Resend para `next.jetimob.com` (fallback).
- **DMARC** em `_dmarc.next.jetimob.com` alinhado ao atual.
- Verificar domínio nos painéis do SendGrid e Resend antes do cutover.

### Fase 3 — Atualização de código (substituições)

Constante única no backend e referências canônicas no frontend:

- `supabase/functions/_shared/constants.ts`
  - `SITE_URL` default → `https://next.jetimob.com`
  - `NO_REPLY_EMAIL` default → `no-reply@next.jetimob.com`
  - `GLOBAL_BCC_EMAIL` → `hub@next.jetimob.com`
- `supabase/functions/request-magic-link/index.ts` — fallback `new URL(raw, "https://next.jetimob.com")`.
- `supabase/functions/_shared/notification-providers/templates.ts` — comentário/doc.
- `src/hooks/usePageTitle.ts` — `CANONICAL_ORIGIN = "https://next.jetimob.com"`.
- `src/lib/shareableLinks.ts` — doc JSDoc.
- `src/lib/shareableLinks.test.ts` e `src/lib/authRedirect.test.ts` — atualizar `window.location.origin` mockado e expectativas.
- `index.html` — `og:url`, `og:image`, `twitter:image` para `https://next.jetimob.com`.

Variáveis de ambiente do projeto Supabase (Edge Functions):

- `SITE_URL=https://next.jetimob.com`
- `NO_REPLY_EMAIL=no-reply@next.jetimob.com`

Definir essas duas torna a constante imune a regressão futura.

### Fase 4 — Migração no banco

Uma única linha em `notification_event_variables` tem URL absoluta:

```sql
UPDATE public.notification_event_variables
SET default_value = 'https://next.jetimob.com/auth'
WHERE event_key = 'partner.invite'
  AND variable_key = 'access_url'
  AND default_value = 'https://hub.jetimob.com/auth';
```

Auditoria adicional (defensiva) para garantir que não há outras URLs absolutas legadas guardadas como dado:

```sql
-- payloads de notificação enfileirados/históricos
SELECT id, payload FROM public.notification_outbox
WHERE payload::text ILIKE '%hub.jetimob.com%' LIMIT 50;

-- templates de e-mail customizados (se houver)
SELECT * FROM public.notification_templates
WHERE body ILIKE '%hub.jetimob.com%' OR subject ILIKE '%hub.jetimob.com%';
```

Itens encontrados serão tratados pontualmente (a regra do projeto é gravar **path relativo** no banco; qualquer URL absoluta legada deve virar relativa ou ser reescrita para o novo domínio).

### Fase 5 — Deploy e cutover

1. Deploy do frontend com as novas constantes/metatags.
2. Redeploy de todas as Edge Functions que importam `_shared/constants.ts` (basta acionar todas — é seguro).
3. Trocar variáveis de ambiente do Supabase (`SITE_URL`, `NO_REPLY_EMAIL`) para os valores `next.*`.
4. Confirmar `hub@next.jetimob.com` recebendo BCC dos primeiros envios.

### Fase 6 — Redirect 301 do domínio antigo

Manter `hub.jetimob.com` apontando para o app **apenas** para servir um redirect 301 → `https://next.jetimob.com{path+query}`. Opções, em ordem de preferência:

1. **Cloudflare Page Rule / Bulk Redirect** em `hub.jetimob.com/*` → `https://next.jetimob.com/$1` (301, preserva path e query). É a opção mais limpa porque não exige código no app.
2. Se DNS não estiver no Cloudflare: manter `hub.jetimob.com` como custom domain no Lovable e adicionar no `index.html` um script de redirect no topo (`if (location.host === 'hub.jetimob.com') location.replace('https://next.jetimob.com' + location.pathname + location.search + location.hash)`) — é client-side, mas evita infra extra.

Recomendo a opção (1).

### Fase 7 — Pós-cutover (validação)

- Validar `https://next.jetimob.com` em login (Google + magic link), navegação principal e impersonation banner.
- Disparar e-mails de cada categoria (auth confirm, partner invite, notificação de menção, ritual summary) e confirmar:
  - Remetente é `no-reply@next.jetimob.com`.
  - CTA "Ver no Hub" e links inline apontam para `https://next.jetimob.com/...`.
  - BCC silencioso chegou em `hub@next.jetimob.com`.
- Conferir que `https://hub.jetimob.com/qualquer/rota?x=1` retorna 301 para `https://next.jetimob.com/qualquer/rota?x=1`.
- Rodar `scripts/qa/validate-email-context-urls.sql` para garantir que não há regressão de URL absoluta gravada no banco.

### Fase 8 — Limpeza de documentação

Atualizar referências em docs (não é runtime, mas evita confusão futura):

- `docs/HUB_TECHNICAL_DEEP_DIVE.md`, `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`, `docs/canonical/BUNDLING_AND_VENDOR_CHUNKS_STANDARD.md`, `docs/qa/QA_EMAIL_CONTEXT_URL.md`, `docs/audits/*` que citam `hub.jetimob.com` ou `hub@jetimob.com`.

Pode ser feito em PR separado.

## Fora de escopo

- Renomear repositório, projeto Lovable, projeto Supabase ou variáveis `VITE_SUPABASE_*` (continuam apontando para o mesmo backend).
- Trocar a caixa `hub@jetimob.com` em outros sistemas externos (Google Workspace, integrações de monitoramento) — só o uso interno do app é atualizado.
- Mexer em `hub-jetimob.lovable.app` (URL Lovable, não impacta a UX final).

## Riscos e mitigação

- **DNS de e-mail atrasa.** SendGrid/Resend levam algumas horas para verificar. Mitigação: executar Fase 2 com 24h de antecedência; só rodar Fase 5 quando ambos estiverem `verified`.
- **OAuth Google quebra.** A URL `https://next.jetimob.com/auth/callback` precisa estar na lista de Authorized Redirect URIs do projeto Supabase (Authentication → URL Configuration) e no app OAuth do Google. Adicionar ambas (`hub.*` e `next.*`) antes do cutover; remover `hub.*` depois.
- **Magic links emitidos antes do cutover** apontam para `hub.jetimob.com`. O redirect 301 da Fase 6 cobre isso transparente para o usuário.
- **Service workers/PWA cacheados em `hub.jetimob.com`.** O 301 trata navegação; clientes que façam fetch direto cacheado pegam erro 1x e recuperam no reload.

## Aprovação

Confirmando este plano, executo Fases 3 e 4 (código + migration) e te entrego um checklist marcando o que precisa ser feito manualmente nas Fases 0, 1, 2, 5 (parte de envs), 6 e 8.
