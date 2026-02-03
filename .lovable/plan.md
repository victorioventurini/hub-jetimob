
# Plano: Evolução do Módulo de Indicadores — Simplificação e Governança

## Resumo Executivo

Implementar as mudanças conceituais solicitadas para simplificar o modelo de indicadores, alinhar ao padrão OKR+KPI, garantir governança clara e reduzir campos redundantes.

---

## Pré-checklist Consultado ✅

| Documento | Status | Observações |
|-----------|--------|-------------|
| `TECHNICAL_CONTEXT_REGISTRY.md` | ✅ v2.81.0 | Enum `kpi_indicator_type` já tem apenas 'kpi', 'metric' |
| `PERMISSIONS_AND_RBAC_MODEL.md` | ✅ v1.2.0 | Templates `kpi_viewer`, `kpi_editor`, `kpi_admin` existentes |
| `IDENTITY_CONVENTION.md` | ✅ v2.1.1 | `owner_user_id` usa `profiles.id` |
| `RBAC_TEMPLATES_V3.md` | ✅ v3.0 | KPI permissions já segmentadas por scope |
| Banco de dados | ✅ Verificado | 0 KPIs cadastrados, estrutura pronta |

---

## Análise de Estado Atual vs Desejado

### 1) Tipos de Indicador ✅ JÁ IMPLEMENTADO
| Item | Estado Atual | Ação |
|------|--------------|------|
| Tipo "Indicador de Saúde" | ❌ Removido | Nenhuma — já feito na v2.81.0 |
| Enum `kpi_indicator_type` | `'kpi' | 'metric'` | Nenhuma |

### 2) Governança de Criação 🔧 PENDENTE
| Item | Estado Atual | Desejado |
|------|--------------|----------|
| Quem cria KPI | Qualquer pessoa com `kpis:manage` | Apenas líderes/admins |
| Quem cria Métrica | Qualquer pessoa com `kpis:manage` | Qualquer colaborador |
| Promover Métrica→KPI | Não controlado | Apenas líderes/admins |

### 3) Responsável (Accountability) ✅ PARCIALMENTE IMPLEMENTADO
| Item | Estado Atual | Desejado |
|------|--------------|----------|
| Obrigatório para ativos | ✅ Já validado no form | Manter |
| Mensagem clara | "Responsável é obrigatório" | Aprimorar texto |

### 4) Escopo do Indicador 🔧 NECESSITA AJUSTE UX
| Item | Estado Atual | Desejado |
|------|--------------|----------|
| Campos `scope`, `team_id`, `area_id` | ✅ Existem | Manter |
| Área inferida de Time | ❌ Não implementado | Implementar auto-inferência |
| Ocultar Área quando scope=team | ❌ Mostra campo | Ocultar e inferir |

### 5) Remoção do Campo Categoria 🔧 PENDENTE
| Item | Estado Atual | Desejado |
|------|--------------|----------|
| Campo `category` | ✅ Enum obrigatório | ❌ Remover |
| Duplicidade Área vs Categoria | Sim | Área como ownership único |

### 6) Relação Indicadores ↔ KRs ✅ JÁ IMPLEMENTADO
| Item | Estado Atual | Desejado |
|------|--------------|----------|
| Tabela `okr_kr_metrics` | ✅ Existe | Manter |
| Roles `primary`, `guardrail` | ✅ Enum existe | Manter |
| Limite 1 primary por KR | ✅ Index parcial | Manter |

### 7) Ciclo de Vida ✅ JÁ IMPLEMENTADO
| Item | Estado Atual | Desejado |
|------|--------------|----------|
| Enum `kpi_lifecycle_status` | ✅ `proposed`, `active`, `observing`, `deprecated` | Manter |
| Apenas ativos em rituais | ✅ Implementado | Manter |

### 8) UX do Formulário 🔧 PENDENTE
| Item | Estado Atual | Desejado |
|------|--------------|----------|
| Label "Nome do KPI" | Hardcoded | "Nome do Indicador" |
| Campos condicionais | Parcial | Aprimorar lógica |

---

## Decisões de Design

### Sobre Remoção do Campo Categoria

**Análise de Impacto:**
- Campo `category` é `NOT NULL` no banco
- Enum `kpi_category` tem 6 valores: `financeiro`, `growth`, `cs`, `produto`, `operacoes`, `pessoas`
- 0 registros existentes (sem migração de dados necessária)
- UI usa para agrupar KPIs no dashboard

