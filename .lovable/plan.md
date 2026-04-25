
# Plano de Execução — Habilitar tickets externos da Ferrigolo na BU Victorio Venturini

## Contexto auditado (read-only confirmado)

| Item | Valor |
|---|---|
| BU destino | Victorio Venturini — `2eeeb494-178b-4a6d-96ee-d103fda448a0` |
| BU origem (espelho) | Jetimob — `a0000000-0000-0000-0000-000000000001` |
| Empresa parceira | Ferrigolo Advogados Associados — `92ba2f29-28b3-4c9e-a23a-d8daf926db5a` |
| Categoria origem | "Jurídico" (`f14e0f87-4774-445c-951d-58856c1410e7`, scope=`external`) |
| Subcategorias origem | **21 ativas** |
| Contatos ativos Ferrigolo | **12** |
| Capacidades a replicar | **35** (categoria + subcategoria) |
| Conflitos detectados | Nenhum — Victorio não tem categorias nem associações de contato com Ferrigolo |

---

## Etapa 1 — Criar categoria "Jurídico" na Victorio Venturini

```sql
INSERT INTO public.ticket_categories (bu_id, name, scope, status)
VALUES ('2eeeb494-178b-4a6d-96ee-d103fda448a0', 'Jurídico', 'external', 'active');
```

## Etapa 2 — Replicar as 21 subcategorias (preservando os nomes)

```sql
INSERT INTO public.ticket_subcategories (bu_id, category_id, name, status, default_initial_message)
SELECT 
  '2eeeb494-178b-4a6d-96ee-d103fda448a0' AS bu_id,
  (SELECT id FROM ticket_categories 
   WHERE bu_id='2eeeb494-178b-4a6d-96ee-d103fda448a0' 
     AND name='Jurídico' AND deleted_at IS NULL) AS category_id,
  s.name,
  s.status,
  s.default_initial_message
FROM ticket_subcategories s
WHERE s.category_id = 'f14e0f87-4774-445c-951d-58856c1410e7'
  AND s.deleted_at IS NULL;
```

## Etapa 3 — Vincular os 12 contatos da Ferrigolo à BU Victorio Venturini

```sql
INSERT INTO public.partner_contact_bu_associations 
  (partner_contact_id, bu_id, is_active, notes)
SELECT 
  pc.id,
  '2eeeb494-178b-4a6d-96ee-d103fda448a0',
  true,
  'Habilitação manual — Ferrigolo na BU Victorio Venturini'
FROM partner_contacts pc
WHERE pc.external_company_id = '92ba2f29-28b3-4c9e-a23a-d8daf926db5a'
  AND pc.status = 'active'
  AND pc.deleted_at IS NULL;
```

## Etapa 4 — Replicar as 35 capacidades, remapeando IDs por NOME

A chave do remapeamento é casar `subcategory.name` entre origem e destino, já que as subcategorias são recriadas com novos UUIDs mas mesmo nome.

```sql
INSERT INTO public.partner_contact_capabilities 
  (bu_id, external_company_id, contact_id, category_id, subcategory_id, is_active)
SELECT 
  '2eeeb494-178b-4a6d-96ee-d103fda448a0' AS bu_id,
  pcc.external_company_id,
  pcc.contact_id,
  new_cat.id AS category_id,
  new_sub.id AS subcategory_id,
  true
FROM partner_contact_capabilities pcc
JOIN ticket_subcategories old_sub ON old_sub.id = pcc.subcategory_id
JOIN ticket_categories new_cat 
  ON new_cat.bu_id = '2eeeb494-178b-4a6d-96ee-d103fda448a0'
  AND new_cat.name = 'Jurídico'
  AND new_cat.deleted_at IS NULL
JOIN ticket_subcategories new_sub 
  ON new_sub.category_id = new_cat.id
  AND new_sub.name = old_sub.name
  AND new_sub.deleted_at IS NULL
WHERE pcc.external_company_id = '92ba2f29-28b3-4c9e-a23a-d8daf926db5a'
  AND pcc.bu_id = 'a0000000-0000-0000-0000-000000000001'
  AND pcc.category_id = 'f14e0f87-4774-445c-951d-58856c1410e7'
  AND pcc.is_active = true
  AND pcc.deleted_at IS NULL;
```

---

## Etapa 5 — Validação pós-execução

```sql
-- (a) categoria + subcategorias na destino
SELECT c.name AS categoria, COUNT(s.id) AS total_subcategorias
FROM ticket_categories c
LEFT JOIN ticket_subcategories s ON s.category_id = c.id AND s.deleted_at IS NULL
WHERE c.bu_id = '2eeeb494-178b-4a6d-96ee-d103fda448a0'
  AND c.name = 'Jurídico' AND c.deleted_at IS NULL
GROUP BY c.name;
-- esperado: 1 linha, total_subcategorias=21

-- (b) contatos vinculados
SELECT COUNT(*) AS contatos_vinculados
FROM partner_contact_bu_associations pcba
JOIN partner_contacts pc ON pc.id = pcba.partner_contact_id
WHERE pc.external_company_id = '92ba2f29-28b3-4c9e-a23a-d8daf926db5a'
  AND pcba.bu_id = '2eeeb494-178b-4a6d-96ee-d103fda448a0'
  AND pcba.deleted_at IS NULL;
-- esperado: 12

-- (c) capabilities replicadas
SELECT COUNT(*) AS capabilities_destino
FROM partner_contact_capabilities
WHERE bu_id = '2eeeb494-178b-4a6d-96ee-d103fda448a0'
  AND external_company_id = '92ba2f29-28b3-4c9e-a23a-d8daf926db5a'
  AND deleted_at IS NULL AND is_active = true;
-- esperado: 35
```

---

## Conformidade com TCR / Padrões Canônicos

- ✅ **BU Isolation**: cada `INSERT` carrega `bu_id` da BU destino explicitamente.
- ✅ **Soft delete**: todos os filtros usam `deleted_at IS NULL`.
- ✅ **Ferramenta correta**: operação puramente DML → `supabase--insert` (não migration).
- ✅ **Sem alteração de schema**: zero risco para o resto da plataforma.
- ✅ **Sem código**: não toca `src/`, não requer deploy.
- ✅ **Idempotência verificada**: pré-checagens confirmaram zero duplicatas.

## Resultado esperado

A BU Victorio Venturini passa a permitir abertura de tickets externos da categoria **Jurídico** com a Ferrigolo, com os mesmos 12 contatos e mesmas 35 capacidades de roteamento (categoria → subcategoria) que já existem na Jetimob.
