
# Plano: Correção do Hook useKpiLinkedKrs

## Contexto do Problema

O modal de visualização de KPIs/Métricas não exibe as KRs vinculadas (ex: "Orçamento de marketing e vendas" vinculada à KR "🚀 Captar 1.457 leads...").

### Causa Raiz (Confirmada via Análise)

| Evidência | Conclusão |
|-----------|-----------|
| Query de FKs em `okr_kr_metrics` retornou vazio | Tabela não possui foreign key para `okr_team_key_results` |
| Registro existe no banco (`kr_id=8685...`, `role=guardrail`) | Vínculo está correto no banco |
| Hook usa nested join `team_kr:okr_team_key_results!kr_id(...)` | PostgREST não resolve join sem FK |
| Hook filtra `.filter(link => link.team_kr)` | Links com `team_kr: null` são descartados |

## Documentação Consultada (Pré-checklist)

- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` v2.83.0 — Arquitetura de clientes, hooks canônicos
- `docs/canonical/DATA_MODEL_REGISTRY.md` — Confirmação do schema de `okr_kr_metrics` (sem FKs para KRs)
- `docs/canonical/DEVELOPMENT_STANDARDS.md` v1.17.0 — Campos explícitos, BU-scoped client
- `docs/canonical/UI_COMPONENTS_REGISTRY.md` — Componentes de status/badges

## Estratégia de Correção

Reescrever o hook `useKpiLinkedKrs` para buscar dados em **etapas separadas** (sem depender de FK):

```text
┌─────────────────────────┐
│  1. Buscar links        │  okr_kr_metrics (kpi_id, kr_type, role)
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│  2. Agrupar IDs por tipo│  teamKrIds[], orgKrIds[]
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐     ┌──────────────────────────┐
│  3. Buscar Team KRs     │     │  4. Buscar Org KRs       │
│  okr_team_key_results   │     │  okr_org_key_results +   │
│  .in('id', teamKrIds)   │     │  okr_org_objectives      │
└───────────┬─────────────┘     └───────────┬──────────────┘
            │                               │
            └───────────────┬───────────────┘
                            │
┌───────────────────────────▼───────────────────────────┐
│  5. Montar LinkedKrData[]                             │
│  - Calcular progress via calculateProgress()         │
│  - Mapear RAG status via mapRagToCalculated()        │
│  - Ordenar por role e status de risco                │
└───────────────────────────────────────────────────────┘
```

## Alterações Técnicas

### Arquivo: `src/modules/kpis/hooks/useKpiLinkedKrs.ts`

**Mudanças:**

1. **Remover** as constantes `KR_LINK_FIELDS_TEAM` e `KR_LINK_FIELDS_ORG` com nested joins quebrados

2. **Definir campos explícitos** para busca separada:
   ```typescript
   const LINK_FIELDS = 'id, kr_id, kr_type, kpi_id, role, created_at';
   
   const TEAM_KR_FIELDS = `
     id, title, baseline, current_value, target, direction, status,
     team_objective_id,
     objective:okr_team_objectives!team_objective_id(
       id, title, status,
       team:teams!team_id(id, name, color)
     )
   `;
   
   const ORG_KR_FIELDS = 'id, title, baseline, current_value, target, direction, status, org_objective_id';
   const ORG_OBJECTIVE_FIELDS = 'id, title, status';
   ```

3. **Reescrever `queryFn`** com busca em etapas:
   - Buscar links de `okr_kr_metrics` com campos simples
   - Separar IDs por `kr_type`
   - Buscar Team KRs via `.in('id', teamKrIds)` 
   - Buscar Org KRs via `.in('id', orgKrIds)` + objectives separados
   - Filtrar KRs deletadas/canceladas

4. **Calcular progresso** usando função canônica:
   ```typescript
   import { calculateProgress } from '@/modules/okrs/utils/progressCalculation';
   import { mapRagToCalculated } from '@/modules/okrs/hooks/useOkrStatus';
   
   const progress = calculateProgress(
     Number(kr.baseline) || 0,
     Number(kr.current_value) || 0,
     Number(kr.target) || 0,
     kr.direction || 'up'
   );
   
   // Mapear RAG para status da UI (on_track, at_risk, off_track, etc.)
   const calculatedStatus = progress >= 100 ? 'completed' : mapRagToCalculated(kr.status);
   ```

5. **Montar `LinkedKrData[]`** com estrutura esperada pelo `LinkedKrsSection`:
   - `kr.progress` calculado (não é coluna do banco)
   - `kr.status` convertido para formato da UI

## Compatibilidade

| Componente | Impacto | Ação Necessária |
|------------|---------|-----------------|
| `LinkedKrsSection` | Nenhum | Já consome `LinkedKrData` corretamente |
| `KpiDetailDialog` | Nenhum | Usa `useKpiLinkedKrs` sem mudança de interface |
| `KpiHistoryDialog` | Nenhum | Usa `useKpiLinkedKrs` sem mudança de interface |

## Casos de Teste

| Cenário | Resultado Esperado |
|---------|-------------------|
| Métrica com 1 Guardrail (caso reportado) | Exibe KR na seção "Guardrails" |
| KPI com Primary + múltiplos Guardrails | Primary primeiro, depois Guardrails ordenados por risco |
| KR cancelada/deletada | Não exibir na lista |
| KR Org vinculada | Exibir com badge "Organizacional" |
| Nenhum vínculo | Exibir "Nenhuma KR vinculada a este indicador." |

## Riscos Mitigados

- **Performance:** 2-4 queries paralelas (links + teamKRs + orgKRs + orgObjectives) — volume baixo por KPI
- **RLS:** Se usuário não tem permissão para ver KR, ela não será retornada (comportamento correto)
- **Progresso:** Calculado client-side com função canônica (mesma lógica de todo o sistema)

## Arquivos Modificados

1. `src/modules/kpis/hooks/useKpiLinkedKrs.ts` — Reescrita completa da queryFn
