
# Plano: Governança de KPIs — Escopo vs Responsabilidade Operacional

## 1. Diagnóstico Completo

### 1.1 Estrutura Atual

**Schema `kpi_metrics` (colunas relevantes):**
| Coluna | Tipo | Propósito Atual |
|--------|------|-----------------|
| `scope` | `kpi_scope` (enum) | Define impacto: `team`, `area`, `org` |
| `area_id` | `uuid` | Área "dona" (apenas quando `scope=area`) |
| `team_id` | `uuid` | Time "dono" (apenas quando `scope=team`) |
| `owner_user_id` | `uuid` | Pessoa accountable |

**Trigger `kpi_metrics_governance_validate()` atual:**
```sql
-- Regra 1: scope=team → team_id obrigatório
-- Regra 2: scope=org/area → team_id PROIBIDO ❌ (problema!)
-- Regra 3: KPI ativo → owner_user_id obrigatório
-- Regra 4: scope=area ativo → area_id obrigatório
```

**Problema identificado:** A regra 2 impede que KPIs Globais (`scope=org`) tenham qualquer vínculo com área ou time, deixando-os "sem dono operacional".

### 1.2 Componentes Afetados

| Componente | Arquivo | Estado |
|------------|---------|--------|
| **CreateKpiDialog** | `src/modules/kpis/components/CreateKpiDialog.tsx` | Bloqueia área/time para `scope=org` |
| **EditKpiDialog** | `src/modules/kpis/components/EditKpiDialog.tsx` | Mesma lógica |
| **useCanEditKpi** | `src/modules/kpis/hooks/useCanEditKpi.ts` | Não verifica scope nem liderança |
| **Trigger SQL** | `kpi_metrics_governance_validate()` | Proíbe team_id para scope=org/area |

### 1.3 Hooks e Funções Existentes para Reutilizar

| Recurso | Descrição |
|---------|-----------|
| `useLeaderTeams()` | Retorna times liderados pelo usuário |
| `useTeamManagement()` | Verifica se pode gerenciar time específico via `canManageTeam(teamId)` |
| `usePermissions()` | Verifica `isWildcard` e permission keys |
| `is_team_leader(user_id, team_id)` | Função SQL que verifica liderança direta |
| `user_can_manage_team(user_id, team_id)` | Função SQL com escopo completo (admin, super_admin, líder) |

---

## 2. Solução Proposta

### 2.1 Modelo Conceitual Corrigido

```
┌─────────────────────────────────────────────────────────────────┐
│ ESCOPO (imutável)                                               │
│ Define ONDE o indicador impacta                                 │
├─────────────────────────────────────────────────────────────────┤
│ • org    → Saúde do negócio como um todo                        │
│ • area   → Saúde de uma área estratégica                        │
│ • team   → Performance de um time específico                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ RESPONSABILIDADE OPERACIONAL                                    │
│ Define QUEM cuida, analisa e age                                │
├─────────────────────────────────────────────────────────────────┤
│ • responsible_area_id  → Área responsável (obrigatório p/ org)  │
│ • responsible_team_id  → Time responsável (opcional)            │
│ • owner_user_id        → Pessoa accountable (obrigatório)       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Novas Colunas no Schema

| Coluna | Tipo | Nullable | Default | Propósito |
|--------|------|----------|---------|-----------|
| `responsible_area_id` | `uuid` → `areas(id)` | YES | NULL | Área operacionalmente responsável |
| `responsible_team_id` | `uuid` → `teams(id)` | YES | NULL | Time operacionalmente responsável |

### 2.3 Regras de Validação por Escopo

| Escopo | `area_id` | `team_id` | `responsible_area_id` | `responsible_team_id` |
|--------|-----------|-----------|----------------------|----------------------|
| **team** | Inferido do time | Obrigatório | Ignorado | Ignorado |
| **area** | Obrigatório | Proibido | Opcional | Recomendado |
| **org** | Proibido | Proibido | **Obrigatório** | Opcional |

### 2.4 Regras de Permissão (Enforcement)

| Ação | Escopo | Quem Pode |
|------|--------|-----------|
| **CRIAR** | `org` | Admin, Super Admin |
| **CRIAR** | `area` | Admin, Super Admin |
| **CRIAR** | `team` | Admin, Super Admin, Líder do time |
| **EDITAR** | `org` | Admin, Super Admin |
| **EDITAR** | `area` | Admin, Super Admin |
| **EDITAR** | `team` | Admin, Super Admin, Líder do time, Owner |
| **ATUALIZAR VALORES** | Qualquer | Owner, Contribuidores, Admin |

---

## 3. Implementação

### 3.1 Migration SQL

**Alterações:**
1. Adicionar colunas `responsible_area_id` e `responsible_team_id`
2. Criar foreign keys e índices
3. Atualizar trigger `kpi_metrics_governance_validate()`
4. Backfill KPIs globais existentes (inferir área do owner quando possível)

**Nova lógica do trigger:**
```sql
-- scope=org ativo → responsible_area_id OBRIGATÓRIO
-- scope=area ativo → responsible_team_id RECOMENDADO (warning no log, não erro)
-- Mantém regras existentes para team_id/area_id (ownership hierárquico)
```

### 3.2 Atualização de Types

**Arquivo:** `src/modules/kpis/types.ts`

Adicionar:
```typescript
interface KpiMetric {
  // ... campos existentes ...
  // v2.90.0: Responsabilidade Operacional
  responsible_area_id: string | null;
  responsible_team_id: string | null;
}
```

### 3.3 Atualização do CreateKpiDialog

**Mudanças:**
1. **Seção "Responsabilidade Operacional"** quando `scope=org`:
   - Campo: `Área Responsável` (obrigatório)
   - Campo: `Time Responsável` (opcional)
   - Copy educativo: "Esta KPI é Global, mas quem responde por ela no dia a dia é:"

2. **Seção opcional para `scope=area`:**
   - Campo: `Time Responsável` (opcional)
   - Copy: "Qual time é o principal responsável por acompanhar este indicador?"

3. **Escopo imutável após criação:**
   - Não se aplica na criação (campo editável)

4. **Bloqueio de escopo por permissão:**
   - Se não for Admin/Super Admin: desabilitar opções `org` e `area`
   - Mostrar tooltip explicativo

5. **InfoNotice educativo** sobre governança:
   - Quando `scope=org`: Alerta informando que KPIs globais requerem área responsável
   - Quando `scope=area`: Alerta informando que é recomendado atribuir time responsável

### 3.4 Atualização do EditKpiDialog

**Mudanças:**
1. **Escopo READONLY:**
   - Campo `scope` desabilitado com tooltip: "O escopo é definido na criação e não pode ser alterado"

2. **Seção "Responsabilidade Operacional"** (mesma lógica do Create)

3. **Bloqueio de edição por escopo:**
   - Se `scope=org` ou `scope=area` e não for Admin: formulário readonly ou botão Salvar desabilitado

### 3.5 Atualização do useCanEditKpi

**Nova lógica:**
```typescript
const canEdit = useMemo(() => {
  if (!kpi || !profileId) return false;

  // Admin sempre pode editar
  if (isWildcard) return true;
  if (hasPermission("kpis.settings.manage:bu")) return true;

  // KPIs Globais e de Área: APENAS admins
  if (kpi.scope === 'org' || kpi.scope === 'area') {
    return false;
  }

  // KPIs de Time: verificar liderança
  if (kpi.scope === 'team' && kpi.team_id) {
    // Usa canManageTeam do useTeamManagement
    if (canManageTeam(kpi.team_id)) return true;
  }

  // É owner do KPI (para scope=team)
  if (kpi.owner_user_id === profileId) return true;

  // É contribuidor (para atualização de valores)
  if (contributors.includes(profileId)) return true;

  return false;
}, [kpi, profileId, isWildcard, hasPermission, contributors, canManageTeam]);
```

**Nova prop retornada:**
```typescript
return { 
  canEdit,          // Pode editar metadados do KPI
  canUpdateValues,  // Pode atualizar valores (owner ou contribuidor)
  isLoading 
};
```

---

## 4. Arquivos a Criar

| Arquivo | Propósito |
|---------|-----------|
| `supabase/migrations/XXXX_kpi_responsible_governance.sql` | Migration com novas colunas e trigger |
| `docs/engineering/KPI_GOVERNANCE_MODEL.md` | Documentação do modelo de governança |

## 5. Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/modules/kpis/types.ts` | Adicionar `responsible_area_id`, `responsible_team_id` |
| `src/modules/kpis/components/CreateKpiDialog.tsx` | Seção responsabilidade, bloqueio de escopo, InfoNotice |
| `src/modules/kpis/components/EditKpiDialog.tsx` | Escopo readonly, seção responsabilidade, bloqueio por permissão |
| `src/modules/kpis/hooks/useCanEditKpi.ts` | Verificar scope + liderança via useTeamManagement |
| `src/modules/kpis/hooks/useKpiMutations.ts` | Incluir novos campos no update |
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | Documentar modelo de governança |

