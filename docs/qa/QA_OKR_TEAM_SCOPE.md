# QA - OKR Team Scope Hardening

**Versão:** 1.1.0  
**Data:** 2026-01-26  
**Status:** ✅ PASS

---

## Cenários de Teste - Objetivos de Time

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

## Cenários de Teste - Key Results (KRs)

### 7. Owner de KR pode editar
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como owner de um KR | Autenticado |
| 2 | Visualizar KR | Botões de editar/check-in visíveis |
| 3 | Clicar em editar | ✅ **PASS** - Modal abre |
| 4 | Salvar alterações | ✅ **PASS** - KR atualizado |

### 8. Co-responsável de KR pode editar
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como co-responsável de um KR | Autenticado |
| 2 | Visualizar KR | Botões de editar/check-in visíveis |
| 3 | Clicar em editar | ✅ **PASS** - Modal abre |
| 4 | Salvar alterações | ✅ **PASS** - KR atualizado |

### 9. Líder do time pode editar KRs do time
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como líder do Time A | Autenticado |
| 2 | Visualizar KR de qualquer membro do Time A | Botões de editar/check-in visíveis |
| 3 | Clicar em editar | ✅ **PASS** - Modal abre |

### 10. Colaborador sem permissão NÃO vê botões de edição
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como colaborador sem liderança | Autenticado |
| 2 | Visualizar KR de outro usuário/time | Apenas badge de status visível |
| 3 | Tentar editar via API | ✅ **FAIL** - RLS bloqueia (403) |

---

## Cenários de Teste - Iniciativas

### 11. Owner de iniciativa pode editar
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como owner de uma iniciativa | Autenticado |
| 2 | Visualizar iniciativa | Botões de editar/excluir visíveis |
| 3 | Clicar em editar | ✅ **PASS** - Modal abre |
| 4 | Salvar alterações | ✅ **PASS** - Iniciativa atualizada |

### 12. Contributor de iniciativa pode editar
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como contributor de uma iniciativa | Autenticado |
| 2 | Visualizar iniciativa | Botões de editar visíveis |
| 3 | Clicar em editar | ✅ **PASS** - Modal abre |
| 4 | Salvar alterações | ✅ **PASS** - Iniciativa atualizada |

### 13. Líder do time do KR pode editar iniciativas
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como líder do Time A | Autenticado |
| 2 | Visualizar iniciativa de KR do Time A | Botões de editar visíveis |
| 3 | Clicar em editar | ✅ **PASS** - Modal abre |

### 14. Líder do time do KR pode excluir iniciativas
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como líder do Time A | Autenticado |
| 2 | Visualizar iniciativa de KR do Time A | Botão excluir visível |
| 3 | Confirmar exclusão | ✅ **PASS** - Iniciativa excluída |

### 15. Contributor NÃO pode excluir (apenas editar)
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como contributor de uma iniciativa | Autenticado |
| 2 | Visualizar iniciativa | Botão editar visível, excluir NÃO |
| 3 | Tentar excluir via API | ✅ **FAIL** - RLS bloqueia (403) |

### 16. Colaborador comum NÃO pode editar/excluir
| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Login como colaborador sem vínculo | Autenticado |
| 2 | Visualizar iniciativa de outro usuário | Sem botões de ação |
| 3 | Tentar editar via API | ✅ **FAIL** - RLS bloqueia (403) |
| 4 | Tentar excluir via API | ✅ **FAIL** - RLS bloqueia (403) |

---

## Funções Backend Validadas

| Função | Descrição | Status |
|--------|-----------|--------|
| `get_descendant_team_ids(uuid)` | Retorna time + descendentes | ✅ |
| `get_okr_manageable_team_ids(uuid, uuid)` | Times permitidos para OKR | ✅ |
| `can_manage_team_okr(uuid, uuid)` | Verifica permissão | ✅ |
| `can_manage_team_okr_by_profile(uuid, uuid)` | Verifica permissão por profile | ✅ |

## RLS Policies Atualizadas

### okr_team_objectives
| Policy | Operação | Validação |
|--------|----------|-----------|
| `okr_team_objectives_select` | SELECT | `is_bu_member` |
| `okr_team_objectives_insert` | INSERT | `is_bu_member AND can_manage_team_okr` |
| `okr_team_objectives_update` | UPDATE | `is_bu_member AND can_manage_team_okr` |
| `okr_team_objectives_delete` | DELETE | `is_bu_member AND can_manage_team_okr` |

### okr_team_key_results
| Policy | Operação | Validação |
|--------|----------|-----------|
| `okr_team_key_results_select` | SELECT | `is_bu_member` |
| `okr_team_key_results_insert` | INSERT | `has_permission + can_manage_team_okr` |
| `okr_team_key_results_update_v2` | UPDATE | `has_permission + (owner OR co_responsible OR team_leader)` |
| `okr_team_key_results_delete_v2` | DELETE | `has_permission + (owner OR team_leader)` |

### okr_initiatives
| Policy | Operação | Validação |
|--------|----------|-----------|
| `okr_initiatives_select` | SELECT | `is_bu_member` |
| `okr_initiatives_insert` | INSERT | `has_permission` |
| `okr_initiatives_update_v2` | UPDATE | `has_permission + (owner OR contributor OR kr_team_leader)` |
| `okr_initiatives_delete_v2` | DELETE | `has_permission + (owner OR kr_team_leader)` |

---

## Frontend Hooks de Permissão

| Hook | Propósito | Localização |
|------|-----------|-------------|
| `useCanManageTeamOkr` | Verifica liderança de time | `src/modules/okrs/hooks/useCanManageTeamOkr.ts` |
| `useCanEditKr` | Verifica edição de KR específico | `src/modules/okrs/hooks/useCanEditKr.ts` |
| `useCanEditInitiative` | Verifica edição de iniciativa | `src/modules/okrs/hooks/useCanEditInitiative.ts` |

---

## Histórico de Alterações

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-01-09 | 1.0.0 | Cenários iniciais de Objetivos de Time |
| 2026-01-26 | 1.1.0 | Adicionados cenários de KRs e Iniciativas |

---

## Resultado Final

**Status Geral:** ✅ PASS  
**Cobertura:** 100% dos cenários validados  
**Risco Residual:** Nenhum
