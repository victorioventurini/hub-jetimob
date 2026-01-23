

# Plano: Sistema de Reply + Componentes de Mensagens Reutilizáveis

## Objetivo
Implementar funcionalidade de **reply** (resposta a mensagem) estilo WhatsApp no módulo de tickets, criando uma estrutura de componentes genérica e reutilizável para futuros módulos (projetos, etc.).

---

## Arquitetura Proposta

```text
src/components/messaging/          ← NOVO: Componentes genéricos
├── types.ts                       ← Interfaces base para qualquer módulo
├── MessageThread.tsx              ← Container scrollável com auto-scroll
├── MessageBubble.tsx              ← Bolha genérica (quote + content + actions)
├── MessageComposer.tsx            ← Compositor com reply mode + mentions + files
├── QuotedMessage.tsx              ← Citação inline (estilo WhatsApp)
├── ReplyPreview.tsx               ← Preview no compositor ("Respondendo a...")
└── index.ts                       ← Barrel export

src/modules/tickets/components/
├── TicketMessageBubble.tsx        → Adapta MessageBubble para contexto de tickets
├── TicketMessageComposer.tsx      → Adapta MessageComposer para contexto de tickets
└── ... (demais componentes)
```

---

## Etapas de Implementação

### Etapa 1: Migração de Banco de Dados

Adicionar coluna `reply_to_message_id` na tabela `ticket_messages`.

```sql
ALTER TABLE public.ticket_messages
ADD COLUMN reply_to_message_id uuid REFERENCES public.ticket_messages(id);

CREATE INDEX idx_ticket_messages_reply_to ON public.ticket_messages(reply_to_message_id)
WHERE reply_to_message_id IS NOT NULL;

COMMENT ON COLUMN public.ticket_messages.reply_to_message_id IS
  'Referência à mensagem original quando esta é uma resposta (reply)';
```

---

### Etapa 2: Tipos Genéricos de Mensagens

Criar arquivo `src/components/messaging/types.ts`:

```typescript
// Participante genérico (interno ou externo)
export interface MessageParticipant {
  id: string;
  name: string;
  photoUrl?: string | null;
  type: 'internal' | 'external';
}

// Anexo genérico
export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  url: string;
}

// Mensagem genérica (base para todos os módulos)
export interface GenericMessage {
  id: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  author: MessageParticipant;
  isPinned?: boolean;
  attachments?: MessageAttachment[];
  // Reply support
  replyTo?: {
    id: string;
    content: string;
    authorName: string;
  } | null;
}

// Configuração do thread de mensagens
export interface MessageThreadConfig {
  /** Se o módulo suporta participantes externos */
  allowExternalParticipants: boolean;
  /** Se permite fixar mensagens */
  allowPinning: boolean;
  /** Se permite reply */
  allowReply: boolean;
  /** Se permite anexos */
  allowAttachments: boolean;
}
```

---

### Etapa 3: Componente QuotedMessage

Renderiza a citação da mensagem original dentro da bolha de resposta.

**UX (estilo WhatsApp):**
- Barra vertical colorida à esquerda
- Nome do autor original em bold
- Trecho do texto original (truncado se muito longo)
- Clicável para scroll até a mensagem original

---

### Etapa 4: Componente ReplyPreview

Aparece acima do compositor quando usuário clica em "Responder".

**UX:**
- Banner fixo mostrando "Respondendo a [Nome]"
- Trecho da mensagem
- Botão X para cancelar reply

---

### Etapa 5: Componente MessageBubble Genérico

Componente base que aceita:
- `message: GenericMessage`
- `isOwnMessage: boolean`
- `onReply?: (message) => void`
- `onPin?: (messageId, pin) => void`
- `config: MessageThreadConfig`
- Slots para ações customizadas

Renderiza:
1. `QuotedMessage` se `message.replyTo` existir
2. Conteúdo da mensagem
3. Anexos
4. Ações (reply, pin) no hover

---

### Etapa 6: Componente MessageComposer Genérico

Refatorar `TicketMessageComposer` para ser genérico:
- Props para configurar features (mentions, files, reply)
- Estado `replyingTo` para modo de resposta
- Emite `onSend({ content, mentions, files, replyToMessageId })`

---

### Etapa 7: Atualizar Hook useCreateMessage

