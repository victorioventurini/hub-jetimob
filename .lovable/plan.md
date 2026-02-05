
# Política Sistêmica de Migração de Responsabilidades

## Resumo Executivo

Implementar uma política unificada e obrigatória de migração de responsabilidades no Hub, cobrindo todos os cenários de mudança estrutural (usuários, times, áreas) e todas as entidades com ownership, garantindo continuidade operacional e governança sem responsabilidades órfãs.

---

## Diagnóstico: Cobertura Atual vs Necessária

### Cobertura Atual (Parcial)

| Cenário | Status | Implementação |
|---------|--------|---------------|
| Remoção de usuário da BU | Parcial | `useUserDependencies` + `UserDependenciesDialog` |
| Migração de tickets (contato externo) | Implementado | `useContactTicketMigration` |
| Exclusão de time | Sem validação | `useDeleteTeam` executa soft-delete direto |
| Exclusão de área | Sem validação | `useDeleteArea` executa soft-delete direto |
| Mudança de líder de time | Sem migração | Apenas atualiza `leader_user_id` |
| Mudança de líder de área | Sem migração | Apenas atualiza `leader_user_id` |
| Mudança de cargo | Sem tratamento | Nenhum hook |
| Desativação de time/área | Sem validação | `useDeactivateTeam` executa direto |

### Entidades com Ownership (Mapeamento Completo)

| Entidade | Tabela | Coluna | Coberto Hoje |
|----------|--------|--------|--------------|
| KPIs | `kpi_metrics` | `owner_user_id` | Sim |
| Métricas KPI (contribuidores) | `kpi_data_contributors` | `contributor_user_id` | Não |
| Iniciativas OKR | `okr_initiatives` | `owner_user_id` | Sim |
| Objetivos de Time | `okr_team_objectives` | `owner_user_id` | Não |
| KRs de Time | `okr_team_key_results` | `owner_user_id` | Não |
| KRs de Time (co-responsáveis) | `okr_team_key_results` | `co_responsibles[]` | Não |
| Objetivos Org | `okr_org_objectives` | `owner_user_id` | Não |
| KRs Org | `okr_org_key_results` | `owner_user_id` | Não |
| Tickets | `tickets` | `owner_user_id` | Sim |
| Times (liderança) | `teams` | `leader_user_id` | SET NULL |
| Áreas (liderança) | `areas` | `leader_user_id` | Não |
| Áreas (co-liderança) | `areas` | `co_leader_user_id` | Não |

### Gaps Críticos Identificados

1. **OKRs não cobertos**: Objetivos e KRs de time/org não estão no `useUserDependencies`
2. **Liderança de área ignorada**: Áreas não têm validação de migração
3. **Co-responsáveis de KRs**: Array `co_responsibles` não é limpo
4. **Contribuidores de KPIs**: Tabela `kpi_data_contributors` não é migrada
5. **Desativação de time/área**: Permite desativar mesmo com OKRs ativos vinculados
6. **Mudança de liderança**: Não avalia/migra responsabilidades do líder anterior

---

## Arquitetura da Solução

### Conceito Central: Responsibility Transfer System (RTS)