**Opções:**
1. **Remover completamente** — Alinhado com pedido (evitar duplicidade com Área)
2. **Manter como opcional** — Permitir categorização adicional

**Recomendação:** Remover completamente conforme solicitado. A Área (estratégica) representa ownership organizacional, tornando a categoria funcional redundante.

### Sobre Governança de Criação

**Permissões Atuais no Catálogo:**
- `kpis.metric.create:bu` — Criar métricas
- `kpis.settings.manage:bu` — Gerenciar configurações

**Nova Lógica Proposta:**
- **Métrica:** Qualquer usuário com `kpis.metric.create:bu` pode criar
- **KPI:** Apenas usuários com `kpis.settings.manage:bu` OU líderes de time podem criar
- **Promoção Métrica→KPI:** Mesma regra de criação de KPI

### Sobre Auto-Inferência de Área

**Quando scope = team:**
1. Buscar `team.area_id` via relacionamento
2. Preencher automaticamente `area_id`
3. Ocultar campo de seleção de Área
4. Exibir badge read-only mostrando a Área inferida

---

## Etapas de Implementação

### FASE 1: Migração do Banco de Dados

#### 1.1 Tornar `category` opcional e depreciar
```sql
-- Tornar category nullable (soft deprecation)
ALTER TABLE kpi_metrics ALTER COLUMN category DROP NOT NULL;

-- Adicionar comentário de deprecação
COMMENT ON COLUMN kpi_metrics.category IS 'DEPRECATED v2.82.0 - Use area_id para ownership. Mantido para compatibilidade.';
```

**Justificativa:** Não remover a coluna imediatamente para permitir rollback e manter dados históricos futuros.

### FASE 2: Ajustes no Frontend

#### 2.1 Governança de Criação (`CreateKpiDialog.tsx`)

**Mudanças:**
1. Verificar permissão diferenciada por tipo de indicador
2. Se `indicator_type = 'kpi'` e usuário não tem `kpis.settings.manage:bu`:
   - Desabilitar opção "KPI" no select
   - Ou redirecionar para criar como "Métrica" (status proposto)

**Código:**
```typescript
// Verificar se pode criar KPI
const canCreateKpi = hasPermission("kpis.settings.manage:bu") || isTeamLeader;

// No select de tipo:
<SelectItem value="kpi" disabled={!canCreateKpi}>
  KPI {!canCreateKpi && "(requer permissão de líder)"}
</SelectItem>
```

#### 2.2 Auto-Inferência de Área

**Mudanças no `CreateKpiDialog.tsx` e `EditKpiDialog.tsx`:**

1. Quando `scope === 'team'` e `team_id` é selecionado:
   - Buscar área do time via query
   - Auto-preencher `area_id`
   - Exibir badge read-only com nome da área

2. Ocultar campo `area_id` quando `scope === 'team'` (já inferido)

3. Mostrar campo `area_id` apenas quando `scope === 'area'` ou `scope === 'org'`

**Novo hook necessário:**
```typescript
// useTeamArea.ts
export function useTeamArea(teamId: string | undefined) {
  // Buscar team com area_id e area.name
  // Retornar { areaId, areaName, isLoading }
}
```

#### 2.3 Remoção do Campo Categoria

**Mudanças:**
1. Remover FormField de `category` do `CreateKpiDialog.tsx`
2. Remover FormField de `category` do `EditKpiDialog.tsx`
3. Atualizar Zod schema (tornar optional ou remover)
4. Atualizar mutations para não enviar `category`

#### 2.4 Ajustes de UX

**Labels e Textos:**
| Atual | Novo |
|-------|------|
| "Nome do KPI" | "Nome do Indicador" |
| "Novo KPI" (DialogTitle) | "Novo Indicador" |
| "Criar KPI" (button) | "Criar Indicador" |

**Campos Condicionais:**
- Time: Visível apenas quando `scope === 'team'`
- Área: Visível quando `scope === 'area'` OU `scope === 'org'`
- Quando `scope === 'team'`: Exibir badge com área inferida

### FASE 3: Atualização de Tipos TypeScript

#### 3.1 `src/modules/kpis/types.ts`

**Mudanças:**
1. Marcar `KpiCategory` como deprecated
2. Tornar `category` opcional em `KpiMetric`
3. Atualizar `KpiWithValues`

