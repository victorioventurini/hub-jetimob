

# Aplicar Regras de Roteamento Interno na Criacao de Tickets

## Problema

Ao criar um ticket interno (ex: categoria "Inventario"), o sistema ignora as regras de roteamento interno configuradas em `/tickets/settings`. O `owner_user_id` e sempre definido como o criador, e nenhum observador e adicionado automaticamente.

## Pre-Checklist Completado

- TCR v3.8.0: Revisado (Identity Convention, BU-scoped client, hooks canonicos)
- IDENTITY_CONVENTION v2.2.0: `owner_user_id` e `created_by_user_id` referenciam `profiles.id`; mutations usam `realProfileId`
- PERMISSIONS_AND_RBAC_MODEL v1.5.0: Sem impacto em permissoes (roteamento e logica de dominio, nao de acesso)
- DATA_MODEL_REGISTRY v1.2.2: Tabela `ticket_internal_routing_rules` confirmada com campos `assignee_user_ids`, `watcher_user_ids`, `category_id`, `subcategory_id`, `priority`
- Hook `useInternalRoutingRules` ja existe e faz fetch com cache de 5min

## Causa Raiz

Em `useTicketMutations.ts` (linha 71): `owner_user_id: profileId` (sempre o criador). Nenhuma consulta a `ticket_internal_routing_rules` e feita no fluxo de criacao.

## Solucao

### 1. Novo arquivo: `src/modules/tickets/hooks/useApplyInternalRouting.ts`

Funcao pura `matchInternalRoutingRule(rules, categoryId, subcategoryId)`:
- Prioridade 1: match exato por `subcategory_id`
- Prioridade 2: match por `category_id` com `subcategory_id IS NULL`
- Desempate: campo `priority` (ASC, ja vem ordenado do hook)
- Retorna `{ ownerUserId, assigneeUserIds, watcherUserIds } | null`

Hook `useInternalRoutingMatch(categoryId, subcategoryId)`:
- Consome `useInternalRoutingRules()` (dados ja cacheados)
- Retorna o resultado do match reativo conforme categoria/subcategoria mudam

### 2. Modificar: `src/modules/tickets/hooks/useTicketMutations.ts`

Adicionar campo opcional `internalRouting` ao `CreateTicketData` (ou parametro separado no `mutationFn`):

```typescript
// No insert do ticket:
owner_user_id: data.internalRouting?.ownerUserId ?? profileId,

// Apos inserir o requester, inserir assignees e watchers:
if (data.internalRouting?.participants) {
  await supabase.from("ticket_participants").insert(data.internalRouting.participants);
}
```

Regras de identidade respeitadas:
- `created_by_user_id` continua sendo `realProfileId` (quem de fato criou)
- `owner_user_id` passa a ser o primeiro assignee da regra (se existir)
- Todos os IDs sao `profiles.id` (conforme IDENTITY_CONVENTION)

### 3. Modificar: `src/modules/tickets/pages/CreateTicketPage.tsx`

- Importar `useInternalRoutingMatch`
- Chamar com `selectedCategoryId` e `selectedSubcategoryId` (reativos via `form.watch`)
- No `onSubmit`, quando `type === "internal"` e houver match, montar o objeto `internalRouting` com:
  - `ownerUserId`: primeiro `assignee_user_ids[0]`
  - `participants`: array de assignees (role `assignee`) + watchers (role `watcher`)
- Manter criador como `requester` (comportamento atual inalterado)

### 4. Atualizar barrel: `src/modules/tickets/hooks/index.ts`

Exportar `useInternalRoutingMatch` e `matchInternalRoutingRule`.

### 5. Atualizar tipo: `src/modules/tickets/types.ts`

Adicionar campo opcional `internalRouting` em `CreateTicketData`:

```typescript
internalRouting?: {
  ownerUserId: string;
  participants: { type: TicketParticipantType; id: string; role: TicketParticipantRole }[];
};
```

## Fluxo Resultante

```text
Usuario cria ticket interno com categoria "Inventario"
  -> useInternalRoutingMatch("cat-inventario", null)
  -> Match: regra com assignee_user_ids = [luiza.piva profile_id]
                       watcher_user_ids = [natalia.dapieve profile_id]
  -> owner_user_id = luiza.piva profile_id
  -> Participantes: criador (requester) + luiza (assignee) + natalia (watcher)
```

## Arquivos Impactados

| Arquivo | Acao |
|---------|------|
| `src/modules/tickets/hooks/useApplyInternalRouting.ts` | Criar |
| `src/modules/tickets/hooks/useTicketMutations.ts` | Editar (aceitar routing no insert) |
| `src/modules/tickets/pages/CreateTicketPage.tsx` | Editar (integrar hook de matching) |
| `src/modules/tickets/hooks/index.ts` | Editar (exportar novos hooks) |
| `src/modules/tickets/types.ts` | Editar (campo internalRouting em CreateTicketData) |

