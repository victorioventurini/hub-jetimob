# QA Checklist - RBAC Phase 1

> **Data:** 2026-01-07  
> **Versão:** 1.0.0

---

## Usuários de Teste Necessários

Antes de iniciar os testes, certifique-se de ter usuários configurados com os seguintes perfis:

| ID | Role | Descrição | BU | Time |
|----|------|-----------|-----|------|
| U1 | `super_admin` | Administrador da plataforma | Todas | - |
| U2 | `admin` | Administrador da BU A | BU A | - |
| U3 | `team_leader` | Líder do Time X | BU A | Time X |
| U4 | `team_leader` | Líder do SubTime Y (filho de X) | BU A | SubTime Y |
| U5 | `collaborator` | Colaborador interno | BU A | Time X |
| U6 | `collaborator` | Colaborador sem time | BU A | - |
| U7 | `external_contact` | Contato externo (partner) | BU A | - |

---

## Cenários de Teste

### 1. Acesso Global vs BU

#### 1.1 Super Admin - Acesso Global
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 1.1.1 | U1 acessa `/settings/permissions` | ✅ Acesso permitido | ☐ |
| 1.1.2 | U1 vê todas as BUs no seletor | ✅ Lista completa | ☐ |
| 1.1.3 | U1 cria/edita permission keys no catálogo | ✅ Sucesso | ☐ |
| 1.1.4 | U1 gerencia grupos de permissão | ✅ Sucesso | ☐ |

#### 1.2 Admin BU - Escopo Limitado
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 1.2.1 | U2 acessa `/settings/permissions` | ❌ Acesso negado | ☐ |
| 1.2.2 | U2 acessa `/bu/permissions` | ✅ Acesso permitido | ☐ |
| 1.2.3 | U2 vê apenas sua BU no seletor | ✅ Apenas BU A | ☐ |
| 1.2.4 | U2 atribui permissões a usuários da BU | ✅ Sucesso | ☐ |
| 1.2.5 | U2 NÃO vê configurações globais do Hub | ✅ Ocultas | ☐ |

---

### 2. Hierarquia de Times

#### 2.1 Líder de Time
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 2.1.1 | U3 edita Time X (próprio time) | ✅ Sucesso | ☐ |
| 2.1.2 | U3 tenta editar Time pai | ❌ Bloqueado | ☐ |
| 2.1.3 | U3 tenta editar time irmão | ❌ Bloqueado | ☐ |
| 2.1.4 | U3 cria OKR para Time X | ✅ Sucesso | ☐ |
| 2.1.5 | U3 tenta criar OKR para outro time | ❌ Bloqueado | ☐ |

#### 2.2 Líder de SubTime
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 2.2.1 | U4 edita SubTime Y (próprio) | ✅ Sucesso | ☐ |
| 2.2.2 | U4 tenta editar Time X (pai) | ❌ Bloqueado | ☐ |
| 2.2.3 | U4 vê OKRs do Time X | ✅ Visualização ok | ☐ |
| 2.2.4 | U4 tenta editar OKR do Time X | ❌ Bloqueado | ☐ |

---

### 3. Tickets

#### 3.1 Colaborador Interno
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 3.1.1 | U5 cria ticket interno | ✅ Sucesso | ☐ |
| 3.1.2 | U5 vê seus próprios tickets | ✅ Lista correta | ☐ |
| 3.1.3 | U5 tenta ver ticket de outro usuário | ❌ Não visível (depende de config) | ☐ |
| 3.1.4 | U5 responde em ticket onde é participante | ✅ Sucesso | ☐ |

#### 3.2 Contato Externo
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 3.2.1 | U7 cria ticket externo (se permitido) | ✅/❌ Conforme permission | ☐ |
| 3.2.2 | U7 vê apenas tickets onde é participante | ✅ Filtrado | ☐ |
| 3.2.3 | U7 NÃO vê tickets internos | ❌ Bloqueado | ☐ |

---

### 4. Assets

#### 4.1 Visualização de Dados Sensíveis
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 4.1.1 | U2 (admin) vê serial/nota fiscal | ✅ Visível | ☐ |
| 4.1.2 | U5 com `assets.inventory.sensitive.view:bu` vê dados | ✅ Visível | ☐ |
| 4.1.3 | U5 SEM a permission vê dados sensíveis | ❌ Oculto | ☐ |
| 4.1.4 | U6 (viewer básico) vê inventário básico | ✅ Sem dados sensíveis | ☐ |

#### 4.2 Gestão de Inventário
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 4.2.1 | U2 cria item de inventário | ✅ Sucesso | ☐ |
| 4.2.2 | U5 com `assets.inventory.create:bu` cria item | ✅ Sucesso | ☐ |
| 4.2.3 | U5 SEM permission tenta criar item | ❌ Bloqueado | ☐ |
| 4.2.4 | U5 faz checkout de item (com permission) | ✅ Sucesso | ☐ |

---

### 5. OKRs

