
# Plano: Integração Aprimorada OKRs, KPIs e Wizards

## Resumo Executivo

Aprimorar a integração entre os módulos de OKRs, KPIs e Wizards do Hub, garantindo:
- Clareza de papéis (responsável vs contribuidor de dados)
- Foco em decisão (KPIs só aparecem quando relevantes)
- Governança adequada (accountability clara)
- Experiência otimizada por persona (cada wizard mostra apenas o necessário)

---

## Pré-checklist Consultado

| Documento | Status | Observações |
|-----------|--------|-------------|
| `TECHNICAL_CONTEXT_REGISTRY.md` | v2.80.0 | `useKpisForWizard` documentado como hook canônico |
| `PERMISSIONS_AND_RBAC_MODEL.md` | v1.2.0 | Templates `kpi_viewer`, `kpi_editor`, `kpi_admin` |
| `DATA_MODEL_REGISTRY.md` | Verificado | `okr_kr_metrics` com roles `primary`, `guardrail` |

---

## Arquitetura Atual (Análise)

### Modelo de Dados Existente

```text
kpi_metrics
├── owner_user_id → Responsável final (accountability)
├── team_id → Time ao qual pertence
├── area_id → Área estratégica
└── scope → 'team' | 'area' | 'org'

okr_kr_metrics (vínculo KPI ↔ KR)
├── kr_id → ID do Key Result
├── kpi_id → ID do indicador
└── role → 'primary' | 'guardrail'
```

### Lacunas Identificadas

| Gap | Estado Atual | Desejado |
|-----|--------------|----------|
| Contribuidor de dados | Não existe | Nova tabela ou campo |
| Separação owner vs updater | Ambíguo | Clareza explícita |
| KPIs por papel no wizard | Todos aparecem | Filtrar por relevância |
| Guardrails violados | Não destacados | Alertas específicos |
| Indicadores sistêmicos | Não categorizados | Visão cross-team |

---

## Decisões de Design

### 1. Modelo de Contribuidores de KPI

**Opção A:** Nova tabela `kpi_data_contributors`
```sql
CREATE TABLE kpi_data_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid REFERENCES kpi_metrics(id),
  contributor_user_id uuid REFERENCES profiles(id),
  role text DEFAULT 'data_entry', -- 'data_entry', 'reviewer'
  created_at timestamptz DEFAULT now()
);
```

**Opção B:** Usar `team_id` + membros do time como contribuidores implícitos

**Recomendação:** **Opção A** — Modelo explícito permite atribuição granular e mensagens claras no wizard.

### 2. Classificação de KPIs no Contexto

| Classificação | Critério | Exibição |
|---------------|----------|----------|
| **Para atualizar** | `contributor = user` + `needs_update = true` | Editável |
| **Relevante (time)** | `team_id = user.team` | Somente leitura |
| **Estratégico** | `scope = 'org'` ou vinculado a OKR org | Badge "Estratégico", read-only |

### 3. Gate de Exibição de KPIs

KPIs só aparecem nos wizards quando atendem a critérios específicos:

| Wizard | Critério de Exibição |
|--------|---------------------|
| Collaborator | `contributor = user` OU `needs_update + team_id match` |
| Leader Prep | `team_id match` + (`rag != on_track` OU `needs_update` OU `is_guardrail_at_risk`) |
| Team Check-in | Vinculados a KRs em risco OU guardrails violados |
| Managers | `scope = 'area'` ou `scope = 'org'` + cross-team patterns |
| C-Level | `scope = 'org'` + tendências estratégicas |

---

## Etapas de Implementação

### FASE 1: Modelo de Dados (Contribuidores)

#### 1.1 Nova tabela `kpi_data_contributors`

```sql
-- Tabela de contribuidores de dados de KPI
CREATE TABLE public.kpi_data_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.kpi_metrics(id) ON DELETE CASCADE,
  contributor_user_id uuid NOT NULL REFERENCES public.profiles(id),
  role text NOT NULL DEFAULT 'data_entry' CHECK (role IN ('data_entry', 'reviewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id),
  deleted_at timestamptz,
  UNIQUE (kpi_id, contributor_user_id)
);

-- RLS
ALTER TABLE public.kpi_data_contributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contributors"
  ON public.kpi_data_contributors FOR SELECT
  USING (is_profile_bu_member(my_profile_id(), bu_id));

CREATE POLICY "KPI editors can manage contributors"
  ON public.kpi_data_contributors FOR ALL
  USING (has_permission(my_profile_id(), bu_id, 'kpis.metric.update:bu'));

-- Index
CREATE INDEX idx_kpi_contributors_user ON public.kpi_data_contributors(contributor_user_id) 
  WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_contributors_kpi ON public.kpi_data_contributors(kpi_id) 
  WHERE deleted_at IS NULL;
```

