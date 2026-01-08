# QA Checklist - URL State Migration (Wave 4B)

## Objetivo
Validar que a migração de `src/hooks/useUrlState.ts` para `@/shared/url` foi concluída com sucesso e que todos os filtros/tabs/paginação funcionam corretamente via URL.

---

## 1. Tickets (`/tickets`)

### 1.1 Filtros
- [ ] Aplicar filtro de status → URL atualiza com `?status=...`
- [ ] Aplicar filtro de tipo → URL atualiza com `?type=...`
- [ ] Aplicar filtro de categoria → URL atualiza com `?category=...`
- [ ] Buscar por texto → URL atualiza com `?q=...` (com debounce)
- [ ] Refresh (F5) → Filtros mantidos
- [ ] Copiar URL e abrir nova aba → Estado reproduzido

### 1.2 Tabs
- [ ] Trocar entre tabs (Meus, Aguardando, etc.) → URL atualiza com `?tab=...`
- [ ] Back/Forward do navegador → Restaura tab correta

### 1.3 Status: [ ] PASS / [ ] FAIL

---

## 2. OKRs (`/okrs`)

### 2.1 Dashboard (`/okrs/dashboard`)
- [ ] Trocar view (company/team/my) → URL atualiza com `?view=...`
- [ ] Filtrar por ano → URL atualiza com `?year=...`
- [ ] Filtrar por time → URL atualiza com `?team_id=...`
- [ ] Refresh → Filtros mantidos

### 2.2 Visão Organizacional (`/okrs/org-view`)
- [ ] Filtrar por ano → URL atualiza com `?year=...`
- [ ] Deep link funciona (abrir URL direta)

### 2.3 Status: [ ] PASS / [ ] FAIL

---

## 3. Times (`/teams`)

### 3.1 Lista
- [ ] Buscar por nome → URL atualiza com `?q=...`
- [ ] Filtrar por time pai → URL atualiza com `?parent_team_id=...`
- [ ] Filtrar por líder → URL atualiza com `?leader_id=...`
- [ ] Trocar tab (Seções/Hierarquia) → URL atualiza com `?tab=...`
- [ ] Toggle "Mostrar inativos" → URL atualiza com `?show_inactive=true`

### 3.2 Detalhe (`/teams/:id`)
- [ ] Trocar entre tabs (Membros, Squads, etc.) → URL atualiza com `?tab=...`

### 3.3 Status: [ ] PASS / [ ] FAIL

---

## 4. Usuários (`/users`)

### 4.1 Lista
- [ ] Buscar por nome/email → URL atualiza com `?q=...`
- [ ] Filtrar por time → URL atualiza com `?team_id=...`
- [ ] Filtrar por status → URL atualiza com `?status=...`
- [ ] Refresh → Filtros mantidos

### 4.2 Status: [ ] PASS / [ ] FAIL

---

## 5. Configurações

### 5.1 Módulos (`/settings/modules`)
- [ ] Trocar tab → URL atualiza com `?tab=...`
- [ ] Buscar módulos → URL atualiza com `?q=...`
- [ ] Filtrar por BU → URL atualiza com `?bu_id=...`

### 5.2 Integrações (`/settings/integrations`)
- [ ] Buscar integrações → URL atualiza com `?q=...`

### 5.3 Permissões (`/settings/permissions`)
- [ ] Trocar tab → URL atualiza com `?tab=...`
- [ ] Buscar usuários → URL atualiza com `?q=...`

### 5.4 Status: [ ] PASS / [ ] FAIL

---

## 6. Troca de BU

- [ ] Trocar BU no header → Filtros de URL mantidos
- [ ] Dados recarregados com nova BU (sem mix de dados)
- [ ] Nenhum erro no console

### Status: [ ] PASS / [ ] FAIL

---

## 7. Compartilhamento

- [ ] Copiar URL com filtros aplicados
- [ ] Abrir em aba anônima ou outro navegador
- [ ] Outro usuário (com permissão) vê mesmo estado

### Status: [ ] PASS / [ ] FAIL

---

## 8. Navegação Back/Forward

- [ ] Aplicar vários filtros em sequência
- [ ] Usar botão Voltar do navegador → Estados anteriores restaurados
- [ ] Usar botão Avançar → Estados restaurados corretamente

### Status: [ ] PASS / [ ] FAIL

---

## 9. Auditoria Técnica

### 9.1 Audit Script
```bash
npx tsx scripts/audit-useUrlState-legacy.ts
```
- [ ] Resultado: 0 findings (PASS)

### 9.2 Build
```bash
npm run build
```
- [ ] Build passa sem erros de tipo

### Status: [ ] PASS / [ ] FAIL

---

## Resultado Final

| Área | Status |
|------|--------|
| Tickets | |
| OKRs | |
| Times | |
| Usuários | |
| Configurações | |
| Troca de BU | |
| Compartilhamento | |
| Navegação | |
| Auditoria | |

**Status Geral:** [ ] PASS / [ ] FAIL

**Data:** ___________
**Executor:** ___________

---

## Notas
- Qualquer falha deve ser documentada com screenshot e descrição do problema
- Após correções, re-executar os testes afetados
