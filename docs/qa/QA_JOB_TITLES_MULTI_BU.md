# QA - Modelo Multi-BU para Cargos (Wave 2.6)

**Data:** 2026-01-12  
**Versão:** 1.0  
**Status:** ✅ APROVADO

---

## Objetivo

Validar a conversão do modelo de cargos de `bu_id` (singular) para `bu_ids[]` (multi-BU), permitindo que um cargo exista em múltiplas Business Units.

---

## Mudanças Implementadas

1. **Banco de Dados**
   - Coluna `bu_id` removida
   - Coluna `bu_ids UUID[]` adicionada
   - Índice GIN criado para busca eficiente em arrays
   - Índice único global por nome (case-insensitive)
   - Cargos duplicados foram mergeados (união de BUs)
   - FKs em `profiles` e `bu_user_memberships` atualizadas

2. **RLS Policies**
   - SELECT: usuário vê cargos de qualquer BU que tenha acesso
   - INSERT: requer acesso à BU atual no array
   - UPDATE/DELETE: requer acesso a pelo menos uma BU do cargo

3. **Frontend**
   - `JobTitleDialog`: seleção de múltiplas BUs via checkboxes
   - `JobTitlesPage`: coluna BUs com tooltip mostrando nomes
   - Types e hooks atualizados para `bu_ids[]`

---

## Casos de Teste

### 1. Criar cargo multi-BU

| Passo | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 1.1 | Navegar para /hub/job-titles | Lista de cargos carrega | ✅ |
| 1.2 | Clicar em "Novo Cargo" | Dialog abre com BU atual pré-selecionada | ✅ |
| 1.3 | Preencher nome e selecionar 2+ BUs | Checkboxes funcionam | ✅ |
| 1.4 | Salvar | Cargo criado com múltiplas BUs | ✅ |
| 1.5 | Hover no badge de BUs | Tooltip mostra nomes das BUs | ✅ |

### 2. Editar cargo - adicionar BU

| Passo | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 2.1 | Editar cargo existente | Dialog abre com BUs atuais selecionadas | ✅ |
| 2.2 | Adicionar nova BU | Checkbox marca | ✅ |
| 2.3 | Salvar | Cargo atualizado com nova BU | ✅ |

### 3. Cargo aparece apenas em BUs selecionadas

| Passo | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 3.1 | Criar cargo apenas para BU A | Cargo criado | ✅ |
| 3.2 | Em BU A, abrir select de cargos | Cargo aparece | ✅ |
| 3.3 | Trocar para BU B | Navegar para BU B | ✅ |
| 3.4 | Abrir select de cargos | Cargo NÃO aparece | ✅ |

### 4. Unicidade global de nome

| Passo | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 4.1 | Criar cargo "Teste" | Cargo criado | ✅ |
| 4.2 | Tentar criar outro "Teste" | Erro: nome já existe | ✅ |
| 4.3 | Tentar criar "teste" (lowercase) | Erro: nome já existe | ✅ |

---

## Validações de Integridade SQL

```sql
-- ✅ PASS: Nenhum bu_ids vazio
SELECT COUNT(*) FROM job_titles WHERE bu_ids = '{}' AND deleted_at IS NULL; -- 0

-- ✅ PASS: Nenhum duplicata de nome
SELECT lower(trim(name)), count(*) 
FROM job_titles 
WHERE deleted_at IS NULL
GROUP BY 1 
HAVING count(*) > 1; -- 0 rows

-- ✅ PASS: Todos os cargos têm pelo menos 1 BU
SELECT COUNT(*) FROM job_titles 
WHERE array_length(bu_ids, 1) IS NULL AND deleted_at IS NULL; -- 0
```

---

## Checklist de RLS

- [x] `job_titles_select_policy` usa `EXISTS (SELECT 1 FROM unnest(bu_ids) WHERE user_has_bu_access(...))`
- [x] `job_titles_insert_policy` usa verificação de BU atual no array
- [x] `job_titles_update_policy` verifica acesso a pelo menos uma BU
- [x] `job_titles_delete_policy` verifica acesso a pelo menos uma BU

---

## Função Helper

```sql
-- Verifica se cargo pertence à BU
job_title_belongs_to_bu(p_job_title_id UUID, p_bu_id UUID) RETURNS BOOLEAN
```

---

## Breaking Changes

- `JobTitle.bu_id` → `JobTitle.bu_ids[]`
- `JobTitleFormData` agora requer `bu_ids: string[]`
- Cargos com mesmo nome foram mergeados automaticamente

---

## Aprovação

| Revisor | Data | Status |
|---------|------|--------|
| Sistema Automatizado | 2026-01-12 | ✅ APROVADO |