```typescript
// DEPRECATED: Use area_id for ownership
/** @deprecated Use area_id for organizational ownership */
export type KpiCategory = 'financeiro' | 'growth' | 'cs' | 'produto' | 'operacoes' | 'pessoas';

export interface KpiMetric {
  // ...
  /** @deprecated Use area_id */
  category?: KpiCategory;
  // ...
}
```

### FASE 4: Ajustes no Dashboard

#### 4.1 `KpiDashboardPage.tsx`

**Mudanças:**
1. Remover agrupamento por categoria
2. Agrupar por área (usando `area_id`)
3. Manter filtros funcionais

### FASE 5: Documentação

#### 5.1 Atualizar TCR para v2.82.0

**Changelog:**
```markdown
### v2.82.0 — Evolução do Módulo de Indicadores
- **Campo `category` deprecado** — Usar `area_id` para ownership organizacional
- **Governança de criação** — KPIs requerem permissão de líder/admin
- **Auto-inferência de área** — Quando scope=team, área é inferida do time
- **UX simplificada** — Labels atualizados para "Indicador"
```

**Tabela de campos atualizada:**
```markdown
| **category** | enum | `financeiro`, ... — **DEPRECATED v2.82.0** |
```

---

## Arquivos Afetados

### Banco de Dados (1 migration)
| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/YYYYMMDD_*.sql` | ALTER category DROP NOT NULL |

### Frontend (6 arquivos)
| Arquivo | Mudança |
|---------|---------|
| `src/modules/kpis/types.ts` | Deprecar category, tornar opcional |
| `src/modules/kpis/components/CreateKpiDialog.tsx` | Remover category, governança, auto-área |
| `src/modules/kpis/components/EditKpiDialog.tsx` | Remover category, auto-área |
| `src/modules/kpis/hooks/useKpiData.ts` | Remover category das mutations |
| `src/modules/kpis/hooks/useKpiMutations.ts` | Remover category |
| `src/modules/kpis/pages/KpiDashboardPage.tsx` | Agrupar por área |

### Novo Hook (1 arquivo)
| Arquivo | Descrição |
|---------|-----------|
| `src/modules/kpis/hooks/useTeamArea.ts` | Buscar área de um time |

### Documentação (2 arquivos)
| Arquivo | Mudança |
|---------|---------|
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | v2.82.0 changelog |
| `.lovable/plan.md` | Atualizar status |

---

## Ordem de Execução

1. **Migration DB** — Tornar category nullable
2. **Types** — Atualizar tipos (deprecar category)
3. **Hook useTeamArea** — Criar hook de inferência
4. **CreateKpiDialog** — Aplicar todas as mudanças UX
5. **EditKpiDialog** — Espelhar mudanças
6. **useKpiData/useKpiMutations** — Ajustar mutations
7. **KpiDashboardPage** — Agrupar por área
8. **Documentação** — TCR v2.82.0

---

## Validação Final (Checklist)

- [ ] Campo `category` é nullable no banco
- [ ] UI não exibe campo Categoria
- [ ] KPIs só podem ser criados por líderes/admins
- [ ] Métricas podem ser criadas por qualquer colaborador
- [ ] Quando scope=team, área é inferida automaticamente
- [ ] Campo Área oculto quando scope=team
- [ ] Labels atualizados para "Indicador"
- [ ] Dashboard agrupa por Área
- [ ] TCR atualizado para v2.82.0
- [ ] Enum `kpi_category` mantido para rollback (deprecated)

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Quebra de agrupamento no dashboard | Manter fallback "Sem Área" |
| Rollback necessário | Category apenas nullable, não removida |
| Permissões incorretas | Verificar templates `kpi_editor` vs `kpi_admin` |

---

## Resumo das Mudanças por Requisito

| # | Requisito | Status | Ação |
|---|-----------|--------|------|
| 1 | Remover "Indicador de Saúde" | ✅ Já feito | Nenhuma |
| 2 | Governança de criação | 🔧 Pendente | Implementar |
| 3 | Responsável obrigatório | ✅ Parcial | Aprimorar texto |
| 4 | Escopo com auto-área | 🔧 Pendente | Implementar |
| 5 | Remover Categoria | 🔧 Pendente | Deprecar e ocultar |
| 6 | Relação KPI↔KR | ✅ Já existe | Nenhuma |
| 7 | Ciclo de vida | ✅ Já existe | Nenhuma |
| 8 | UX simplificada | 🔧 Pendente | Labels e condicionais |
