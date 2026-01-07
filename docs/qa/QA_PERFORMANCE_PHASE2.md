# QA Checklist: Performance Phase 2

## Usuários de Teste

| Perfil | Descrição |
|--------|-----------|
| Internal Admin | Admin da BU |
| Internal Leader | Líder de time |
| Internal Collaborator | Colaborador |
| External Contact | Contato de parceiro |

---

## Cenários de Teste

### 1. Home Dashboard
- [ ] Carregar home em < 3s após login
- [ ] Trocar BU e home carrega em < 2s
- [ ] Cards de aniversários carregam corretamente
- [ ] OKR summary mostra contagens corretas

### 2. Tickets
- [ ] Lista de tickets carrega em < 2s
- [ ] Filtrar por status funciona rapidamente
- [ ] Abrir ticket com 50+ mensagens carrega em < 3s
- [ ] Scroll em mensagens é fluido

### 3. OKRs
- [ ] Lista de objetivos carrega em < 2s
- [ ] Expandir KRs carrega check-ins sob demanda
- [ ] Dashboard de OKRs mostra RAG correto

### 4. Assets
- [ ] Inventory list carrega em < 2s
- [ ] Filtros funcionam rapidamente
- [ ] Movimentações de asset carregam paginadas

### 5. Global Search
- [ ] Busca por "a" (termo curto) responde em < 1s
- [ ] Resultados respeitam permissões
- [ ] Links usam formato /go/:entity/:id

### 6. Notifications
- [ ] Contador de não lidas atualiza corretamente
- [ ] Lista de notificações carrega rapidamente
- [ ] Marcar como lida é instantâneo

---

## Métricas a Coletar

| Métrica | Target | Como Medir |
|---------|--------|------------|
| TTI Home | < 3s | DevTools Performance |
| Requests por página | < 10 | Network tab |
| Payload total | < 500KB | Network tab |

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