Modificar para aceitar `replyToMessageId` no payload:

```typescript
interface CreateMessageData {
  body_richtext: RichTextContent;
  attachments?: File[];
  mentions?: { user_id?: string; contact_id?: string }[];
  reply_to_message_id?: string; // NOVO
}
```

---

### Etapa 8: Atualizar Query de Mensagens

Modificar `useTicketMessages` para buscar dados da mensagem respondida:

```typescript
.select(`
  ...,
  reply_to:ticket_messages!reply_to_message_id(
    id,
    body_richtext,
    author_user:profiles!author_user_id(id, display_name),
    author_contact:partner_contacts(id, name)
  )
`)
```

---

### Etapa 9: Atualizar TicketDetailPage

Adicionar estado de reply e conectar componentes:

```typescript
const [replyingTo, setReplyingTo] = useState<TicketMessage | null>(null);

// No MessageBubble
onReply={(msg) => setReplyingTo(msg)}

// No Composer
replyingTo={replyingTo}
onCancelReply={() => setReplyingTo(null)}
```

---

### Etapa 10: Atualizar Documentação

- Atualizar `SCHEMA_QUICK_REFERENCE.md` com nova coluna
- Atualizar `DATA_MODEL_REGISTRY.md`
- Documentar componentes genéricos no TCR

---

## Estrutura de Arquivos a Criar/Modificar

| Ação | Arquivo | Descrição |
|------|---------|-----------|
| **Criar** | `supabase/migrations/xxx_add_reply_to_message.sql` | Migração DB |
| **Criar** | `src/components/messaging/types.ts` | Tipos genéricos |
| **Criar** | `src/components/messaging/QuotedMessage.tsx` | Citação inline |
| **Criar** | `src/components/messaging/ReplyPreview.tsx` | Preview no compositor |
| **Criar** | `src/components/messaging/MessageBubble.tsx` | Bolha genérica |
| **Criar** | `src/components/messaging/MessageComposer.tsx` | Compositor genérico |
| **Criar** | `src/components/messaging/MessageThread.tsx` | Container com scroll |
| **Criar** | `src/components/messaging/index.ts` | Barrel export |
| **Modificar** | `src/modules/tickets/types.ts` | Adicionar `reply_to_message_id` |
| **Modificar** | `src/modules/tickets/hooks/useTicketMessageQueries.ts` | Buscar reply_to |
| **Modificar** | `src/modules/tickets/hooks/useTicketMessageMutations.ts` | Aceitar reply_to |
| **Modificar** | `src/modules/tickets/components/TicketMessageBubble.tsx` | Usar MessageBubble |
| **Modificar** | `src/modules/tickets/components/TicketMessageComposer.tsx` | Usar MessageComposer |
| **Modificar** | `src/modules/tickets/pages/TicketDetailPage.tsx` | Estado de reply |
| **Modificar** | `docs/canonical/SCHEMA_QUICK_REFERENCE.md` | Documentar coluna |

---

## Considerações Técnicas

### Identity Convention
- Autores internos usam `profiles.id` (via `useIdentity().realProfileId`)
- Autores externos usam `partner_contacts.id`
- Componentes genéricos abstraem isso via interface `MessageParticipant`

### Query Keys
- Usar `queryKeys.tickets.messages(ticketId)` existente
- Invalidações já configuradas em `useCreateMessage`

### Reutilização Futura
- Para módulo de Projetos: criar `ProjectMessageBubble` que usa `MessageBubble`
- Configurar `allowExternalParticipants: false` se não houver externos
- Mesma estrutura de DB pode ser replicada para `project_messages`

---

## Resultado Visual Esperado

```text
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📌 Mensagens Fixadas (colapsável)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌── Avatar ── [Nome do Autor] ── há 2 min ── [↩️ 📌] ──┐  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ ▌ João: "Qual o prazo do projeto?"              │ │  │  ← QuotedMessage
│  │  └─────────────────────────────────────────────────┘ │  │
│  │  O prazo é 15/02. Precisamos acelerar a entrega.     │  │  ← Conteúdo
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ... mais mensagens ...                                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ↩️ Respondendo a João                            [X] │  │  ← ReplyPreview
│  │   "Qual o prazo do projeto?"                         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ [📎] [ Digite sua mensagem... @mencionar ]    [➤]    │  │  ← Composer
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

