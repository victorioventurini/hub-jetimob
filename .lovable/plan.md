# Magic link não chega para `joao@jetxp.com.br`

## Causa-raiz (confirmada)

O envio do magic link nunca chega à etapa de e-mail porque a chamada `supabase.auth.admin.generateLink()` dentro da edge function `request-magic-link` retorna **HTTP 500** do GoTrue.

Nos logs de auth aparece, no mesmo período em que o usuário tentou:

```
500: Database error finding user
error finding user: sql: Scan error on column index 8, name "email_change":
converting NULL to string is unsupported
```

Validei no banco:

```
auth.users WHERE email = 'joao@jetxp.com.br'
  email_change IS NULL  →  true
```

Esse é um bug conhecido do GoTrue/Go: certas colunas de string em `auth.users` (como `email_change`, `recovery_token`, `confirmation_token`, etc.) **não podem ser NULL** — o driver Go falha ao escanear NULL em `string`, e qualquer operação que carregue o registro do usuário (incluindo `generateLink`) responde 500. Como a edge function trata isso como `INTERNAL_ERROR`, o front mostra erro genérico e nenhum e-mail é enfileirado/enviado.

A varredura mostra que **somente 2 usuários** estão nesse estado em todo o projeto:

| user_id | email |
|---|---|
| a761358c-d643-4b51-88b3-f730748e5dad | joao@jetxp.com.br |
| 7823135c-71ff-481f-8834-25c1c5242764 | tania@jetxp.com.br |

Todas as outras colunas sensíveis (`email_change_token_current/new`, `recovery_token`, `confirmation_token`, `phone_change*`, `reauthentication_token`) já estão como string vazia para todos os 75 usuários — só `email_change` ficou NULL nesses 2 registros (provavelmente herdados de uma versão antiga do GoTrue antes do default `''`).

## Fix

Migration única, idempotente, só de dados — sem mudança de schema, sem trigger, sem tocar policies do schema `auth`:

```sql
UPDATE auth.users
SET email_change = ''
WHERE email_change IS NULL;
```

Cobertura: os 2 usuários acima. Demais 73 não são afetados.

## Verificação pós-fix

1. `SELECT count(*) FROM auth.users WHERE email_change IS NULL;` → deve retornar `0`.
2. Pedir para `joao@jetxp.com.br` solicitar o magic link novamente em `/auth`.
3. Conferir nos auth-logs que `/admin/generate_link` agora retorna `200` e que a edge `request-magic-link` loga `Magic link sent successfully to: joao@jetxp.com.br`.

## Fora de escopo

- **Não** vou mexer em código da edge function `request-magic-link` (ela está correta — o problema é dado no `auth.users`).
- **Não** vou alterar políticas RLS nem schema do GoTrue.
- **Não** vou criar trigger preventivo: o GoTrue moderno já grava `''` por padrão; criar trigger no schema `auth` viola o canônico ("Avoid Modifying Supabase-Reserved Schemas").