---

### FASE 2: Hook `useKpisForWizard` Evoluído

#### 2.1 Novo arquivo: `src/modules/kpis/hooks/useKpisForWizardV2.ts`

Evolui o hook existente para suportar classificação por papel:

```typescript
interface UseKpisForWizardV2Options {
  userId: string;
  teamId?: string;
  areaId?: string;
  scope?: 'collaborator' | 'leader' | 'manager' | 'clevel';
  includeGuardrailsAtRisk?: boolean;
}

interface KpiForWizardV2 extends KpiForWizard {
  userRole: 'owner' | 'contributor' | 'viewer';
  isStrategic: boolean;
  isGuardrailAtRisk: boolean;
  linkedKrIds: string[];
  displayMode: 'editable' | 'readonly' | 'alert';
}

interface UseKpisForWizardV2Result {
  // Separados por papel
  kpisToUpdate: KpiForWizardV2[];      // Contribuidor precisa atualizar
  kpisTeamContext: KpiForWizardV2[];   // Contexto do time (read-only)
  kpisStrategic: KpiForWizardV2[];     // Estratégicos globais (read-only)
  kpisInAlert: KpiForWizardV2[];       // Em alerta (amarelo/vermelho)
  guardrailsViolated: KpiForWizardV2[]; // Guardrails vinculados a KRs
  
  // Flags de resumo
  hasUpdatesNeeded: boolean;
  hasAlertsToShow: boolean;
  hasGuardrailsViolated: boolean;
  isLoading: boolean;
}
```

**Query evolui para buscar:**
1. KPIs onde usuário é `owner_user_id`
2. KPIs onde usuário é `contributor` (nova tabela)
3. KPIs do time (para contexto)
4. KPIs vinculados a KRs via `okr_kr_metrics` (para guardrails)

---

### FASE 3: Collaborator Check-in

#### 3.1 `CollaboratorContextStep.tsx` — Separação Visual

**Mudanças:**
- Criar 3 seções distintas:
  1. **"KPIs para atualizar"** — Onde `userRole = 'contributor'` + `needs_update`
  2. **"Indicadores do Time"** — Onde `team_id` match, exibidos read-only
  3. **"Indicadores Estratégicos"** — Onde `scope = 'org'`, com badge especial

**Componente novo:** `KpiContextSection`
```typescript
interface KpiContextSectionProps {
  title: string;
  subtitle?: string;
  kpis: KpiForWizardV2[];
  variant: 'update' | 'context' | 'strategic';
  showUpdateBadge?: boolean;
}
```

#### 3.2 `CollaboratorKpiStep.tsx` — Mensagem de Clareza

Adicionar mensagem explicativa no header:
```text
"Você está atualizando este indicador porque contribui com os dados operacionais.
O responsável final por este KPI é [Nome do Owner]."
```

---

### FASE 4: Leader Prep

#### 4.1 Nova seção: `LeaderKpiAlertStep.tsx`

**Objetivo:** Seção "Indicadores em Atenção" entre Overview e Highlights

**Conteúdo:**
- KPIs do time/área em alerta (amarelo/vermelho)
- KPIs desatualizados além do período esperado
- Guardrails violados vinculados a KRs em risco

**Ações disponíveis:**
- "Marcar para discussão em grupo"
- "Agendar follow-up com responsável"

```typescript
interface KpiAlertItem {
  kpi: KpiForWizardV2;
  alertReason: 'off_track' | 'at_risk' | 'outdated' | 'guardrail_violated';
  linkedKr?: { id: string; title: string; status: string };
  suggestedAction: 'discuss' | 'followup' | 'monitor';
}
```

#### 4.2 Integrar no wizard

Adicionar novo step ao `WIZARD_STEPS` em `LeaderPrepPage.tsx`:
```typescript
{ id: 'kpi-alerts', label: 'Indicadores', description: 'KPIs em atenção' }
```

---

### FASE 5: Team Check-in

#### 5.1 `TeamKrReviewStep.tsx` — KPI Gate

**Lógica:** KPIs NÃO aparecem por padrão. Só aparecem quando:
1. São `primary` de uma KR em risco (amarelo/vermelho)
2. São `guardrail` e estão violados
3. Foram marcados pelo líder na Leader Prep

**Componente novo:** `KrLinkedKpiCard`
```typescript
interface KrLinkedKpiCardProps {
  kr: WizardKr;
  linkedKpis: KpiForWizardV2[];
  showReason: 'primary_at_risk' | 'guardrail_violated' | 'leader_marked';
}
```