#### 5.1 Cancelamento de OKRs
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 5.1.1 | U1 (super_admin) cancela qualquer OKR | ✅ Sucesso | ☐ |
| 5.1.2 | U2 (admin BU) cancela OKR da BU | ✅ Sucesso | ☐ |
| 5.1.3 | U5 com `okrs.manage:bu` cancela OKR | ✅ Sucesso | ☐ |
| 5.1.4 | U5 SEM permission tenta cancelar | ❌ Bloqueado | ☐ |
| 5.1.5 | U3 cancela OKR do próprio time | ✅ Sucesso (se líder) | ☐ |
| 5.1.6 | U3 tenta cancelar OKR de outro time | ❌ Bloqueado | ☐ |

#### 5.2 Criação de OKRs
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 5.2.1 | U2 cria OKR organizacional | ✅ Sucesso | ☐ |
| 5.2.2 | U3 cria OKR para Time X | ✅ Sucesso | ☐ |
| 5.2.3 | U5 com permission cria OKR | ✅ Sucesso | ☐ |
| 5.2.4 | U5 SEM permission tenta criar | ❌ Bloqueado | ☐ |

---

### 6. KPIs

| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 6.1 | U2 cria métrica KPI | ✅ Sucesso | ☐ |
| 6.2 | U5 com `kpis.metric.create:bu` cria métrica | ✅ Sucesso | ☐ |
| 6.3 | U5 registra valor em KPI (com permission) | ✅ Sucesso | ☐ |
| 6.4 | U6 (sem permission) tenta criar métrica | ❌ Bloqueado | ☐ |

---

### 7. Permissões UI

#### 7.1 Global Permissions
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 7.1.1 | U1 acessa aba Catálogo | ✅ Visível | ☐ |
| 7.1.2 | U1 acessa aba Grupos | ✅ Visível | ☐ |
| 7.1.3 | U1 acessa aba Auditoria | ✅ Visível | ☐ |
| 7.1.4 | U2 tenta acessar rota diretamente | ❌ Redirecionado | ☐ |

#### 7.2 BU Permissions
| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 7.2.1 | U2 vê lista de usuários da BU | ✅ Visível | ☐ |
| 7.2.2 | U2 atribui grupo a usuário | ✅ Sucesso | ☐ |
| 7.2.3 | U2 adiciona override de permissão | ✅ Sucesso | ☐ |
| 7.2.4 | U5 tenta acessar página | ❌ Bloqueado | ☐ |

---

### 8. Remoção do "CEO"

| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 8.1 | Nenhum usuário com role "ceo" existe | ✅ Verificar DB | ☐ |
| 8.2 | Rota `/okrs/ceo` não existe | ✅ 404 | ☐ |
| 8.3 | Buscar "ceo" na UI não retorna nada | ✅ Sem resultados | ☐ |
| 8.4 | Tentar definir role "ceo" via API | ❌ Erro de validação | ☐ |

---

### 9. Segurança - Bypass Frontend

| # | Cenário | Esperado | Status |
|---|---------|----------|--------|
| 9.1 | U5 modifica DOM para mostrar botão oculto | Botão visível, mas... | ☐ |
| 9.2 | U5 clica no botão modificado | ❌ Request falha por RLS | ☐ |
| 9.3 | U5 envia request direto via DevTools | ❌ RLS bloqueia | ☐ |
| 9.4 | U5 tenta INSERT sem `is_current_bu` | ❌ RLS bloqueia | ☐ |

---

## Queries de Verificação

### Verificar Roles no Sistema
```sql
SELECT unnest(enum_range(NULL::app_role))::text as role;
-- Esperado: super_admin, admin, team_leader, collaborator
-- NÃO deve aparecer: ceo, director
```

### Verificar Usuários com Role CEO
```sql
SELECT * FROM user_roles WHERE role::text = 'ceo';
SELECT * FROM bu_user_memberships WHERE role_in_bu::text = 'ceo';
-- Esperado: 0 registros
```

### Verificar Permission Keys por Módulo
```sql
SELECT module, COUNT(*) FROM permission_catalog 
WHERE status = 'active' GROUP BY module ORDER BY 2 DESC;
```

---

## Instruções para Execução

1. **Ambiente:** Staging ou Desenvolvimento
2. **Pré-requisitos:** Usuários de teste criados conforme tabela
3. **Execução:** Marcar cada cenário como ✅ PASS ou ❌ FAIL
4. **Evidências:** Capturar screenshots para falhas
5. **Relatório:** Atualizar este documento com resultados

---

## Resultado Final

| Categoria | Total | Pass | Fail | % |
|-----------|-------|------|------|---|
| Acesso Global/BU | 9 | - | - | - |
| Hierarquia Times | 8 | - | - | - |
| Tickets | 7 | - | - | - |
| Assets | 8 | - | - | - |
| OKRs | 10 | - | - | - |
| KPIs | 4 | - | - | - |
| Permissões UI | 8 | - | - | - |
| Remoção CEO | 4 | - | - | - |
| Segurança | 4 | - | - | - |
| **TOTAL** | 62 | - | - | - |

---

**Testado por:** _______________  
**Data:** _______________  
**Aprovado:** ☐ Sim ☐ Não
