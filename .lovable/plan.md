

## Problema: `jetimob.com` está em duas BUs

A função `get_bu_by_email_domain` retorna `LIMIT 1` sem `ORDER BY`, e o domínio `jetimob.com` está nas `allowed_email_domains` de **ambas** Jetimob e Jet Experience. O resultado é não-determinístico — qualquer uma pode ser retornada.

Além disso, o `handle_new_user` sobrescreve o `bu_id` do profile pré-existente com o valor retornado pela função, **ignorando a BU original** que foi atribuída na importação.

---

## Solução (2 partes)

### 1. Corrigir `handle_new_user`: respeitar BU do profile pré-existente

Quando um profile já existe (importado antes do primeiro login), o trigger **não deve sobrescrever** o `bu_id`. O profile foi criado com uma BU específica por um admin — essa é a fonte de verdade.

**Mudança na linha 81 do trigger:**
```sql
-- ANTES:
SET user_id = NEW.id,
    onboarding_completed = false,
    bu_id = v_bu_id,  -- ← sobrescreve sempre

-- DEPOIS:
SET user_id = NEW.id,
    onboarding_completed = false,
    bu_id = profiles.bu_id,  -- ← mantém o original do profile
```

E o membership criado na sequência deve usar o `bu_id` **do profile existente**, não o da função de domínio:

```sql
-- Buscar bu_id do profile existente
SELECT bu_id INTO v_bu_id FROM profiles WHERE id = v_existing_profile_id;
```

### 2. Remover `jetimob.com` das domains de Jet Experience

O domínio `jetimob.com` não deveria estar em Jet Experience. Jet Experience tem seu próprio domínio `jetxp.com.br`.

**Migration:**
```sql
UPDATE bu_units 
SET allowed_email_domains = ARRAY['jetxp.com.br']
WHERE id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f';
```

Isso elimina a ambiguidade na raiz, garantindo que `jetimob.com` → Jetimob sempre.

---

## Arquivos modificados

1. **Migration SQL** — corrige `handle_new_user` + remove domínio duplicado de Jet Experience
2. Nenhuma mudança no frontend

---

## Impacto

- Futuros logins de profiles importados manterão a BU correta
- `jetimob.com` terá resolução determinística (apenas Jetimob)
- Nenhum dado existente precisa correção adicional (Lívia já foi corrigida manualmente)