```text
+------------------------------------------------------------------+
|              RESPONSIBILITY TRANSFER SYSTEM (RTS)                 |
+------------------------------------------------------------------+
|                                                                   |
|  +---------------+    +-----------------+    +--------------+     |
|  |  Entity Scan  | -> | Dependency Map  | -> |   Transfer   |    |
|  | (Hook genérico)|    |  (Visualização) |    |   Executor   |    |
|  +---------------+    +-----------------+    +--------------+     |
|                                                                   |
|  Cenários Cobertos:                                              |
|  - Remoção de usuário                                            |
|  - Mudança de liderança (time/área)                              |
|  - Desativação de time/área                                      |
|  - Exclusão de time/área                                         |
|  - Mudança de cargo (futuro)                                     |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Plano de Implementação (4 Fases)

### Fase 1: Expandir Hook de Dependências de Usuário (2-3h)

**Arquivo:** `src/hooks/useUserDependencies.ts`

Adicionar 7 novas queries para cobrir todas as entidades:

1. `okr_team_objectives` onde `owner_user_id = profileId`
2. `okr_team_key_results` onde `owner_user_id = profileId`
3. `okr_org_objectives` onde `owner_user_id = profileId`
4. `okr_org_key_results` onde `owner_user_id = profileId`
5. `areas` onde `leader_user_id = profileId` OU `co_leader_user_id = profileId`
6. `okr_team_key_results` onde `profileId = ANY(co_responsibles)`
7. `kpi_data_contributors` onde `contributor_user_id = profileId`

**Interface atualizada:**

```typescript
export interface UserDependencies {
  mandatory: {
    kpis: DependencyItem[];
    initiatives: DependencyItem[];
    tickets: DependencyItem[];
    // NOVAS ENTIDADES:
    teamObjectives: DependencyItem[];
    teamKrs: DependencyItem[];
    orgObjectives: DependencyItem[];
    orgKrs: DependencyItem[];
  };
  optional: {
    teams: DependencyItem[];        // Líder de time
    areaLeaderships: DependencyItem[];  // Líder de área
    areaCoLeaderships: DependencyItem[]; // Co-líder de área
    krCoResponsible: DependencyItem[]; // Co-responsável em KRs
    kpiContributions: DependencyItem[];  // Contribuidor de KPIs
  };
  // ...
}
```

---

### Fase 2: Expandir Dialog e Mutation de Transferência (3-4h)

**Arquivos a modificar:**
- `src/components/users/UserDependenciesDialog.tsx`
- `src/hooks/useProfiles.ts` (`useTransferDependencies`)

**Novas seções no dialog:**

```text
+----------------------------------------------------------------+
| Transferir Responsabilidades                                    |
+----------------------------------------------------------------+
|                                                                 |
| [!] 12 itens precisam de novo responsável                       |
|                                                                 |
| Transferir todos para: [Select...]  [Aplicar]                  |
|                                                                 |
| ---------------------------------------------------------      |
| [Target] Objetivos de Time (2)                                  |
|   - Aumentar receita Q1     [Novo responsável v]               |
|   - Melhorar NPS            [Novo responsável v]               |
|                                                                 |
| [Chart] Key Results (3)                                         |
|   - Crescer ARR em 20%      [Novo responsável v]               |
|   - Reduzir churn para 3%   [Novo responsável v]               |
|   - Aumentar CSAT           [Novo responsável v]               |
|                                                                 |
| [Metrics] KPIs (2)                                              |
|   - MRR                     [Novo responsável v]               |
|   - CAC                     [Novo responsável v]               |
|                                                                 |
| ---------------------------------------------------------      |
| [i] 5 itens serão atualizados automaticamente                   |
|                                                                 |
| [Users] Times (liderança removida)                              |
|   [Vendas] [Suporte]                                           |
|                                                                 |
| [Building] Áreas (liderança/co-liderança removida)              |
|   [Revenue]                                                     |
|                                                                 |
| [Handshake] Co-responsabilidades em KRs (removidas)             |
|   3 KRs                                                        |
|                                                                 |
| [Edit] Contribuidor de KPIs (removido)                          |
|   2 KPIs                                                        |
|                                                                 |
+----------------------------------------------------------------+
```

**Mutation expandida:**

```typescript
export interface TransferConfig {
  profileId: string;
  transfers: {
    kpis: TransferItem[];
    initiatives: TransferItem[];
    tickets: TransferItem[];
    // NOVOS:
    teamObjectives: TransferItem[];
    teamKrs: TransferItem[];
    orgObjectives: TransferItem[];
    orgKrs: TransferItem[];
  };
  // Items auto-cleared (não precisam de newOwnerId):
  autoClear: {
    teamLeaderships: string[];      // team IDs
    areaLeaderships: string[];      // area IDs
    areaCoLeaderships: string[];    // area IDs
    krCoResponsibilities: string[]; // KR IDs
    kpiContributions: string[];     // contributor IDs
  };
}
```

---

### Fase 3: Criar Hooks de Dependência para Times e Áreas (3-4h)

**Novos arquivos:**

#### `src/hooks/useTeamDependencies.ts`

```typescript
export interface TeamDependencies {
  mandatory: {
    teamObjectives: DependencyItem[];  // OKRs ativos do time
    teamKrs: DependencyItem[];
    subteams: DependencyItem[];        // Times filhos
  };
  optional: {
    members: DependencyItem[];         // Membros do time
  };
  hasMandatoryDependencies: boolean;
  totalMandatory: number;
}

export function useTeamDependencies(teamId: string | null): TeamDependencies;
```

#### `src/hooks/useAreaDependencies.ts`

```typescript
export interface AreaDependencies {
  mandatory: {
    teams: DependencyItem[];           // Times vinculados à área
  };
  optional: {};
  hasMandatoryDependencies: boolean;
}

export function useAreaDependencies(areaId: string | null): AreaDependencies;
```

**Integração com hooks de delete:**

```typescript
// useDeleteTeam - adicionar validação
export function useDeleteTeam() {
  return useMutation({
    mutationFn: async (teamId: string) => {
      // 1. Verificar dependências via query síncrona
      // 2. Se hasMandatoryDependencies, throw new Error("TEAM_HAS_DEPENDENCIES")
      // 3. Se OK, soft delete
    },
  });
}
```

**Novo componente:**

#### `src/components/teams/TeamDependenciesDialog.tsx`

Dialog similar ao de usuários, mas focado em times:
- Listar OKRs ativos que precisam ser migrados/cancelados
- Listar subtimes que precisam ser reparentados
- Opção de migrar OKRs para outro time
- Opção de mover subtimes para time pai

---

### Fase 4: Documentação e Regra de Governança (1-2h)

**Novo documento:** `docs/canonical/RESPONSIBILITY_MIGRATION_POLICY.md`

```markdown
# Política de Migração de Responsabilidades

