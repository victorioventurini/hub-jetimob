
# Plano: Atualização de Escopo das KPIs

## Objetivo
Atualizar os registros de KPIs no banco de dados para refletir corretamente seus escopos (Global vs Área) e vincular às áreas e times responsáveis.

---

## Mapeamento Identificado

### IDs das Áreas
| Área | ID |
|------|-----|
| Operações | `29241e61-3638-4f05-b3bf-3392ac86a35a` |
| Produto e Tecnologia | `f3ff0626-4edf-468f-b4b1-ee4315286d88` |

### IDs dos Times
| Time | ID |
|------|-----|
| Customer Success | `b5f9336b-dbda-47c5-b033-2500f4661a71` |
| Gente & Cultura | `d69c7489-c499-469c-b7c3-baf6d737fc06` |
| Produto | `1fa654dd-c0bb-468c-aaf4-955eda4a1f1f` |

---

## KPIs que Já Estão Corretas (Globais)
Estas não precisam de alteração:
- ✅ MRR Total
- ✅ Crescimento de MRR (%)
- ✅ Incremento Acumulado MRR
- ✅ EBITDA (%)
- ✅ LTV/CAC
- ✅ IMPC - Índice de Maturidade de Processos Críticos

---

## KPIs que Precisam de Atualização

| KPI | Novo Escopo | Área Responsável | Time Dono |
|-----|-------------|------------------|-----------|
| Gross Revenue Churn | `area` | Operações | Customer Success |
| NRR (Net Revenue Retention) | `area` | Operações | Customer Success |
| NPS | `area` | Operações | Customer Success |
| eNPS | `area` | Operações | Gente & Cultura |
| MRR de Novas Funcionalidades | `area` | Produto e Tecnologia | Produto |

---

## Comandos SQL a Executar

Utilizarei a ferramenta de inserção/atualização para aplicar as mudanças:

```sql
-- 1. Gross Revenue Churn → Área: Operações, Time: Customer Success
UPDATE kpi_metrics SET 
  scope = 'area',
  area_id = '29241e61-3638-4f05-b3bf-3392ac86a35a',
  team_id = 'b5f9336b-dbda-47c5-b033-2500f4661a71',
  updated_at = NOW()
WHERE id = '607726c4-4023-4463-b555-7d29c30a3bfd';

-- 2. NRR (Net Revenue Retention) → Área: Operações, Time: Customer Success
UPDATE kpi_metrics SET 
  scope = 'area',
  area_id = '29241e61-3638-4f05-b3bf-3392ac86a35a',
  team_id = 'b5f9336b-dbda-47c5-b033-2500f4661a71',
  updated_at = NOW()
WHERE id = '9ee372fd-7994-41cd-9fb5-bcf0028d3fcd';

-- 3. NPS → Área: Operações, Time: Customer Success (já tem area_id, falta team)
UPDATE kpi_metrics SET 
  scope = 'area',
  team_id = 'b5f9336b-dbda-47c5-b033-2500f4661a71',
  updated_at = NOW()
WHERE id = '27e5f5bc-5e54-467e-b51a-53a7ffac9bdd';

-- 4. eNPS → Área: Operações, Time: Gente & Cultura
UPDATE kpi_metrics SET 
  scope = 'area',
  area_id = '29241e61-3638-4f05-b3bf-3392ac86a35a',
  team_id = 'd69c7489-c499-469c-b7c3-baf6d737fc06',
  updated_at = NOW()
WHERE id = '862624ae-9118-4459-94b3-c10dbc686e82';

-- 5. MRR de Novas Funcionalidades → Área: Produto e Tecnologia, Time: Produto
UPDATE kpi_metrics SET 
  scope = 'area',
  area_id = 'f3ff0626-4edf-468f-b4b1-ee4315286d88',
  team_id = '1fa654dd-c0bb-468c-aaf4-955eda4a1f1f',
  updated_at = NOW()
WHERE id = 'dfbbaae0-7afa-4609-8e5f-3795288c1281';
```

---

## Resumo da Execução

| # | Ação |
|---|------|
| 1 | Executar 5 comandos UPDATE via ferramenta de inserção |
| 2 | Verificar resultado final com SELECT |
| 3 | Confirmar que os selects de escopo no UI funcionam corretamente |

---

## Seção Técnica

### Tabela Afetada
- `kpi_metrics` (tabela operacional com RLS)

### Colunas Atualizadas
- `scope`: tipo `KpiScope` ('org' | 'area' | 'team')
- `area_id`: UUID referenciando `areas.id`
- `team_id`: UUID referenciando `teams.id`
- `updated_at`: timestamp de auditoria

### Validação Pós-Execução
```sql
SELECT name, scope, area_id, team_id 
FROM kpi_metrics 
WHERE deleted_at IS NULL 
ORDER BY scope, name;
```
