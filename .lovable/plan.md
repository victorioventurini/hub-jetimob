# Citação de mensagens não aparece em respostas (Tickets/Projects/Analysis)

## Contexto

Ticket de exemplo (Jetimob): `21810f1f-…`. A mensagem `6c53e96c-…` ("@lieli esse?") é uma resposta (`reply_to_message_id` populado e a citada `e8be230e-…` existe ativa, com `body_richtext = {"type":"text","content":"Bom dia Bianca…"}` e um anexo). Apesar disso, a bolha da resposta é renderizada **sem o bloco de citação** — sem texto da original, sem autor, sem indicação do anexo.

O componente compartilhado é `src/components/messaging/{MessageBubble,QuotedMessage,ReplyPreview}.tsx`, consumido por:
- Tickets — `TicketMessageBubble` + `useTicketMessages` (faz embed `reply_to:ticket_messages!reply_to_message_id(...)`).
- Projects — `ProjectCommentsSection` + `useProjectComments` (mesmo padrão, sem anexos no embed).
- Analysis — usa o mesmo `MessageBubble`.

## Causas (duas, combinadas)

1. **`getMessageText` é frágil.** Hoje só extrai texto se `body_richtext` for `{type:"text", content:"<string>"}`. Se a célula vier num formato Tiptap (`{type:"doc", content:[{type:"paragraph", content:[{type:"text", text:"…"}]}]}`) ou com qualquer variação, retorna `""`. O `TicketMessageBubble` então define `replyTo = null` e o `MessageBubble` deixa de renderizar `QuotedMessage` — exatamente o que o screenshot mostra (bolha sem nenhum bloco de citação). O Projects e o Analysis usam helpers de extração equivalentes/duplicados, com o mesmo risco.

2. **A citação não conhece anexos.** Mesmo se o texto fosse extraído, o tipo `MessageReplyTo` só carrega `id`, `content`, `authorName`. Não há campo para anexos, então uma mensagem original que contém apenas (ou principalmente) anexos é citada como bloco vazio. As queries (`useTicketMessages`, `useProjectComments`) também não trazem os anexos da mensagem citada.

Secundariamente, `MessageBubble` tem o id `message-${message.id}` para scroll, e o `onScrollToMessage` em `TicketDetailPage` já implementa `scrollIntoView` + highlight — esse caminho está OK; só não funciona se a citação nunca for renderizada.

## Objetivo

Padronizar — **no componente compartilhado** — que toda resposta exibe um bloco de citação consistente com:
- nome do autor da mensagem original;
- prévia do texto (com extração robusta de `body_richtext` em qualquer formato);
- indicação de anexo (ícone + nome ou contagem) quando a original tinha anexos, mesmo sem texto;
- clique no bloco rolando até a mensagem original (já existe; manter e endurecer fallback quando a original estiver fora do viewport carregado).

E garantir que as três implementações (Tickets, Projects, Analysis) alimentem esse contrato.

## Mudanças

### 1. `src/components/messaging/types.ts`
- Estender `MessageReplyTo`:
  - `attachments?: Array<{ id: string; fileName: string; mimeType: string | null }>` — apenas o necessário para a prévia (sem URL).
  - Manter `content` opcional na semântica: pode estar vazio quando a original era só anexo.
- Documentar o contrato: "se `content` estiver vazio mas `attachments.length > 0`, renderizar prévia de anexo".

### 2. `src/components/messaging/QuotedMessage.tsx`
- Remover o early-return baseado apenas em `content`. Renderizar quando houver `content` **ou** `attachments?.length > 0`.
- Layout (mantendo borda colorida estilo WhatsApp):
  - Linha 1: nome do autor (estilo atual).
  - Linha 2: até 2 linhas de texto truncado, **se** houver.
  - Linha 3 (condicional): ícone `Paperclip` + "1 anexo" / "N anexos" / nome do primeiro arquivo.
- Manter o botão e `onScrollToMessage`.

### 3. `src/components/messaging/MessageBubble.tsx`
- Sem mudança estrutural; continua `{message.replyTo && <QuotedMessage … />}`. Apenas validar que o id `message-${id}` permanece para o scroll.