## Regra Obrigatória

> **"Toda nova funcionalidade que introduzir ownership ou responsabilidade 
> DEVE definir explicitamente como se comporta nos cenários de migração."**

## Cenários de Migração

### Remoção de Usuário da BU
- BLOQUEADO se existirem dependências mandatórias
- Dependências mandatórias: KPIs, Iniciativas, Tickets, Objetivos, KRs
- Dependências opcionais (auto-cleared): Liderança de time/área, co-responsabilidades

### Exclusão/Desativação de Time
- BLOQUEADO se existirem OKRs ativos ou subtimes
- Membros são automaticamente removidos

### Exclusão/Desativação de Área
- BLOQUEADO se existirem times vinculados
- Liderança é automaticamente removida

## Checklist para Novas Features

[ ] Define ownership (coluna owner_user_id ou similar)?
[ ] Está registrado em useUserDependencies?
[ ] UI de exclusão valida dependências?
[ ] Mutation transfere/limpa ownership?
[ ] Documentado neste arquivo?
```

**Atualização:** `docs/canonical/DEVELOPMENT_STANDARDS.md`

Adicionar seção "O. Responsabilidades e Migração" com regras obrigatórias.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Prioridade |
|---------|------|------------|
| `src/hooks/useUserDependencies.ts` | Expandir (7 queries novas) | Alta |
| `src/hooks/useProfiles.ts` | Expandir TransferConfig | Alta |
| `src/components/users/UserDependenciesDialog.tsx` | Adicionar seções | Alta |
| `src/hooks/useTeamDependencies.ts` | Criar | Média |
| `src/hooks/useAreaDependencies.ts` | Criar | Média |
| `src/components/teams/TeamDependenciesDialog.tsx` | Criar | Média |
| `src/components/areas/AreaDependenciesDialog.tsx` | Criar | Média |
| `src/modules/teams/hooks/useTeams.ts` | Integrar validação | Média |
| `src/modules/areas/hooks/useAreas.ts` | Integrar validação | Média |
| `docs/canonical/RESPONSIBILITY_MIGRATION_POLICY.md` | Criar | Alta |
| `docs/canonical/DEVELOPMENT_STANDARDS.md` | Adicionar seção O | Média |
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | Bump version | Baixa |

---

## Comportamento Esperado (UX)

### Ao Remover Usuário da BU

```text
1. Admin clica "Remover" em usuário
2. Sistema busca todas as dependências
3. SE existem dependências mandatórias:
   -> Abre UserDependenciesDialog
   -> Admin define novo responsável para cada item (ou bulk)
   -> Botão "Transferir e Remover" só habilita quando todos atribuídos
4. SE apenas dependências opcionais:
   -> Mostra aviso com lista do que será auto-cleared
   -> Botão "Confirmar Remoção"
5. SE nenhuma dependência:
   -> Dialog simples de confirmação
```

### Ao Excluir Time

```text
1. Admin clica "Excluir" em time
2. Sistema busca dependências (OKRs ativos, subtimes)
3. SE existem OKRs ativos:
   -> Abre TeamDependenciesDialog
   -> Admin escolhe: migrar OKRs para outro time OU cancelar OKRs
4. SE existem subtimes:
   -> Admin escolhe novo time pai OU desvincula (ficam órfãos)
5. Após resolução:
   -> Soft delete do time
   -> Membros são automaticamente removidos
```

### Ao Mudar Líder de Time

```text
1. Admin altera leader_user_id no form
2. Sistema detecta mudança de liderança
3. SE líder anterior tinha OKRs como owner no time:
   -> Sugere: manter como owner OU transferir para novo líder
4. Atualiza conforme escolha
```

---

## Critérios de Sucesso

| Critério | Métrica |
|----------|---------|
| Nenhuma responsabilidade órfã | 100% das entidades com owner válido |
| Ações perigosas bloqueadas | 0 exclusões sem validação |
| Cobertura de entidades | 12/12 tipos de ownership cobertos |
| Documentação | Política publicada e referenciada |
| Experiência do admin | "Posso remover pessoas com segurança" |

---

## Estimativa de Tempo

| Fase | Tempo |
|------|-------|
| Fase 1: Expandir useUserDependencies | 2-3h |
| Fase 2: Expandir Dialog e Mutation | 3-4h |
| Fase 3: Hooks de Time/Área | 3-4h |
| Fase 4: Documentação | 1-2h |
| **Total** | **9-13h** |

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Performance com muitas queries | Média | Usar Promise.all para queries paralelas |
| RLS bloqueia queries | Baixa | Queries já usam BU-scoped client |
| Breaking change em fluxos existentes | Média | Manter comportamento atual como fallback |
| Complexidade do dialog | Média | UX incremental: bulk transfer primeiro |
