

# Correção: Menções de Externos como Internos + Redirect de Perfil

## Problema Identificado

Antes da correção do `search_mention_candidates`, era possível mencionar usuários externos como se fossem internos. Isso gerou dois problemas:

1. **Dados corrompidos no banco**: 2 menções em `ticket_messages` armazenadas como `@[nome](internal:profileId)` quando deveriam ser `@[nome](external:contactId)`
2. **Menções na tabela `mentions`**: 2 registros com `mentioned_user_id` preenchido (profile ID) quando deveriam ter `mentioned_contact_id` preenchido
3. **Links quebrados**: Clicar nessas menções leva a `/users/{profileId}` que mostra uma página de perfil interno para um usuário externo

### Dados Afetados (escopo exato)

| Usuário | Profile ID | Contact ID | Mensagens |
|---------|-----------|------------|-----------|
| Mariana Papaleo Montardo | `eef74ee3-...` | `e33df2cf-...` | 1 mensagem |
| Luana dos Santos Sarmento | `06efb1a2-...` | `97c0ca51-...` | 1 mensagem |

## Solucao Recomendada: Abordagem Combinada (Opcoes 1 + 2)

Ambas as abordagens se complementam e devem ser aplicadas juntas:

### Passo 1: Corrigir dados no banco (opcao 2)
Corrigir as menções na origem para que os dados fiquem corretos permanentemente.

**1a. Corrigir `body_richtext` das mensagens:**
- Substituir `@[mariana](internal:eef74ee3-...)` por `@[mariana](external:e33df2cf-...)`
- Substituir `@[luana](internal:06efb1a2-...)` por `@[luana](external:97c0ca51-...)`

**1b. Corrigir tabela `mentions`:**
- Mover `mentioned_user_id` para `mentioned_contact_id` nos 2 registros afetados

### Passo 2: Adicionar redirect defensivo na pagina de perfil (opcao 1)
Para prevenir que links antigos ou cache do navegador continuem levando a pagina errada.

Na pagina `/users/:id`, adicionar logica que:
1. Verifica se o profile tem `user_type = 'external'`
2. Se sim, busca o `partner_contacts.id` correspondente
3. Redireciona automaticamente para `/contacts/{contactId}`

Isso funciona como uma rede de seguranca para qualquer link residual.

### Passo 3: Atualizar documentacao
- Registrar a correcao no TCR
- Atualizar plan.md

---

## Detalhes Tecnicos

### Migracao SQL (Passo 1)

```sql
-- 1a: Fix body_richtext in ticket_messages
UPDATE public.ticket_messages
SET body_richtext = jsonb_set(
  body_richtext,
  '{content}',
  to_jsonb(replace(body_richtext->>'content',
    '@[mariana](internal:eef74ee3-c51b-4007-9338-5ae023eedfac)',
    '@[mariana](external:e33df2cf-d0c2-4ebb-9a77-6fec6a21b25d)'))
)
WHERE id = '77a9944d-d159-45c3-9eca-040d8e1bf67e';

UPDATE public.ticket_messages
SET body_richtext = jsonb_set(
  body_richtext,
  '{content}',
  to_jsonb(replace(body_richtext->>'content',
    '@[luana](internal:06efb1a2-6470-4fee-a05d-01179caf50e5)',
    '@[luana](external:97c0ca51-cb9a-4155-8cb0-b5ccef6abb3d)'))
)
WHERE id = 'c73e0800-44f2-4570-8aa1-36dbd2d904db';

-- 1b: Fix mentions table
UPDATE public.mentions
SET mentioned_contact_id = 'e33df2cf-d0c2-4ebb-9a77-6fec6a21b25d',
    mentioned_user_id = NULL
WHERE id = '4ecd2c60-cfb5-43fc-aed4-5eaf31e88912';

UPDATE public.mentions
SET mentioned_contact_id = '97c0ca51-cb9a-4155-8cb0-b5ccef6abb3d',
    mentioned_user_id = NULL
WHERE id = 'e46f1864-fc41-40db-97cd-9d0e58a2e171';
```

### Redirect no UserProfile (Passo 2)

Na pagina que renderiza `/users/:id`, adicionar um hook/efeito que:
1. Faz query em `profiles` pelo ID da URL
2. Se `user_type = 'external'`, busca `partner_contacts` pelo `user_id`
3. Faz `navigate('/contacts/{contactId}', { replace: true })`

Isso e uma rede de seguranca permanente, nao apenas para esses 2 casos.

