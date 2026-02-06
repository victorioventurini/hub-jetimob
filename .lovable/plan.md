
# Plano: Mensagem Inicial Padrão por Subcategoria de Ticket

## Objetivo
Adicionar um campo "Mensagem inicial padrão" às subcategorias de tickets. Quando um ticket for criado com uma subcategoria selecionada, o campo de mensagem inicial será automaticamente preenchido com o texto configurado, orientando os usuários sobre quais informações básicas são necessárias.

---

## Alterações Planejadas

### 1. Banco de Dados - Nova Coluna

**Tabela**: `ticket_subcategories`

**Nova coluna**:
- **Nome**: `default_initial_message`
- **Tipo**: `text`
- **Nullable**: `true`
- **Default**: `null`

```text
+----------------------------------+
|     ticket_subcategories         |
+----------------------------------+
| id                               |
| bu_id                            |
| category_id                      |
| name                             |
| status                           |
| default_initial_message (NOVO)   | <-- texto opcional
| created_at                       |
| created_by                       |
| updated_at                       |
| deleted_at                       |
+----------------------------------+
```

---

### 2. Tipos TypeScript

**Arquivo**: `src/modules/tickets/types.ts`

Atualizar a interface `TicketSubcategory`:
```typescript
export interface TicketSubcategory {
  id: string;
  bu_id: string;
  category_id: string;
  name: string;
  status: CatalogStatus;
  default_initial_message: string | null; // NOVO
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  category?: { id: string; name: string } | null;
}
```

---

### 3. Dialog de Subcategoria (Criação/Edição)

**Arquivo**: `src/modules/tickets/components/settings/SubcategoryDialog.tsx`

**Alterações**:
- Adicionar campo `Textarea` para "Mensagem inicial padrão"
- Atualizar schema Zod para incluir o novo campo
- Passar o valor para as mutations de create/update

**Layout do formulário**:
```text
+---------------------------------------+
|  Nova Subcategoria                    |
+---------------------------------------+
|  Nome *                               |
|  [________________________]           |
|                                       |
|  Mensagem inicial padrão              |
|  [                                ]   |
|  [                                ]   |
|  [________________________________]   |
|  (hint: texto exibido ao criar ticket)|
|                                       |
|       [Cancelar]  [Criar]             |
+---------------------------------------+
```

---

### 4. Hooks de Subcategoria

**Arquivo**: `src/modules/tickets/hooks/useTicketCategories.ts`

**Alterações**:
- `useCreateTicketSubcategory`: aceitar `default_initial_message` no payload
- `useUpdateTicketSubcategory`: aceitar `default_initial_message` no payload
- `useTicketCategories`: incluir `default_initial_message` na query de subcategorias aninhadas

---

### 5. Formulário de Criação de Ticket

**Arquivo**: `src/modules/tickets/pages/CreateTicketPage.tsx`

**Lógica de preenchimento automático**:
1. Quando `subcategory_id` mudar, buscar a subcategoria selecionada
2. Se a subcategoria tiver `default_initial_message` e o campo de mensagem estiver vazio, preencher automaticamente
3. O usuário pode editar livremente o texto após o preenchimento

**Comportamento**:
- Preenchimento ocorre APENAS se o campo de mensagem inicial estiver vazio
- Se o usuário já digitou algo, não sobrescreve
- Ao trocar de subcategoria, se o campo estiver vazio, preenche com a nova mensagem

---

## Detalhes Técnicos

### Query Key Pattern
Seguindo `src/lib/queryKeys/tickets.ts`:
- Subcategorias são buscadas via `useTicketCategories()` (recomendado)
- O campo `default_initial_message` será incluído na query existente

### Migration SQL
```sql
ALTER TABLE public.ticket_subcategories
ADD COLUMN default_initial_message text DEFAULT NULL;

COMMENT ON COLUMN public.ticket_subcategories.default_initial_message IS
'Texto padrão exibido no campo de mensagem inicial ao criar um ticket com esta subcategoria';
```

### Arquivos Afetados

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `ticket_subcategories` (DB) | Nova coluna |
| `src/modules/tickets/types.ts` | Adicionar campo na interface |
| `src/modules/tickets/hooks/useTicketCategories.ts` | Atualizar queries e mutations |
| `src/modules/tickets/components/settings/SubcategoryDialog.tsx` | Adicionar campo no formulário |
| `src/modules/tickets/pages/CreateTicketPage.tsx` | Auto-preencher mensagem inicial |

---

## Comportamento de UX

1. **Administrador configura**: Nas configurações de tickets > Categorias, ao criar/editar subcategoria, preenche a "Mensagem inicial padrão" com instruções (ex: "Por favor, informe:\n- Nome do cliente\n- Número do contrato\n- Descrição do problema")

2. **Usuário cria ticket**: Ao selecionar a subcategoria, o campo de mensagem inicial é automaticamente preenchido com o texto configurado, servindo como template/guia

3. **Edição livre**: O usuário pode editar, complementar ou apagar o texto conforme necessário

---

## Validações e Edge Cases

- Se `default_initial_message` for `null` ou string vazia, não preenche nada
- Se o usuário já tiver digitado na mensagem, não sobrescreve
- Troca de subcategoria com campo vazio: preenche com nova mensagem
- Troca de subcategoria com campo preenchido: mantém conteúdo do usuário
