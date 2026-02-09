
# Plano: Completar Governança no EditKpiDialog

## ✅ IMPLEMENTADO (v2.90.0)

### Alterações Realizadas

| Alteração | Status |
|-----------|--------|
| Schema Zod com `responsible_area_id` e `responsible_team_id` | ✅ |
| Validação `superRefine` para scope=org ativo | ✅ |
| DefaultValues atualizados | ✅ |
| Reset do form com campos de responsabilidade | ✅ |
| Seção UI "Responsabilidade Operacional" para scope=org | ✅ |
| Campo Time Responsável opcional para scope=area | ✅ |
| Escopo readonly com tooltip (Lock icon) | ✅ |
| Submit com campos de responsabilidade | ✅ |
| Import do InfoNotice | ✅ |

### Resultado

- ✅ Ao editar um KPI Global (`scope=org`), aparece a seção "Responsabilidade Operacional"
- ✅ Campo "Área Responsável" é obrigatório para KPIs Globais ativos
- ✅ Campo "Time Responsável" é opcional
- ✅ Para KPIs de Área (`scope=area`), aparece campo opcional de "Time Responsável"
- ✅ Escopo é readonly com ícone de cadeado e tooltip explicativo
- ✅ Valores existentes de `responsible_area_id` e `responsible_team_id` são carregados corretamente
