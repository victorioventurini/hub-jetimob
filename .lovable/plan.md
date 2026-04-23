

## Corrigir busca de usuários nos comentários de Projetos

### Pré-checklist (executado)
- ✅ TCR §3.3.1 (Módulo Projetos v1.4) e `mem://features/projects/holistic-module-architecture-v2`
- ✅ `mem://standards/bu-isolation-master` (Core: "use `currentBuId` synchronously")
- ✅ Confirmado no DB: RPC `search_bu_users_for_mention(a0000000-...-001, 'th', 8)` retorna 8 usuários internos válidos. **O backend está funcionando**.
- ✅ Conferido que `ProjectCommentsSection.tsx` (linha 329) JÁ usa o `MentionInput` centralizado de `@/components/mentions` com `context="internal"` — **sem duplicação, padrão correto**.
- ✅ Conferido que `TicketMessageComposer.tsx` (linha 290) usa o mesmo componente com `context="internal+external"`.
- ✅ Conferido que `mentions.entity_type` é `text` (não enum), então `'project_comment'` é aceito.

### Causa raiz
Em `src/hooks/useMentionableUsers.ts` linha 87:

```ts
const { currentBu } = useBu();
const buId = currentBu?.id ?? null;   // ❌ depende de hidratação de userBus
```

`currentBu` é derivado de `userBus.find(...).bu_unit`, que só fica disponível após o fetch da lista de membresias. Durante essa janela, `currentBu` é `null` mesmo com `currentBuId` válido (sincrono no localStorage). Resultado: a query React Query é desabilitada (`enabled: !!buId === false`), `data` permanece `undefined → []`, e o dropdown mostra **"Nenhum usuário encontrado"** sem nunca disparar o RPC.

A regra Core do projeto é explícita: *"ALWAYS filter queries by `bu_id` using `currentBuId` synchronously. No exceptions."* O hook viola essa regra.

Por que tickets "parecem funcionar": o composer de ticket fica em uma página onde `useTicket` já força hidratação completa da BU antes do composer montar, então `currentBu` está pronto. Já em `/projects/:id`, o composer monta no mesmo ciclo que `useProject`, antes da hidratação de membresias.

### Correção (mínima, centralizada, sem duplicação)
**Único arquivo alterado:** `src/hooks/useMentionableUsers.ts`

Trocar a fonte do `buId` para o estado síncrono:

```ts
- const { currentBu } = useBu();
- const supabase = useBuScopedSupabase();
- const buId = currentBu?.id ?? null;
+ const { currentBuId } = useBu();
+ const supabase = useBuScopedSupabase();
+ const buId = currentBuId;
```

Isso corrige automaticamente:
- `MentionInput` em projetos (`context="internal"` via `ProjectCommentsSection`)
- `MentionInput` em tickets (`context="internal+external"` via `TicketMessageComposer`)
- `InternalMentionInput` em check-ins de OKR (`CheckinReflectionBlock`)
- Qualquer uso futuro do hook

Como o hook já é a fonte única de candidates para todos os contextos de menção, a centralização é preservada (zero duplicação de componentes, zero novos hooks).

### Por que essa abordagem
- **Componente único reaproveitado**: `MentionInput` (um arquivo, dois contextos via prop) já existe e está corretamente usado nos dois módulos. Não há nada a unificar — só falta corrigir o hook compartilhado.
- **Conformidade com Core rule**: `currentBuId` síncrono em vez de `currentBu` derivado.
- **Sem novas tabelas/RPCs/migrações**: backend já entrega o que precisa.
- **Sem mudança em RLS, contratos ou tipos**.

### Validação pós-correção
1. Abrir `/projects/98074a55-...` → seção Comentários → digitar `@th` → dropdown mostra Thomas, Thiago, Thaise, etc.
2. Selecionar um usuário → chip de menção interna (azul) aparece corretamente.
3. Enviar comentário → `mentions` recebe registro com `entity_type='project_comment'`, `mentioned_user_id` preenchido.
4. Sanity-check em `/tickets/<id>` (não deve regredir): `@` continua mostrando internos + externos da partner company.
5. Sanity-check em check-in de OKR (`InternalMentionInput`): `@` continua funcionando.

### Arquivos afetados
- `src/hooks/useMentionableUsers.ts` (única alteração: 2 linhas)

### Documentação canônica (manter em dia)
- Adicionar nota curta em `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` no changelog (hotfix: `useMentionableUsers` agora usa `currentBuId` síncrono, alinhado ao Core BU Isolation).

### Princípios respeitados
- BU Isolation (`currentBuId` síncrono — Core rule)
- Componentização centralizada (`MentionInput` é a SSOT de menções; nenhum novo componente)
- Sem `select('*')`
- Sem CHECK constraints
- Sem mudança de RLS / schema / RPC
- Reuso máximo: o componente do ticket e do projeto continuam compartilhando 100% do código

