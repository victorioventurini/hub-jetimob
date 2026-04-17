

## Plano: Mitigar URL Detonation no Magic Link da Mariana

### Pré-checklist canônico ✅
- TCR v3.24.0 consultado — fluxo de magic link via `request-magic-link` documentado
- `request-magic-link/index.ts` revisado — gera link customizado para `/auth/callback?token_hash=...&type=magiclink&next=/`
- `auth-email-hook/index.ts` revisado — só dispara em fluxos nativos da Supabase, não no fluxo da Mariana
- `AuthCallback.tsx` revisado — usa `verifyOtp({ token_hash, type: "magiclink" })`, mas não diferencia erros
- `email-sender.ts` revisado — `shouldPreferResend()` já tem `jetimob.com`, padrão pronto para reuso
- `useAuth.tsx` revisado — chama `request-magic-link` via `supabase.functions.invoke`
- DEVELOPMENT_STANDARDS, regras inquebráveis 7-8 (URL state, edge functions com JWT/correlation-id) — respeitadas

### Causa raiz (refinada)
Gateways corporativos de proteção (Mimecast/Proofpoint/Microsoft Defender ATP) fazem **URL detonation**: escaneiam o link clicando nele em sandbox antes de entregar. Como a página `/auth/callback` executa `verifyOtp` no `useEffect` automaticamente, o **scanner consome o token single-use**. Quando a Mariana clica de verdade, o Supabase retorna `otp_expired` e o `verifyOtp` falha em nível de rede ("Failed to fetch" pode também indicar bloqueio CORS/firewall corporativo).

### Solução em 3 frentes

#### Frente 1 — UX: Mensagens de erro acionáveis (`AuthCallback.tsx`)
Detectar e tratar separadamente:
- `TypeError: Failed to fetch` → "Conexão bloqueada. Tente outra rede ou modo anônimo."
- `otp_expired` / `invalid_token` / `Token has expired` → "Este link já foi usado ou expirou. Solicite um novo."
- Adicionar botão "Solicitar novo link" que volta para `/auth` com email pré-preenchido (via `?email=` na URL).

#### Frente 2 — Mitigação raiz: Página de confirmação intermediária (double opt-in click)
Quebrar o auto-`verifyOtp` em duas etapas para domínios sensíveis:

1. **Modificar `request-magic-link/index.ts`**:
   - Definir array `URL_DETONATION_DOMAINS` com `["ferrigoloadvogados.com.br"]` (extensível)
   - Quando o domínio do destinatário estiver na lista, gerar `callbackUrl` apontando para `/auth/confirm` em vez de `/auth/callback`
   - Manter mesmos query params (`token_hash`, `type`, `next`)

2. **Criar nova página `src/pages/AuthConfirm.tsx`**:
   - **Não chama `verifyOtp` no mount** — apenas renderiza um botão "Acessar o Hub"
   - Só ao clicar manualmente, faz `navigate("/auth/callback?token_hash=...&type=magiclink&next=...")` ou chama `verifyOtp` diretamente
   - Scanner automatizado nunca clica no botão → token preservado para o usuário real

3. **Registrar `/auth/confirm` em `src/routes/public.routes.tsx`** como rota pública.

#### Frente 3 — Documentação canônica
- Bump `TECHNICAL_CONTEXT_REGISTRY.md` para **v3.25.0** documentando:
  - Padrão de URL detonation mitigation
  - Lista `URL_DETONATION_DOMAINS` e como adicionar domínios
  - Fluxo dual: `/auth/callback` (auto) vs `/auth/confirm` (manual)
- Atualizar `docs/qa/QA_EMAIL_RESOLUTION.md` com cenário de troubleshooting de magic link bloqueado por gateway corporativo
- Criar memory `mem://features/auth/url-detonation-mitigation` resumindo o padrão

### Arquivos impactados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `src/pages/AuthCallback.tsx` | edit | Detectar `Failed to fetch` e `otp_expired`; CTA "Solicitar novo link" |
| `supabase/functions/request-magic-link/index.ts` | edit | Adicionar `URL_DETONATION_DOMAINS` e rotear para `/auth/confirm` |
| `src/pages/AuthConfirm.tsx` | new | Página intermediária com botão manual antes do `verifyOtp` |
| `src/routes/public.routes.tsx` | edit | Registrar rota `/auth/confirm` |
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | edit | Bump v3.25.0 + seção URL Detonation |
| `docs/qa/QA_EMAIL_RESOLUTION.md` | edit | Cenário de gateway corporativo |
| `mem://features/auth/url-detonation-mitigation` | new | Memory canônica do padrão |

### Por que esta abordagem
- **Frente 1** é zero risco e dá autoatendimento imediato a qualquer usuário afetado por qualquer causa
- **Frente 2** elimina a causa raiz para a Mariana sem alterar UX dos demais usuários (apenas o domínio listado vê o passo extra)
- **Frente 3** garante rastreabilidade para o próximo caso similar (escritórios de advocacia, contabilidade, saúde tendem a ter os mesmos gateways)

### Backward compatibility
- `/auth/callback` continua funcionando para todos os outros domínios (zero regressão)
- Fallback automático: se o domínio não está em `URL_DETONATION_DOMAINS`, fluxo atual permanece idêntico
- Nenhuma migração de banco necessária

