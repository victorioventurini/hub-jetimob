# Verificação: contato@jairomachado.com

## O que foi encontrado no banco

O contato **foi criado pela metade**:

- Registro do usuário externo existe: Jairo Machado, contato@jairomachado.com, telefone 5548988608428, ativo, vinculado à empresa JairoMachado.com (criado hoje 14:59 horário de Brasília).
- **Falta o vínculo com a unidade de negócio Jetimob.** Sem esse vínculo, ele não aparece na lista de usuários externos da empresa e não teria acesso aos tickets da unidade.
- Ele também ainda não tem conta de acesso associada (nenhum login vinculado).

## Causa

Na criação, o vínculo com a unidade é gravado numa segunda etapa que salva "criado por" com o identificador de login, enquanto essa coluna exige o identificador de perfil. A gravação falha, e o código apenas registra o erro no console em vez de avisar — o mesmo tipo de inconsistência já corrigido em empresas parceiras.

## Correção proposta

1. Ajustar a criação do usuário externo para gravar "criado por" com o identificador de perfil (via `realProfileId` do `useIdentity`), tanto no registro do contato quanto no vínculo com a unidade.
2. Fazer o vínculo com a unidade deixar de falhar em silêncio: se ele não for gravado, a operação é revertida/erro é exibido ao usuário.
3. Reparar o registro do Jairo Machado: criar o vínculo ativo dele com a unidade Jetimob, para que passe a aparecer na página da empresa.
4. Revisar os outros contatos externos existentes sem vínculo de unidade e corrigi-los da mesma forma (relatório antes de aplicar).
5. Reenviar o convite de acesso ao Jairo após o vínculo, se você quiser que ele já entre no Hub.

## Detalhes técnicos

- `src/modules/tickets/hooks/usePartnerContactGlobal.ts` (`useCreateGlobalContact`): trocar `user?.id` por `realProfileId` no insert de `partner_contacts` e de `partner_contact_bu_associations`; transformar o `console.error` do insert da associação em `throw` (com rollback lógico do contato ou mensagem clara).
- Mesmo ajuste em `useCreatePartnerContact` (`src/modules/tickets/hooks/usePartners.ts`), que também não cria a associação de BU — passará a criá-la.
- Causa raiz confirmada: `fk_partner_contact_bu_assoc_created_by` referencia `profiles(id)`, mas o código envia `auth.users.id`.
- Alinhar `partner_contacts.created_by` ao padrão de perfil: migração convertendo os 3 registros com `auth.users.id` para `profiles.id` e substituindo `partner_contacts_created_by_fkey` por FK para `public.profiles(id) ON DELETE SET NULL`.
- Backfill via migração/insert: `partner_contact_bu_associations` (contato 61503c79-757c-4439-a2ae-8fe5a5eabc03, BU a0000000-0000-0000-0000-000000000001, `is_active = true`).
- Sem mudanças em RLS (política de INSERT já é `bu_id = current_bu_id()`), sem novas query keys.
