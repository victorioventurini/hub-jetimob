# Corrigir acesso aberto aos anexos de tickets e projetos

## Problema (confirmado)

Os arquivos anexados vivem em duas "pastas" de armazenamento: uma de tickets e
uma de projetos. As regras de acesso dessas pastas hoje só verificam **se a
pessoa está logada** — nada além disso:

- leitura de anexos de ticket: só exige usuário autenticado;
- envio de anexos de ticket: só exige usuário autenticado;
- leitura e envio de anexos de projeto: só exigem usuário autenticado.

Resultado: qualquer pessoa com acesso ao Hub (inclusive contatos externos) pode
baixar arquivos de tickets e projetos de **outras BUs**, e enviar arquivos para
um ticket/projeto do qual não participa.

Importante: as tabelas que listam os anexos já são protegidas corretamente (o
ticket exige `can_view_ticket`, e o projeto exige BU atual). Ou seja, a pessoa
não vê a lista de anexos alheios pela interface — mas o arquivo em si fica
acessível para quem tenha o caminho/link. A correção fecha essa brecha.

## O que será feito

Aplicar às duas pastas de arquivos as mesmas regras que já valem para os
registros:

1. **Anexos de ticket**
   - Leitura: liberada apenas para quem pode ver aquele ticket (mesma regra
     `can_view_ticket`, que cobre participantes internos, contatos externos e
     visibilidade do ticket) e para administradores da plataforma.
   - Envio: liberado apenas para participantes ativos do ticket, contatos
     externos participantes, ou quem tem a permissão de anexo na BU do ticket.
2. **Anexos de projeto**
   - Leitura: apenas membros da BU do projeto, com o projeto ativo (não
     excluído).
   - Envio: apenas membros da BU do projeto que tenham acesso ao projeto.
3. Depois de aplicar, testar na prática: abrir um ticket com anexo e um projeto
   com anexo (usuário com acesso → baixa normalmente) e tentar ler um arquivo de
   outra BU (deve ser negado).
4. Marcar os três itens críticos como corrigidos na verificação de segurança.

Nenhuma mudança de interface: o fluxo de anexar e baixar continua igual para
quem tem direito.

## Detalhes técnicos

Caminho dos arquivos (já padronizado no código, confirmado em
`useTicketAttachments.ts` e `useProjectCommentMutations.ts`):
`"{bu_id}/{ticket_id|project_id}/{message_id|comment_id}/{arquivo}"`.
Portanto `storage.foldername(name)[1] = bu_id` e `[2] = ticket_id/project_id`.

Migração em `storage.objects` (substituir as 4 políticas frouxas):

```text
ticket-attachments
  SELECT  → is_platform_admin(auth.uid())
            OR can_view_ticket(foldername[2]::uuid, my_profile_id())
  INSERT  → participante ativo (profile_id = my_profile_id())
            OR contato externo participante (partner_contacts.user_id = auth.uid())
            OR has_permission(my_profile_id(), foldername[1]::uuid,
                              'tickets.attachment.create:bu')

project-attachments
  SELECT  → is_profile_bu_member(my_profile_id(), foldername[1]::uuid)
            AND EXISTS projects p WHERE p.id = foldername[2]::uuid
                AND p.bu_id = foldername[1]::uuid AND p.deleted_at IS NULL
  INSERT  → mesma condição do SELECT
```

Notas de implementação:

- As políticas **não** podem usar `is_current_bu()`: as URLs assinadas são
  geradas pelo cliente global (`useAttachmentUrl.ts`,
  `ProjectCommentsSection.tsx`), que não envia o header `x-current-bu-id`.
  Por isso a checagem de BU usa `is_profile_bu_member` / `can_view_ticket`.
- Validar o cast do caminho com `foldername(name)` de tamanho esperado para
  evitar erro em objetos legados fora do padrão (usar guard de array length e
  regex de UUID antes do cast).
- Manter as políticas de DELETE existentes de ticket-attachments (já
  restritas ao uploader / participante externo / admin).
- Anexos legados salvos como URL absoluta continuam funcionando pela lógica de
  fallback já existente no frontend.
