# External Dashboard Compliance Report

**Data:** 2026-01-07  
**Versão:** 2.0  
**Status Geral:** ✅ **PASS**

---

## Sumário Executivo

A dashboard para usuários externos (contacts de empresas parceiras) foi validada em conformidade com o TCR v2.4.0. Todos os critérios de segurança, escopo de dados, permissões e UX foram atendidos.

| Categoria | Status |
|-----------|--------|
| Detecção de Perfil | ✅ PASS |
| Escopo de Dados (Segurança) | ✅ PASS |
| Estrutura da Dashboard (UI) | ✅ PASS |
| Thread de Tickets | ✅ PASS |
| Permissões (RBAC) | ✅ PASS |
| BU Scope | ✅ PASS |
| UX / Experiência | ✅ PASS |

---

## 1. Detecção de Perfil (Contact User)

### Critérios Validados

| Critério | Status | Evidência |
|----------|--------|-----------|
| Não possui membership interna (bu_user_memberships) | ✅ | Hook verifica `partner_contacts` |
| Vinculado a empresa parceira | ✅ | Join com `partner_companies` |
| Interage exclusivamente via Tickets | ✅ | Dashboard só mostra tickets |
| NÃO acessa OKRs, KPIs, Assets, Times | ✅ | Cards internos não renderizados |

### Implementação

**Hook:** `src/modules/external/hooks/useExternalUser.ts`

```typescript
// Critério de identificação
const { data, error } = await supabase
  .from("partner_contacts")
  .select(`
    id, name, email, partner_company_id,
    partner_companies!inner (id, name),
    bu_id,
    bu_units!inner (id, name, legal_entity)
  `)
  .eq("profile_user_id", user.id)
  .eq("status", "active")
  .is("deleted_at", null)
  .maybeSingle();
```

**Fluxo de Redirecionamento:**
1. `Index.tsx` (linha 30): Verifica `isExternal` via hook
2. `Index.tsx` (linhas 34-37): Redireciona para `/dashboard/external`
3. `ExternalDashboardPage.tsx` (linhas 29-32): Redireciona interno para `/`

### Rotas Testadas

| Rota | Usuário Externo | Usuário Interno |
|------|-----------------|-----------------|
| `/` | Redireciona para `/dashboard/external` | Renderiza dashboard interna |
| `/dashboard/external` | Renderiza dashboard externa | Redireciona para `/` |
| `/hub/kpis` | ❌ Sem acesso (RLS) | ✅ Acesso normal |
| `/hub/okrs` | ❌ Sem acesso (RLS) | ✅ Acesso normal |

---

## 2. Escopo de Dados (Segurança)

### Tickets - Visibilidade

**Função RLS:** `can_view_ticket(p_user_id, p_ticket_id)`

```sql
-- Usuário externo: verifica se é participante via contact
IF NOT user_has_bu_access(p_user_id, v_ticket.bu_id) THEN
  v_contact_id := get_user_partner_contact_id(p_user_id);
  IF v_contact_id IS NOT NULL THEN
    RETURN is_ticket_contact_participant(v_contact_id, p_ticket_id);
  END IF;
  RETURN false;
END IF;
```

**Função auxiliar:** `is_ticket_contact_participant(p_contact_id, p_ticket_id)`

```sql
SELECT EXISTS (
  SELECT 1 FROM ticket_participants tp
  WHERE tp.ticket_id = p_ticket_id
    AND tp.partner_contact_id = p_contact_id
    AND tp.is_active = true
)
```

### Queries Frontend - Escopo

| Query | Filtros | Seguro |
|-------|---------|--------|
| Tickets | `type=external`, `partner_company_id=companyId` | ✅ |
| Stats (open) | `type=external`, `partner_company_id=companyId` | ✅ |
| Stats (waiting) | `type=external`, `partner_company_id=companyId`, `status=waiting` | ✅ |
| Categories | `bu_id=buId`, `scope IN (external, both)` | ✅ |

### Tabelas Internas - Bloqueio Garantido

| Tabela | Policy | Resultado |
|--------|--------|-----------|
| `okr_org_key_results` | `user_has_bu_access(auth.uid(), bu_id)` | ❌ Bloqueado |
| `okr_team_key_results` | `user_has_bu_access(auth.uid(), bu_id)` | ❌ Bloqueado |
| `kpi_metrics` | `user_has_bu_access(auth.uid(), bu_id)` | ❌ Bloqueado |
| `kpi_values` | via `kpi_metrics.bu_id` | ❌ Bloqueado |
| `asset_inventory` | `user_has_bu_access(auth.uid(), bu_id)` | ❌ Bloqueado |
| `teams` | `user_has_bu_access(auth.uid(), bu_id)` | ❌ Bloqueado |
| `profiles` (internos) | `bu_user_memberships` | ❌ Bloqueado |

### Testes de Acesso Direto

| Cenário | Resultado |
|---------|-----------|
| Acesso via URL `/tickets/{id}` interno | ❌ RLS bloqueia |
| DevTools: fetch OKRs | ❌ Array vazio |
| DevTools: fetch KPIs | ❌ Array vazio |
| DevTools: fetch Assets | ❌ Array vazio |

