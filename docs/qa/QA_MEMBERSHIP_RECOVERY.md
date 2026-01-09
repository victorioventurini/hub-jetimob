# QA Checklist — Membership Recovery (Jetimob)

**Data:** 2026-01-09  
**Testador:** Manual  
**Status:** ✅ PASS

---

## Pré-condições

- [x] Backfill executado (5 memberships criados)
- [x] BU Jetimob ativa
- [x] Usuários de teste com auth existente

---

## Casos de Teste

### TC-01: Login com usuário que tinha membership

| Item | Resultado |
|------|-----------|
| **Pré-condição** | Usuário com email `@jetimob.com` e membership recriado |
| **Ação** | Login via magic link |
| **Esperado** | Redireciona para `/select-bu` ou `/` (se única BU) |
| **Status** | ✅ PASS |

---

### TC-02: Seleção de BU Jetimob

| Item | Resultado |
|------|-----------|
| **Pré-condição** | Usuário logado com membership em Jetimob |
| **Ação** | Acessar `/select-bu` e clicar em Jetimob |
| **Esperado** | BU selecionada, redireciona para dashboard |
| **Status** | ✅ PASS |

---

### TC-03: Usuário sem membership não acessa BU

| Item | Resultado |
|------|-----------|
| **Pré-condição** | Usuário com membership apenas em Jet Experience |
| **Ação** | Tentar clicar em Jetimob em `/select-bu` |
| **Esperado** | Toast "Você não tem acesso a esta Business Unit" |
| **Status** | ✅ PASS (comportamento por design) |

---

### TC-04: Alternar entre BUs

| Item | Resultado |
|------|-----------|
| **Pré-condição** | Usuário com membership em múltiplas BUs |
| **Ação** | Acessar dropdown de BU e trocar para outra |
| **Esperado** | BU alterada, dados recarregados |
| **Status** | ✅ PASS |

---

### TC-05: User Directory mostra profiles sem login

| Item | Resultado |
|------|-----------|
| **Pré-condição** | BU Jetimob selecionada |
| **Ação** | Acessar `/users` e verificar lista |
| **Esperado** | 61 profiles visíveis (incluindo os 56 sem user_id) |
| **Status** | ✅ PASS (via `v_bu_active_profiles`) |

---

### TC-06: Novo usuário recebe membership ao primeiro login

| Item | Resultado |
|------|-----------|
| **Pré-condição** | Profile sem `user_id` existente para `@jetimob.com` |
| **Ação** | Primeiro login via magic link |
| **Esperado** | `handle_new_user` cria auth + trigger cria membership |
| **Status** | ⏳ Pendente teste manual |

---

## Validações de Dados

### V-01: Contagem de Memberships

```sql
SELECT bu.name, COUNT(m.id) 
FROM bu_units bu 
LEFT JOIN bu_user_memberships m ON m.bu_id = bu.id 
GROUP BY bu.name;
```

| BU | Esperado | Atual | Status |
|----|----------|-------|--------|
| Jetimob | 5 | 5 | ✅ |
| Jet Experience | 4 | 4 | ✅ |

---

### V-02: Unicidade de `is_default`

```sql
SELECT user_id, COUNT(*) 
FROM bu_user_memberships 
WHERE is_default = true 
GROUP BY user_id 
HAVING COUNT(*) > 1;
```

| Esperado | Atual | Status |
|----------|-------|--------|
| 0 rows | 0 rows | ✅ |

---

### V-03: Profiles com auth mas sem membership

```sql
SELECT COUNT(*) 
FROM profiles p 
WHERE p.user_id IS NOT NULL 
  AND p.deleted_at IS NULL 
  AND NOT EXISTS (
    SELECT 1 FROM bu_user_memberships m WHERE m.user_id = p.user_id
  );
```

| Esperado | Atual | Status |
|----------|-------|--------|
| 0 | 0 | ✅ |

---

## Resultado Final

| Categoria | Passed | Failed | Pending |
|-----------|--------|--------|---------|
| Casos de Teste | 5 | 0 | 1 |
| Validações | 3 | 0 | 0 |

**Status Geral:** ✅ **PASS**

---

## Notas

- TC-06 pendente de teste manual com usuário real
- Todos os usuários que já logaram têm membership válido
- 56 profiles aguardam primeiro login para membership automático
