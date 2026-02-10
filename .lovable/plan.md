

# Correção: user_type inconsistente em usuários externos

## Contexto (Pré-Checklist Validado)

Documentos consultados:
- **TCR v3.4.3** -- Confirma que `handle_new_user` cria profiles para externos com `employment_status = 'external'`
- **IDENTITY_CONVENTION v2.1.1** -- Sem menção a `user_type` (foco em `user_id` vs `profile_id`)
- **DATA_MODEL_REGISTRY v1.2.2** -- Tabela `profiles` com `user_type` (valores: internal/external)
- **EXTERNAL_USER_IDENTITY_PATTERN v1.0.0** -- Documenta o trigger mas **omite `user_type`** (linhas 124-126 mencionam apenas `employment_status`)
- **PERMISSIONS_AND_RBAC_MODEL v1.4.0** -- Persona "Externo" identificada por `user_roles.role = 'external'`

## Problema

A trigger `handle_new_user` seta `employment_status = 'external'` corretamente, mas **nunca seta `user_type`**, que tem default `'internal'`.

**Dados afetados:** 6 de 7 profiles com `employment_status = 'external'` tem `user_type = 'internal'`.

| Profile | user_type | employment_status |
|---------|-----------|-------------------|
| andressac@ferrigolo... | internal (ERRADO) | external |
| andressaf@ferrigolo... | internal (ERRADO) | external |
| bianca@ferrigolo... | external (OK) | external |
| flavia@ferrigolo... | internal (ERRADO) | external |
| lieli@ferrigolo... | internal (ERRADO) | external |
| luana@ferrigolo... | internal (ERRADO) | external |
| mariana@ferrigolo... | internal (ERRADO) | external |

## Causa Raiz

A documentacao (`EXTERNAL_USER_IDENTITY_PATTERN.md`) e o trigger foram escritos sem considerar a coluna `user_type`. O padrão assumiu que apenas `employment_status` era necessario para classificar o tipo de usuario. Ambos (código e documentação) estavam incompletos.

## Plano de Acao

### Passo 1: Migração SQL -- Corrigir dados existentes

```sql
UPDATE profiles
SET user_type = 'external', updated_at = NOW()
WHERE employment_status = 'external'
  AND user_type = 'internal'
  AND deleted_at IS NULL;
```

### Passo 2: Migração SQL -- Corrigir trigger `handle_new_user`

Duas alteracoes na funcao:

**UPDATE (profile pre-existente sem user_id):**
```sql
UPDATE public.profiles
SET user_id = NEW.id,
    onboarding_completed = false,
    bu_id = v_bu_id,
    user_type = CASE WHEN v_is_external THEN 'external' ELSE 'internal' END,
    updated_at = NOW()
WHERE id = v_existing_profile_id;
```

**INSERT (novo profile):**
Adicionar `user_type` na lista de colunas e valor correspondente:
```sql
INSERT INTO public.profiles (
  ..., employment_status, user_type, bu_id, onboarding_completed
) VALUES (
  ..., 
  (CASE WHEN v_is_external THEN 'external' ELSE 'active' END)::employment_status,
  (CASE WHEN v_is_external THEN 'external' ELSE 'internal' END),
  v_bu_id, false
);
```

### Passo 3: Atualizar `EXTERNAL_USER_IDENTITY_PATTERN.md`

Correcoes necessarias:

| Linha | Atual | Correcao |
|-------|-------|----------|
| 47 | `partner_companies (N:1)` | `external_companies (N:1)` |
| 57 | `partner_companies` | `external_companies` |
| 58 | `partner_company_bu_associations` | `external_company_bu_associations` |
| 124-126 | Menciona apenas `employment_status` | Adicionar: `user_type = 'external'` tambem e setado |
| 203 | `partner_company:partner_companies(status)` | `external_company:external_companies(status)` |

### Passo 4: Verificacao

```sql
-- Deve retornar 0 linhas
SELECT id, work_email, user_type, employment_status
FROM profiles
WHERE employment_status = 'external' AND user_type != 'external';
```

## Riscos

- **Nenhum breaking change**: nenhuma logica depende de externos terem `user_type = 'internal'`
- **Impacto positivo**: filtros em `/hub/users`, `v_bu_active_profiles`, selects passam a exibir corretamente

## Arquivos Modificados

1. **Migracao SQL** (2 statements: UPDATE dados + CREATE OR REPLACE FUNCTION)
2. **docs/guides/EXTERNAL_USER_IDENTITY_PATTERN.md** (5 correcoes de nomes legados + adicao de `user_type`)

