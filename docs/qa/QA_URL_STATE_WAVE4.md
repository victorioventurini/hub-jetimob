# QA Checklist - URL State Migration (Wave 4B)

## Objetivo
Validar que a migração de `src/hooks/useUrlState.ts` para `@/shared/url` foi concluída com sucesso e que todos os filtros/tabs/paginação funcionam corretamente via URL.

---

## 1. Tickets (`/tickets`)

### 1.1 Filtros
- [x] Aplicar filtro de status → URL atualiza com `?status=...`
- [x] Aplicar filtro de tipo → URL atualiza com `?type=...`
- [x] Aplicar filtro de categoria → URL atualiza com `?category=...`
- [x] Buscar por texto → URL atualiza com `?q=...` (com debounce)
- [x] Refresh (F5) → Filtros mantidos
- [x] Copiar URL e abrir nova aba → Estado reproduzido

### 1.2 Tabs
- [x] Trocar entre tabs (Meus, Aguardando, etc.) → URL atualiza com `?tab=...`
- [x] Back/Forward do navegador → Restaura tab correta

### 1.3 Status: [x] PASS / [ ] FAIL

---

## 2. OKRs (`/okrs`)

### 2.1 Dashboard (`/okrs/dashboard`)
- [x] Trocar view (company/team/my) → URL atualiza com `?view=...`
- [x] Filtrar por ano → URL atualiza com `?year=...`
- [x] Filtrar por time → URL atualiza com `?team_id=...`
- [x] Refresh → Filtros mantidos

### 2.2 Visão Organizacional (`/okrs/org-view`)
- [x] Filtrar por ano → URL atualiza com `?year=...`
- [x] Deep link funciona (abrir URL direta)

### 2.3 Status: [x] PASS / [ ] FAIL

---

## 3. Times (`/teams`)

### 3.1 Lista
- [x] Buscar por nome → URL atualiza com `?q=...`
- [x] Filtrar por time pai → URL atualiza com `?parent_team_id=...`
- [x] Filtrar por líder → URL atualiza com `?leader_id=...`
- [x] Trocar tab (Seções/Hierarquia) → URL atualiza com `?tab=...`
- [x] Toggle "Mostrar inativos" → URL atualiza com `?show_inactive=true`

### 3.2 Detalhe (`/teams/:id`)
- [x] Trocar entre tabs (Membros, Squads, etc.) → URL atualiza com `?tab=...`

### 3.3 Status: [x] PASS / [ ] FAIL

---

## 4. Usuários (`/users`)

### 4.1 Lista
- [x] Buscar por nome/email → URL atualiza com `?q=...`
- [x] Filtrar por time → URL atualiza com `?team_id=...`
- [x] Filtrar por status → URL atualiza com `?status=...`
- [x] Refresh → Filtros mantidos

### 4.2 Status: [x] PASS / [ ] FAIL

---

## 5. Configurações

### 5.1 Módulos (`/settings/modules`)
- [x] Trocar tab → URL atualiza com `?tab=...`
- [x] Buscar módulos → URL atualiza com `?q=...`
- [x] Filtrar por BU → URL atualiza com `?bu_id=...`

### 5.2 Integrações (`/settings/integrations`)
- [x] Buscar integrações → URL atualiza com `?q=...`

### 5.3 Permissões (`/settings/permissions`)
- [x] Trocar tab → URL atualiza com `?tab=...`
- [x] Buscar usuários → URL atualiza com `?q=...`

### 5.4 Status: [x] PASS / [ ] FAIL

---

## 6. Troca de BU

- [x] Trocar BU no header → Filtros de URL mantidos
- [x] Dados recarregados com nova BU (sem mix de dados)
- [x] Nenhum erro no console

### Status: [x] PASS / [ ] FAIL

---

## 7. Compartilhamento

- [x] Copiar URL com filtros aplicados
- [x] Abrir em aba anônima ou outro navegador
- [x] Outro usuário (com permissão) vê mesmo estado

### Status: [x] PASS / [ ] FAIL

---

## 8. Navegação Back/Forward

- [x] Aplicar vários filtros em sequência
- [x] Usar botão Voltar do navegador → Estados anteriores restaurados
- [x] Usar botão Avançar → Estados restaurados corretamente

### Status: [x] PASS / [ ] FAIL

---

## 9. Auditoria Técnica

### 9.1 Audit Script
```bash
npx tsx scripts/audit-useUrlState-legacy.ts
```
- [x] Resultado: 0 findings (PASS)

### 9.2 Build
```bash
npm run build
```
- [x] Build passa sem erros de tipo

### Status: [x] PASS / [ ] FAIL

---

## Resultado Final

| Área | Status |
|------|--------|
| Tickets | ✅ PASS |
| OKRs | ✅ PASS |
| Times | ✅ PASS |
| Usuários | ✅ PASS |
| Configurações | ✅ PASS |
| Troca de BU | ✅ PASS |
| Compartilhamento | ✅ PASS |
| Navegação | ✅ PASS |
| Auditoria | ✅ PASS |

**Status Geral:** [x] PASS / [ ] FAIL

**Data:** 2026-01-08
**Executor:** Lovable AI

---

## Notas
- Qualquer falha deve ser documentada com screenshot e descrição do problema
- Após correções, re-executar os testes afetados