### 4. Helper compartilhado de extração de `body_richtext`
- Criar `src/components/messaging/richtextToPlain.ts` com `richtextToPlain(value: unknown): string` cobrindo: string pura, `{type:"text", content}`, `{type:"system", content}`, Tiptap `{type:"doc", content:[…]}` (recursivo, concatenando `text` dos nós), e fallback `""`.
- Substituir `getMessageText` em `TicketMessageBubble.tsx`, o equivalente em `ProjectCommentsSection`/`useProjectComments` e em `AnalysisResultPage` para usar esse helper. Centraliza para evitar regressões futuras.

### 5. Tickets — `useTicketMessageQueries.ts`
- Ampliar o embed de `reply_to` para incluir os anexos da mensagem citada:
  ```
  reply_to:ticket_messages!reply_to_message_id(
    id,
    body_richtext,
    author_user:profiles!author_user_id(id, display_name),
    author_contact:partner_contacts(id, name),
    attachments:ticket_attachments!message_id(id, file_name, mime_type, deleted_at)
  )
  ```
  Filtrar `attachments` por `deleted_at IS NULL` no map do componente (Postgres não permite filtros aninhados aqui sem RPC).

### 6. Tickets — `TicketMessageBubble.tsx`
- Trocar `getMessageText` por `richtextToPlain`.
- Não exigir mais `replyContent.trim().length > 0` para montar o `replyTo`. Em vez disso:
  ```ts
  const replyAttachments = (message.reply_to?.attachments ?? [])
    .filter(a => !a.deleted_at)
    .map(a => ({ id: a.id, fileName: a.file_name, mimeType: a.mime_type }));
  if (message.reply_to && (replyContent.trim().length > 0 || replyAttachments.length > 0)) {
    replyTo = { id, content: replyContent, authorName, attachments: replyAttachments };
  }
  ```

### 7. Projects — `useProjectComments.ts` + `ProjectCommentsSection.tsx`
- Mesmo ajuste: ampliar o embed de `reply_to` para incluir `attachments:project_comment_attachments!comment_id(id, file_name, mime_type, deleted_at)`.
- Mapeador (já há um wrapper no Projects equivalente ao `TicketMessageBubble`) passa a popular `attachments` em `replyTo` e usa `richtextToPlain`.

### 8. Analysis — `AnalysisResultPage.tsx`
- Usar `richtextToPlain` na montagem do `genericMessage.replyTo` (Analysis hoje só tem texto; sem mudança de schema).

### 9. Scroll até a mensagem original (endurecimento mínimo)
- `TicketDetailPage` e equivalente em Projects: se `getElementById('message-' + id)` retornar `null` (mensagem fora da `ScrollArea` virtualizada/oculta), exibir `toast.info("Mensagem original não está visível nesta conversa.")` em vez de não fazer nada. Sem novo carregamento — não há paginação/virtualização hoje, então é só um fallback defensivo.

## Validação

- **Caso reportado**: ticket `21810f1f-…`. Recarregar a página: a bolha "@lieli esse?" deve mostrar acima dela um bloco com "Victorio Venturini" + "Bom dia Bianca, Conversamos em junho 2025…" + "1 anexo · Estncia-dos-Monte….pdf". Clicar no bloco rola até a mensagem original e dá highlight.
- **Resposta a mensagem só com anexo**: criar mensagem nova respondendo a uma mensagem cujo conteúdo é vazio e só tem anexo — a citação deve aparecer com nome do autor + ícone de anexo + nome do arquivo.
- **Resposta a mensagem com Tiptap rico**: simular `body_richtext` no formato `{type:"doc", content:[…]}` — `richtextToPlain` deve extrair o texto e a citação aparecer.
- **Projects**: criar reply em `/projects/:id` e validar o mesmo bloco.
- **Tipos**: build deve passar (alteração em `MessageReplyTo` é aditiva e opcional).

## Fora de escopo

- Realtime/optimistic updates de mensagens (não existe hoje; refetch via invalidação resolve).
- Permitir abrir o anexo da mensagem citada diretamente do bloco (manteremos só prévia).
- Reescrever o sistema de richtext para Tiptap completo no MVP — só o helper de extração robusto.
- Mudar a RLS — não houve indício de bloqueio; o problema é client-side.