**Exibição condicional:**
```typescript
// Só exibir se houver KPIs relevantes
{linkedKpis.length > 0 && (
  <KrLinkedKpiCard 
    kr={currentKr}
    linkedKpis={linkedKpis}
    showReason={determineReason(kr, linkedKpis)}
  />
)}
```

---

### FASE 6: Managers Check-in

#### 6.1 Nova seção: `ManagersSystemicKpisStep.tsx`

**Objetivo:** Visão de "Indicadores Sistêmicos" que atravessam times/áreas

**Critérios de exibição:**
- `scope = 'area'` ou `scope = 'org'`
- Padrões cross-team (mesmo indicador em múltiplos times)
- Indicadores de eficiência operacional

**Layout:**
```text
┌────────────────────────────────────────────────────┐
│ Indicadores Sistêmicos                              │
├────────────────────────────────────────────────────┤
│                                                      │
│  📊 Eficiência Operacional                          │
│  ├─ NPS Geral: 72 → Meta: 80 (⚠️ -10%)             │
│  ├─ Lead Time Médio: 5.2d → Meta: 4d               │
│  └─ Taxa de Churn: 2.1% → Meta: 2%                 │
│                                                      │
│  🔄 Cross-Team Dependencies                         │
│  ├─ Revenue + CS: Customer Health Score            │
│  └─ Produto + Growth: Activation Rate              │
│                                                      │
└────────────────────────────────────────────────────┘
```

#### 6.2 Integrar no wizard

Adicionar step após `panorama`:
```typescript
{ id: 'systemic-kpis', label: 'Indicadores', description: 'Visão sistêmica' }
```

---

### FASE 7: C-Level Check-in

#### 7.1 `CLevelInsightsStep.tsx` — KPIs como Sinais

**Mudanças:**
- Remover cards hardcoded de exemplo
- Integrar com dados reais de KPIs organizacionais
- Exibir KPIs como **sinais de contexto**, não itens operacionais

**Layout atualizado:**
```text
┌────────────────────────────────────────────────────┐
│ Sinais Estratégicos                                 │
├────────────────────────────────────────────────────┤
│                                                      │
│  📈 Tendências Positivas                            │
│  └─ Receita Recorrente: ↑12% vs trimestre anterior │
│                                                      │
│  ⚠️ Pontos de Atenção                               │
│  ├─ NPS: tendência estável (esperado: melhoria)    │
│  └─ CAC/LTV: deteriorando 5% no mês                │
│                                                      │
│  🎯 Validação de Direção                            │
│  └─ 3 de 4 OKRs organizacionais no caminho         │
│                                                      │
└────────────────────────────────────────────────────┘
```

---

### FASE 8: UI de Gerenciamento de Contribuidores

#### 8.1 `KpiContributorsManager.tsx`

Componente para gerenciar contribuidores de um KPI:

```typescript
interface KpiContributorsManagerProps {
  kpiId: string;
  ownerId: string;
  onContributorAdd: (userId: string) => void;
  onContributorRemove: (userId: string) => void;
}
```

**Localização:** Dentro do `KpiSidePanel` e `EditKpiDialog`

#### 8.2 Mensagem explicativa

```text
"O responsável é accountable pelo indicador.
Contribuidores são pessoas que inserem dados operacionais."
```

---

## Arquivos Afetados

### Banco de Dados (1 migration)
| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/YYYYMMDD_*.sql` | Criar tabela `kpi_data_contributors` |

### Novos Hooks (2 arquivos)
| Arquivo | Descrição |
|---------|-----------|
| `src/modules/kpis/hooks/useKpisForWizardV2.ts` | Hook evoluído com classificação |
| `src/modules/kpis/hooks/useKpiContributors.ts` | CRUD de contribuidores |

### Steps Novos (3 componentes)
| Arquivo | Wizard | Descrição |
|---------|--------|-----------|
| `LeaderKpiAlertStep.tsx` | Leader Prep | Indicadores em atenção |
| `ManagersSystemicKpisStep.tsx` | Managers | Indicadores sistêmicos |
| `KrLinkedKpiCard.tsx` | Team Check-in | KPIs vinculados a KRs |

### Componentes Atualizados (6 arquivos)
| Arquivo | Mudança |
|---------|---------|
| `CollaboratorContextStep.tsx` | 3 seções separadas de KPIs |
| `CollaboratorKpiStep.tsx` | Mensagem de clareza de papel |
| `TeamKrReviewStep.tsx` | KPI Gate condicional |
| `CLevelInsightsStep.tsx` | Dados reais + layout de sinais |
| `LeaderPrepPage.tsx` | Novo step de KPI alerts |
| `ManagersCheckinPage.tsx` | Novo step de indicadores sistêmicos |

### UI de Gestão (2 componentes)
| Arquivo | Descrição |
|---------|-----------|
| `KpiContributorsManager.tsx` | Gerenciar contribuidores |
| `KpiSidePanel.tsx` | Integrar seção de contribuidores |

### Types (1 arquivo)
| Arquivo | Mudança |
|---------|---------|
| `src/modules/kpis/types.ts` | Adicionar `KpiContributor`, `KpiForWizardV2` |

### Documentação (1 arquivo)
| Arquivo | Mudança |
|---------|---------|
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | v2.83.0 changelog |

---

## Fluxo de Dados por Wizard

### Collaborator Check-in
```text
useKpisForWizardV2({ userId, scope: 'collaborator' })
    │
    ├── kpisToUpdate[] ──────► CollaboratorKpiStep (editável)
    ├── kpisTeamContext[] ───► CollaboratorContextStep (readonly)
    └── kpisStrategic[] ─────► CollaboratorContextStep (badge "Estratégico")