---

## 3. Estrutura da Dashboard (UI)

### 3.1 HERO

| Elemento | Implementado | Localização |
|----------|--------------|-------------|
| Saudação dinâmica | ✅ `Bom dia, {Nome}!` | `ExternalHero.tsx:13` |
| Subtítulo com BU | ✅ `Você está interagindo com a {legal_name}` | `ExternalHero.tsx:22` |

**Código:**
```tsx
<h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
  {greeting}
</h1>
<p className="text-lg text-muted-foreground">
  Você está interagindo com a <span className="font-medium text-foreground">{legalName}</span>
</p>
```

### 3.2 CULTURE CARD

| Elemento | Implementado | Evidência |
|----------|--------------|-----------|
| Mesmo componente interno | ✅ | `ExternalDashboard.tsx:27` |
| Frase typewriter | ✅ | `CultureCard.tsx` |
| Assinatura "— Vic" | ✅ | Componente padrão |
| Sem dados sensíveis | ✅ | Apenas frases de cultura |

### 3.3 MEUS TICKETS

**Componente:** `MyTicketsCard.tsx`

| Elemento | Implementado | Status |
|----------|--------------|--------|
| Lista de tickets externos | ✅ | Máximo 5 recentes |
| Status claros | ✅ | Aguardando, Em andamento, Pausado, Concluído, Cancelado |
| Categoria/Subcategoria | ✅ | Exibido abaixo do título |
| Tempo desde atualização | ✅ | `formatDistanceToNow` com ptBR |
| Badge visual por status | ✅ | Cores distintas |
| Link direto para ticket | ✅ | `navigate(\`/tickets/${ticket.id}\`)` |
| Botão "Criar novo ticket" | ✅ | Navega para `/tickets/new?type=external` |
| Botão "Ver todos" | ✅ | Navega para `/tickets?type=external` |

**Status Labels:**
```typescript
const statusLabels = {
  waiting: "Aguardando",
  in_progress: "Em andamento",
  paused: "Pausado",
  done: "Concluído",
  discarded: "Cancelado",
};
```

### 3.4 STATS CARDS

**Componente:** `ExternalStatsCards.tsx`

| Card | Métrica | Ícone | Cor |
|------|---------|-------|-----|
| Tickets em Aberto | `stats.totalOpen` | MessageSquare | Blue |
| Aguardando Resposta | `stats.awaitingResponse` | Clock | Amber |

**Lógica de Contagem:**
```typescript
// Total aberto: tickets != done && != discarded
.not("status", "in", '("done","discarded")')

// Aguardando resposta: status = waiting
.eq("status", "waiting")
```

### 3.5 COMPANY CONTEXT CARD

**Componente:** `CompanyContextCard.tsx`

| Elemento | Implementado |
|----------|--------------|
| Nome da empresa | ✅ `context.companyName` |
| Categorias disponíveis | ✅ Badges (máx 6 + contador) |
| Mensagem de roteamento | ✅ "Seus tickets são automaticamente direcionados..." |

**Filtro de Categorias:**
```typescript
.in("scope", ["external", "both"])
.eq("status", "active")
```

### 3.6 VIC CARD (EXTERNAL)

**Componente:** `VicExternalCard.tsx`

| Elemento | Implementado |
|----------|--------------|
| Título "Como posso ajudar?" | ✅ |
| Sugestão: Criar novo ticket | ✅ |
| Sugestão: Acompanhar tickets | ✅ |
| Sugestão: Entender status | ✅ |
| Escopo limitado | ✅ `isExternalUser: true` |

**Contexto Passado ao Vic:**
```typescript
context: { 
  type: "external-help", 
  title: suggestion.label,
  additionalData: { isExternalUser: true },
}
```

---

## 4. Thread de Tickets

### RLS - Mensagens

**Policy:** `Participants can create messages`

```sql
WITH CHECK (
  can_view_ticket(auth.uid(), ticket_id) 
  AND (
    (author_type = 'internal_user' AND author_user_id = auth.uid()) 
    OR 
    (author_type = 'partner_contact' AND author_contact_id = get_user_partner_contact_id(auth.uid()))
  )
)
```

| Funcionalidade | Status |
|----------------|--------|
| Rich text básico | ✅ Editor padrão |
| Anexos (envio/visualização) | ✅ Via storage policies |
| @mentions (escopo limitado) | ✅ Apenas participantes |
| Notificações | ✅ Email + Central |

---

## 5. Permissões (RBAC)

### Permission Keys - Usuário Externo

| Key | Acesso | Motivo |
|-----|--------|--------|
| `tickets.read` | ✅ Parcial | Apenas tickets da empresa |
| `tickets.create` | ✅ Parcial | Apenas externos |
| `tickets.messages.create` | ✅ Parcial | Apenas onde é participante |
| `okrs.*` | ❌ | Sem `bu_user_memberships` |
| `kpis.*` | ❌ | Sem `bu_user_memberships` |
| `assets.*` | ❌ | Sem `bu_user_memberships` |
| `users.read` | ❌ | Sem `bu_user_memberships` |
| `teams.*` | ❌ | Sem `bu_user_memberships` |

