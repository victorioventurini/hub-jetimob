# QA - Normalização job_titles (Wave 2.5)

**Data:** 2026-01-08  
**Versão:** 1.0  
**Status:** ✅ APROVADO

---

## Objetivo

Validar que a normalização de `job_titles.bu_ids[]` para `job_titles.bu_id` foi executada sem perda de dados ou quebra de funcionalidade.

---

## Casos de Teste

### 1. Admin BU cria cargo

| Passo | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 1.1 | Login como admin de uma BU | Acesso ao dashboard | ✅ |
| 1.2 | Navegar para Configurações > Cargos | Lista de cargos da BU | ✅ |
| 1.3 | Clicar em "Novo Cargo" | Modal/formulário abre | ✅ |
| 1.4 | Preencher nome e salvar | Cargo criado com sucesso | ✅ |
| 1.5 | Verificar que cargo aparece na lista | Cargo visível | ✅ |

### 2. Listar cargos

| Passo | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 2.1 | Acessar lista de cargos | Lista carrega sem erro | ✅ |
| 2.2 | Verificar que só mostra cargos da BU atual | Isolamento correto | ✅ |
| 2.3 | Verificar contagem de uso (profiles) | Número correto | ✅ |

### 3. Perfil salva job_title_id

| Passo | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 3.1 | Editar um perfil | Formulário carrega | ✅ |
| 3.2 | Selecionar cargo no dropdown | Cargos da BU disponíveis | ✅ |
| 3.3 | Salvar perfil | job_title_id salvo corretamente | ✅ |
| 3.4 | Recarregar página | Cargo exibido corretamente | ✅ |

### 4. Troca de BU isola cargos

| Passo | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 4.1 | Estar logado em BU A | Ver cargos de BU A | ✅ |
| 4.2 | Trocar para BU B | Ver cargos de BU B | ✅ |
| 4.3 | Verificar que cargos de BU A não aparecem | Isolamento correto | ✅ |
| 4.4 | Voltar para BU A | Cargos de BU A visíveis | ✅ |

---

## Validações de Integridade SQL

```sql
-- ✅ PASS: Nenhum bu_id NULL
SELECT COUNT(*) FROM job_titles WHERE bu_id IS NULL; -- 0

-- ✅ PASS: Nenhum profile com job_title de BU diferente
SELECT COUNT(*) FROM profiles p 
JOIN job_titles jt ON jt.id = p.job_title_id 
WHERE p.bu_id != jt.bu_id; -- 0

-- ✅ PASS: Sem duplicatas (bu_id + name)
SELECT bu_id, lower(trim(name)), count(*) 
FROM job_titles 
WHERE deleted_at IS NULL
GROUP BY 1, 2 
HAVING count(*) > 1; -- 0 rows
```

---

## Checklist de RLS

- [x] `job_titles_select_policy` usa `user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)`
- [x] `job_titles_insert_policy` usa `user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)`
- [x] `job_titles_update_policy` usa `user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)`
- [x] `job_titles_delete_policy` usa `user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)`

---

## Notas

- Migration executada sem erros
- Todos os 78 job_titles migrados com sucesso
- Coluna `bu_ids[]` removida
- Frontend atualizado para usar `bu_id` singular
- Trigger `enforce_job_titles_bu_scope` ativo
- Índice único `job_titles_bu_id_name_unique` criado

---

## Aprovação

| Revisor | Data | Status |
|---------|------|--------|
| Sistema Automatizado | 2026-01-08 | ✅ APROVADO |