```

### Leader Prep
```text
useKpisForWizardV2({ teamId, scope: 'leader' })
    │
    ├── kpisInAlert[] ────────► LeaderKpiAlertStep (marcar para discussão)
    ├── guardrailsViolated[] ─► LeaderHighlightsStep (integrar)
    └── flags ────────────────► Badge de contagem no step
```

### Team Check-in
```text
useKpisForWizardV2({ teamId, scope: 'team', includeGuardrailsAtRisk: true })
    │
    └── guardrailsViolated[] ─► TeamKrReviewStep (KrLinkedKpiCard)
        │
        └── Exibir APENAS quando:
            - KR em risco tem KPI primary
            - Guardrail está violado
            - Líder marcou na prep
```

### Managers Check-in
```text
useKpisForWizardV2({ areaId, scope: 'manager' })
    │
    ├── kpisStrategic[] ───► ManagersSystemicKpisStep
    └── crossTeamPatterns ─► Agrupamento por área
```

### C-Level Check-in
```text
useKpisForWizardV2({ scope: 'clevel' })
    │
    └── kpisStrategic[] ───► CLevelInsightsStep (sinais + tendências)
```

---

## Ordem de Execução

1. **Migration DB** — Criar tabela `kpi_data_contributors`
2. **Types** — Adicionar novos tipos
3. **Hook useKpiContributors** — CRUD de contribuidores
4. **Hook useKpisForWizardV2** — Classificação por papel
5. **CollaboratorContextStep** — 3 seções de KPIs
6. **CollaboratorKpiStep** — Mensagem de clareza
7. **LeaderKpiAlertStep** — Nova seção de alertas
8. **LeaderPrepPage** — Integrar novo step
9. **KrLinkedKpiCard** — Componente de vínculo
10. **TeamKrReviewStep** — KPI Gate
11. **ManagersSystemicKpisStep** — Nova seção sistêmica
12. **ManagersCheckinPage** — Integrar novo step
13. **CLevelInsightsStep** — Dados reais
14. **KpiContributorsManager** — UI de gestão
15. **Documentação** — TCR v2.83.0

---

## Validação Final (Checklist)

- [ ] Tabela `kpi_data_contributors` criada com RLS
- [ ] Colaboradores veem apenas KPIs que precisam atualizar
- [ ] Mensagem clara sobre papel (contribuidor vs responsável)
- [ ] KPIs do time aparecem em modo leitura no contexto
- [ ] Leader Prep tem seção "Indicadores em Atenção"
- [ ] Líder pode marcar KPIs para discussão/follow-up
- [ ] Team Check-in mostra KPIs apenas quando relevantes
- [ ] Managers veem indicadores sistêmicos cross-team
- [ ] C-Level vê KPIs como sinais estratégicos
- [ ] UI permite gerenciar contribuidores de KPI
- [ ] TCR atualizado para v2.83.0

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Performance com nova tabela | Baixa | Médio | Indexes otimizados + cache |
| Confusão owner vs contributor | Média | Alto | Mensagens claras em toda UI |
| Wizards sem KPIs (vazio) | Média | Baixo | Empty states adequados |
| Guardrails não vinculados | Baixa | Médio | Validação na criação de KR |

---

## Resumo das Melhorias por Wizard

| Wizard | Antes | Depois |
|--------|-------|--------|
| **Collaborator** | Todos os KPIs do owner | Separação: atualizar / contexto / estratégico |
| **Leader Prep** | Sem seção de KPIs | Nova seção "Indicadores em Atenção" |
| **Team Check-in** | Sem KPIs | KPIs condicionais (apenas quando relevantes) |
| **Managers** | Sem KPIs | Nova seção "Indicadores Sistêmicos" |
| **C-Level** | Cards mockados | KPIs reais como sinais estratégicos |