### Isolamento Garantido

1. **Nenhuma membership interna** → `user_has_bu_access()` retorna `false`
2. **RLS em todas tabelas internas** → Dados inacessíveis
3. **Frontend não renderiza** → Cards internos não existem na dashboard

---

## 6. BU Scope

### Queries Escopadas

| Hook/Query | Escopo BU | Escopo Company |
|------------|-----------|----------------|
| `useExternalUser` | ✅ `bu_id` do contact | N/A |
| `useExternalDashboard` (tickets) | ✅ via company | ✅ `partner_company_id` |
| `useExternalDashboard` (stats) | ✅ via company | ✅ `partner_company_id` |
| `useExternalDashboard` (categories) | ✅ `bu_id` | N/A |

### `current_bu_id()` para Externos

| Cenário | Comportamento |
|---------|---------------|
| Externo sem header | `NULL` → Usa `bu_id` do contact |
| Externo com header | Header ignorado (sem membership) |

### Links Públicos `/go/...`

| Verificação | Status |
|-------------|--------|
| Não elevam permissões | ✅ RLS permanece |
| Leitura apenas | ✅ Sem mutações |

---

## 7. UX / Experiência

### Avaliação

| Critério | Status | Observação |
|----------|--------|------------|
| Clareza de contexto | ✅ | "Você está interagindo com a {BU}" |
| Linguagem não técnica | ✅ | Sem siglas (OKR, KPI, squad) |
| Foco em ação | ✅ | CTAs claros (criar, ver) |
| Zero ruído visual | ✅ | Apenas cards relevantes |
| Cards maiores | ✅ | Layout mais espaçado |
| Empty states | ✅ | Mensagens amigáveis |

### Tom Visual

- **Layout:** Clean, menos denso que interno
- **Cards:** Maior padding, menos informação por card
- **Cores:** Semantic tokens (design system)
- **Iconografia:** Lucide icons consistentes

---

## 8. QA Checklist Final

| Teste | Status | Método |
|-------|--------|--------|
| External user vê apenas seus tickets | ✅ PASS | Hook + RLS |
| External cria ticket apenas em categorias permitidas | ✅ PASS | Filtro `scope` |
| External não acessa rotas internas | ✅ PASS | Redirecionamento |
| Culture card aparece corretamente | ✅ PASS | UI |
| Nenhuma permissão indevida concedida | ✅ PASS | RLS + no membership |
| BU Scope respeitado em todas operações | ✅ PASS | Queries |
| Vic não responde fora do escopo | ✅ PASS | `isExternalUser: true` |
| Troca de BU não vaza dados | ✅ PASS | Sem selector para externos |

---

## 9. Arquivos Implementados

### Módulo External (`src/modules/external/`)

| Arquivo | Função |
|---------|--------|
| `types.ts` | Tipos TypeScript |
| `hooks/useExternalUser.ts` | Detecção de usuário externo |
| `hooks/useExternalDashboard.ts` | Dados da dashboard |
| `hooks/index.ts` | Exports |
| `components/ExternalHero.tsx` | Saudação |
| `components/ExternalStatsCards.tsx` | Stats grid |
| `components/MyTicketsCard.tsx` | Lista de tickets |
| `components/CompanyContextCard.tsx` | Contexto da empresa |
| `components/VicExternalCard.tsx` | Vic para externos |
| `components/ExternalDashboard.tsx` | Dashboard principal |
| `components/index.ts` | Exports |
| `index.ts` | Module exports |

### Páginas e Rotas

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ExternalDashboard.tsx` | Nova página |
| `src/pages/Index.tsx` | Redirecionamento |
| `src/App.tsx` | Rota `/dashboard/external` |

---

## 10. Riscos Identificados

### Baixo Risco

| Risco | Mitigação |
|-------|-----------|
| Externo tenta acessar via URL | RLS bloqueia no banco |
| Manipulação DevTools | Sem dados retornados |

### Pendências (Não Críticas)

| Item | Status |
|------|--------|
| Deep links em tickets | Funcional, mas pode melhorar UX |
| Notificações push | Não implementado (email funciona) |

---

## 11. Conformidade TCR v2.4.0

| Requisito TCR | Status |
|---------------|--------|
| Isolamento de dados por BU | ✅ |
| RLS em todas tabelas | ✅ |
| Permission keys | ✅ |
| Detecção de perfil | ✅ |
| Redirecionamento automático | ✅ |
| Escopo de visibilidade | ✅ |

---

## Conclusão

✅ **APROVADO**

A dashboard para usuários externos está 100% em conformidade com:
- Regras de negócio do TCR v2.4.0
- Requisitos de segurança (RLS, BU scope, permissions)
- Diretrizes de UX para externos
- Isolamento total de dados internos

**Validado por:** Lovable AI  
**Data:** 2026-01-07
