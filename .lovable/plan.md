# Habilitação de Partner: Ferrigolo Advogados Associados → BU Victorio Venturini

## Auditoria Realizada (TCR + DB)

| Verificação | Resultado |
|---|---|
| Partner `92ba2f29-28b3-4c9e-a23a-d8daf926db5a` (Ferrigolo Advogados, CNPJ 28.715.249/0001-00) | ✅ Existe em `external_companies`, status `active`, `deleted_at IS NULL` |
| BU `2eeeb494-178b-4a6d-96ee-d103fda448a0` (Victorio Venturini) | ✅ Existe em `bu_units` (tabela canônica de BUs) |
| Associação atual em `external_company_bu_associations` | Apenas Jetimob (`a0000000…`) e Jet Experience (`f3d2d8a5…`); **nenhuma com Victorio Venturini** |
| Conflito UNIQUE(external_company_id, bu_id) | ✅ Sem conflito |
| Schema da tabela | Coluna `role` NOT NULL com default `'partner'`; demais campos opcionais cobertos |

## Conformidade com Padrões

- **Soft-delete policy**: registro novo, `deleted_at IS NULL` (default). ✅
- **BU-scoped data**: `bu_id` preenchido explicitamente. ✅
- **Tipo de operação**: DML (INSERT de dados) → usar **insert tool**, não migration (conforme `<updating-tables>`). ✅
- **Sem alteração de schema, RLS, código ou tipos gerados**.

## Execução (única ação)

```sql
INSERT INTO public.external_company_bu_associations
  (external_company_id, bu_id, is_active, role, notes)
VALUES
  ('92ba2f29-28b3-4c9e-a23a-d8daf926db5a',
   '2eeeb494-178b-4a6d-96ee-d103fda448a0',
   true,
   'partner',
   'Habilitação manual solicitada pelo admin — Ferrigolo Advogados Associados na BU Victorio Venturini');
```

## Validação Pós-Execução

```sql
SELECT a.id, a.bu_id, b.name AS bu_name, a.is_active, a.role, a.created_at
FROM external_company_bu_associations a
JOIN bu_units b ON b.id = a.bu_id
WHERE a.external_company_id = '92ba2f29-28b3-4c9e-a23a-d8daf926db5a'
  AND a.deleted_at IS NULL
ORDER BY a.created_at;
```

Esperado: 3 linhas (Jetimob, Jet Experience, **Victorio Venturini**).

## Riscos

Nenhum. Operação aditiva, idempotente em relação ao estado atual (a UNIQUE protege contra re-execução acidental), reversível via `UPDATE … SET deleted_at = now()` se necessário.
