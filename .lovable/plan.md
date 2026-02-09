
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

---

## ✅ IMPLEMENTADO (v2.91.0) — Alteração Hierárquica de Escopo

### Alterações Realizadas

| Alteração | Status |
|-----------|--------|
| Hook `useCanChangeKpiScope` criado | ✅ |
| Exportado no barrel `hooks/index.ts` | ✅ |
| Escopo dinâmico no EditKpiDialog | ✅ |
| Admin/Super Admin: todas as opções | ✅ |
| Líder: apenas `team`, times gerenciáveis | ✅ |
| Colaborador: campo bloqueado (Lock) | ✅ |
| Tooltips contextuais por papel | ✅ |
| TeamSelect com `filterTeamIds` | ✅ |

### Resultado

- ✅ Admin pode alterar escopo livremente (org ↔ area ↔ team)
- ✅ Líder pode mover KPI de time para outro time que lidera
- ✅ Líder NÃO pode alterar escopo para org/area
- ✅ Colaborador não pode alterar escopo
- ✅ TeamSelect filtra apenas times gerenciáveis para líderes
