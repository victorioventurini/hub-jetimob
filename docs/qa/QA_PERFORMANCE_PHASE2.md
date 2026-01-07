# QA Checklist: Performance Phase 2

> **Versão:** 2.0.0  
> **Data:** 2026-01-07  
> **Status:** ✅ Pronto para teste

---

## Usuários de Teste

| Perfil | Descrição | Testes Principais |
|--------|-----------|-------------------|
| Internal Admin | Admin da BU | Home, OKRs, Teams, todos módulos |
| Internal Leader | Líder de time | Home, OKRs do time, Tickets |
| Internal Collaborator | Colaborador | Home pessoal, OKRs pessoais |
| External Contact | Contato de parceiro | Tickets (visão limitada) |

---

## Cenários de Teste

### 1. Home Dashboard

- [ ] **1.1** Carregar home em < 3s após login
- [ ] **1.2** Trocar BU e home carrega em < 2s
- [ ] **1.3** Cards de aniversários carregam corretamente (apenas internos)
- [ ] **1.4** OKR summary mostra contagens RAG corretas
- [ ] **1.5** Focus items mostram pendências reais
- [ ] **1.6** Verificar que cache é limpo ao trocar BU

### 2. Tickets

- [ ] **2.1** Lista de tickets carrega em < 2s
- [ ] **2.2** Filtrar por status funciona rapidamente
- [ ] **2.3** Ordenação por updated_at funciona
- [ ] **2.4** Abrir ticket com 50+ mensagens carrega em < 3s
- [ ] **2.5** Scroll em mensagens é fluido
- [ ] **2.6** External user vê apenas seus tickets

### 3. OKRs

- [ ] **3.1** Lista de objetivos carrega em < 2s
- [ ] **3.2** Expandir KRs carrega check-ins sob demanda
- [ ] **3.3** Dashboard de OKRs mostra RAG correto
- [ ] **3.4** Pending checkins mostra KRs corretos
- [ ] **3.5** Filtrar por team funciona rapidamente

### 4. Assets

- [ ] **4.1** Inventory list carrega em < 2s
- [ ] **4.2** Filtros funcionam rapidamente
- [ ] **4.3** Movimentações de asset carregam paginadas
- [ ] **4.4** Keyrings list carrega com status correto

### 5. Global Search

- [ ] **5.1** Busca por "a" (termo curto) responde em < 1s
- [ ] **5.2** Resultados respeitam permissões
- [ ] **5.3** Links usam formato /go/:entity/:id
- [ ] **5.4** Limite de resultados funciona

### 6. Notifications

- [ ] **6.1** Contador de não lidas atualiza corretamente
- [ ] **6.2** Lista de notificações carrega rapidamente
- [ ] **6.3** Marcar como lida é instantâneo
- [ ] **6.4** Notificações respeitam BU scope

---

## Métricas a Coletar

| Métrica | Target | Como Medir |
|---------|--------|------------|
| TTI Home | < 3s | DevTools Performance |
| Requests por página | < 10 | Network tab |
| Payload total | < 500KB | Network tab |
| Tempo troca de BU | < 2s | Console timer |

---

## Verificação de Índices

```sql
-- Verificar índices criados
SELECT * FROM v_perf_indexes_report;

-- Verificar uso de índice em query específica
EXPLAIN (ANALYZE, BUFFERS) 
SELECT status, COUNT(*) 
FROM okr_team_key_results 
WHERE bu_id = 'xxx' AND deleted_at IS NULL 
GROUP BY status;
```

---

## Comandos de Auditoria

```bash
# Verificar queryKeys
npx tsx scripts/audit-querykeys.ts

# Verificar overfetch
npx tsx scripts/audit-overfetch.ts

# Gerar queries de profiling
npx tsx scripts/profile-queries.ts
```

---

## Resultado Esperado

| Cenário | Antes | Depois | Meta |
|---------|-------|--------|------|
| Home load | ~4s | ~2s | < 3s |
| Tickets list | ~3s | ~1.5s | < 2s |
| OKR RAG query | ~500ms | ~100ms | < 200ms |
| Unread count | ~200ms | ~50ms | < 100ms |

---

## Assinatura

- **QA Lead:** -
- **Data de Execução:** -
- **Resultado:** -