---

## 6. Garantia de Não-Conflito com Wizards

**Análise realizada:**
- Wizards de OKRs (`CollaboratorCheckinPage`, `LeaderPrepPage`, `ManagersCheckinPage`, `CLevelCheckinPage`) usam `useKpisForWizardV2` apenas para **leitura e atualização de valores**
- Nenhum wizard faz criação ou edição de metadados de KPI
- A separação `canEdit` (metadados) vs `canUpdateValues` (valores) garante que contribuidores continuem podendo atualizar valores sem poder editar metadados

**Impacto nos wizards:** ZERO — apenas leitura e atualização de valores, que continuam funcionando via `owner_user_id` e `kpi_data_contributors`.

---

## 7. UX: Mensagens Educativas

### 7.1 InfoNotice no CreateKpiDialog (scope=org)

```
ℹ️ KPIs Globais impactam toda a organização e requerem uma área 
   operacionalmente responsável por acompanhar e agir em desvios.
```

### 7.2 Tooltip no campo Escopo (bloqueado para não-admin)

```
KPIs Globais e de Área só podem ser criados por administradores.
Colaboradores podem criar KPIs de Time.
```

### 7.3 Tooltip no campo Escopo (EditDialog)

```
O escopo define onde o indicador impacta e é definido na criação.
Para alterar, crie um novo indicador com o escopo desejado.
```

---

## 8. Critérios de Sucesso

- [ ] Nenhuma KPI Global fica sem `responsible_area_id` quando ativa
- [ ] Escopo é imutável após criação (campo readonly no Edit)
- [ ] Apenas admins podem criar/editar KPIs com `scope=org` ou `scope=area`
- [ ] Líderes podem criar/editar KPIs apenas de times que lideram
- [ ] Colaboradores podem atualizar valores (owner/contribuidor) mas não editar metadados de KPIs estratégicos
- [ ] Wizards continuam funcionando sem alterações
- [ ] Backfill de KPIs globais existentes não quebra dados

---

## 9. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| KPIs globais existentes sem responsible_area_id | Backfill: inferir área do time do owner; marcar sem área para revisão manual |
| Quebra de RLS | Trigger não cria novas políticas RLS, apenas validação |
| UX confusa entre "Área" (ownership) e "Área Responsável" | Copy claro + seção separada "Responsabilidade Operacional" |
| Líder perde acesso a KPI após mudança de time | Migration não altera KPIs existentes; acesso mantido via owner |
