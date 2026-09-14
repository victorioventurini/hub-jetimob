# Corrigir erro ao cadastrar novo parceiro

## O problema

Em `/settings/partners/new`, ao salvar, aparece:
"Erro ao criar empresa parceira: new row violates row-level security policy for table external_companies".

## Causa (confirmada no banco)

O cadastro cria a empresa como **global** (sem unidade de negócio) e, hoje, **não registra quem criou**. As regras de visibilidade da tabela só permitem ver uma empresa quando:

1. ela está associada a uma BU da qual a pessoa é membro; ou
2. ela foi criada pela própria pessoa (campo "criado por").

Como a empresa nasce sem BU e sem "criado por", a linha recém-criada fica invisível para quem acabou de criá-la. O cadastro pede a empresa de volta logo após salvar (para redirecionar à página dela) e o banco recusa a operação com a mensagem acima. A associação com a BU atual só é feita no passo seguinte, que nunca chega a rodar.

Verificado: a permissão de criar existe e é atendida; o campo "criado por" não tem valor padrão e não é enviado pelo formulário.

## Correção

1. Banco: passar a preencher automaticamente o campo "criado por" com o perfil de quem está inserindo a empresa parceira (valor padrão na coluna). Isso torna a nova linha imediatamente visível ao autor e desbloqueia o cadastro.
2. Formulário: enviar explicitamente o autor no momento da criação, para não depender apenas do padrão do banco.
3. Após criar, manter o comportamento atual de ativar a empresa na BU ativa (Jetimob) e redirecionar para a página do parceiro — agora com a rota `/settings/partners/:id`, já que o redirecionamento atual aponta para `/partners/:id`.
4. Ajustar também os links "Cancelar" e os atalhos da listagem que apontam para `/partners/...` em vez de `/settings/partners/...`.

## Detalhes técnicos

- Migração: `ALTER TABLE public.external_companies ALTER COLUMN created_by SET DEFAULT public.my_profile_id();` (sem alterar políticas existentes; nenhuma ampliação de acesso — a política de leitura por autor já existia).
- `src/modules/partners/hooks/useGlobalPartners.ts`: incluir `created_by` no `insert` usando o perfil real de `useIdentity` (`realProfileId`), mantendo `bu_id: null`.
- `src/modules/partners/pages/PartnerFormPage.tsx` e `PartnersPage.tsx`: corrigir os caminhos de navegação para `/settings/partners/...`.
- Validação: cadastrar um parceiro de teste na BU Jetimob, confirmar redirecionamento e associação ativa em `external_company_bu_associations`, e remover o registro de teste.
