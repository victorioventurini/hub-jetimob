# QA - OKR Team Scope Hardening

**Versão:** 1.0.0  
**Data:** 2026-01-09  
**Status:** ✅ PASS

---

## Cenários de Teste

### 1. Líder criando OKR no próprio time
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como líder do Time A | Autenticado |
| 2 | Abrir modal de criação de OKR de time | Modal abre |
| 3 | Campo Time vem pré-selecionado | Time A selecionado |
| 4 | Preencher campos e salvar | ✅ **PASS** - OKR criado |

### 2. Líder criando OKR em sub-time
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como líder do Time A (pai de Time B) | Autenticado |
| 2 | Abrir modal de criação de OKR | Modal abre |
| 3 | Verificar select de times | Time A e Time B disponíveis |
| 4 | Selecionar Time B e salvar | ✅ **PASS** - OKR criado para sub-time |

### 3. Líder tentando criar OKR em outro time (BLOQUEIO)
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como líder do Time A | Autenticado |
| 2 | Abrir modal de criação de OKR | Modal abre |
| 3 | Verificar select de times | Time C (outro ramo) NÃO aparece |
| 4 | Tentar inserir via API direta | ✅ **FAIL** - RLS bloqueia (403) |

### 4. Sub-líder tentando criar OKR no time pai (BLOQUEIO)
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como líder do Time B (filho de Time A) | Autenticado |
| 2 | Abrir modal de criação de OKR | Modal abre |
| 3 | Verificar select de times | Time A (pai) NÃO aparece |
| 4 | Tentar inserir via API direta | ✅ **FAIL** - RLS bloqueia (403) |

### 5. Admin criando OKR em qualquer time
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como admin da BU | Autenticado |
| 2 | Abrir modal de criação de OKR | Modal abre |
| 3 | Verificar select de times | Todos os times disponíveis |
| 4 | Criar OKR para qualquer time | ✅ **PASS** - Admin tem acesso total |

### 6. Usuário sem liderança (BLOQUEIO)
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como colaborador comum | Autenticado |
| 2 | Abrir modal de criação de OKR | Modal abre |
| 3 | Verificar campo de times | Alerta: "Você não tem permissão" |
| 4 | Botão criar desabilitado | ✅ **PASS** - Bloqueado na UI |

---

## Funções Backend Validadas

| Função | Descrição | Status |
|--------|-----------|--------|
| `get_descendant_team_ids(uuid)` | Retorna time + descendentes | ✅ |
| `get_okr_manageable_team_ids(uuid, uuid)` | Times permitidos para OKR | ✅ |
| `can_manage_team_okr(uuid, uuid)` | Verifica permissão | ✅ |

## RLS Policies Atualizadas

| Policy | Operação | Validação |
|--------|----------|-----------|
| `okr_team_objectives_select` | SELECT | `is_bu_member` |
| `okr_team_objectives_insert` | INSERT | `is_bu_member AND can_manage_team_okr` |
| `okr_team_objectives_update` | UPDATE | `is_bu_member AND can_manage_team_okr` |
| `okr_team_objectives_delete` | DELETE | `is_bu_member AND can_manage_team_okr` |

---

## Resultado Final

**Status Geral:** ✅ PASS  
**Cobertura:** 100% dos cenários validados  
**Risco Residual:** Nenhum
