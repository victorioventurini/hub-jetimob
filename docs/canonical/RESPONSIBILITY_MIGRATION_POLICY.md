# Política de Migração de Responsabilidades

**Versão:** 1.0.0  
**Última atualização:** 2026-02-05  
**Status:** Normativo  
**Referência:** TCR v3.9.0

---

## Regra Obrigatória

> **"Toda nova funcionalidade que introduzir ownership ou responsabilidade DEVE definir explicitamente como se comporta nos cenários de migração."**

Esta política garante que nenhuma responsabilidade fique órfã quando ocorrerem mudanças estruturais no Hub.

---

## Cenários de Migração Cobertos

### 1. Remoção de Usuário da BU

| Tipo | Entidades | Comportamento |
|------|-----------|---------------|
| **Mandatório** | KPIs, Iniciativas, Tickets, Objetivos (Time/Org), KRs (Time/Org) | BLOQUEADO até que novo owner seja definido |
| **Opcional** | Liderança de time/área, Co-liderança, Co-responsabilidade em KRs, Contribuidor de KPIs | SET NULL automaticamente |

**Hooks envolvidos:**
- `useUserDependencies` - Detecta todas as dependências
- `useTransferDependencies` - Executa transferências

**Componente UI:**
- `UserDependenciesDialog` - Interface de transferência

### 2. Exclusão/Desativação de Time

| Tipo | Entidades | Comportamento |
|------|-----------|---------------|
| **Mandatório** | Objetivos de Time ativos, KRs ativos, Sub-times | BLOQUEADO até resolução |
| **Opcional** | Membros, Squads | Desvinculados/removidos automaticamente |

**Hooks envolvidos:**
- `useTeamDependencies` - Detecta dependências do time

**Componente UI:**
- `TeamDependenciesDialog` - Mostra bloqueios e orientação

### 3. Exclusão/Desativação de Área

| Tipo | Entidades | Comportamento |
|------|-----------|---------------|
| **Mandatório** | Times vinculados | BLOQUEADO até que times sejam movidos |
| **Opcional** | - | Áreas não têm OKRs próprios |

**Hooks envolvidos:**
- `useAreaDependencies` - Detecta times vinculados

**Componente UI:**
- `AreaDependenciesDialog` - Mostra bloqueios e orientação

### 4. Mudança de Líder de Time/Área

| Cenário | Comportamento Recomendado |
|---------|---------------------------|
| Líder anterior era owner de OKRs | Manter como owner OU transferir para novo líder |
| Líder anterior tinha KPIs | Manter ownership OU transferir |

> ⚠️ **Nota:** Mudança de liderança não bloqueia automaticamente, mas UI deve sugerir revisão de ownerships.

---

## Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────────┐
│              RESPONSIBILITY TRANSFER SYSTEM (RTS)                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐  │
│  │  Dependency     │ -> │ Dependency      │ -> │   Transfer   │  │
│  │  Hooks          │    │  Dialogs        │    │   Mutations  │  │
│  └─────────────────┘    └─────────────────┘    └──────────────┘  │
│                                                                   │
│  useUserDependencies    UserDependenciesDialog  useTransferDeps  │
│  useTeamDependencies    TeamDependenciesDialog  useDeleteTeam    │
│  useAreaDependencies    AreaDependenciesDialog  useDeleteArea    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Entidades com Ownership (Mapeamento Completo)

| Entidade | Tabela | Coluna | Hook de Detecção |
|----------|--------|--------|------------------|
| KPIs | `kpi_metrics` | `owner_user_id` | `useUserDependencies` |
| Contribuidores KPI | `kpi_data_contributors` | `contributor_user_id` | `useUserDependencies` |
| Iniciativas OKR | `okr_initiatives` | `owner_user_id` | `useUserDependencies` |
| Objetivos de Time | `okr_team_objectives` | `owner_user_id` | `useUserDependencies`, `useTeamDependencies` |
| KRs de Time | `okr_team_key_results` | `owner_user_id` | `useUserDependencies`, `useTeamDependencies` |
| KRs (co-responsáveis) | `okr_team_key_results` | `co_responsibles[]` | `useUserDependencies` |
| Objetivos Org | `okr_org_objectives` | `owner_user_id` | `useUserDependencies` |
| KRs Org | `okr_org_key_results` | `owner_user_id` | `useUserDependencies` |
| Tickets | `tickets` | `owner_user_id` | `useUserDependencies` |
| Times (liderança) | `teams` | `leader_user_id` | `useUserDependencies` |
| Áreas (liderança) | `areas` | `leader_user_id` | `useUserDependencies` |
| Áreas (co-liderança) | `areas` | `co_leader_user_id` | `useUserDependencies` |
| Times (área) | `teams` | `area_id` | `useAreaDependencies` |

---

## Checklist para Novas Features

Toda nova funcionalidade que introduz ownership DEVE:

- [ ] Definir coluna de ownership (ex: `owner_user_id`)
- [ ] Registrar no `useUserDependencies` (se ownership de usuário)
- [ ] Registrar no `useTeamDependencies` (se ownership de time)
- [ ] Registrar no `useAreaDependencies` (se ownership de área)
- [ ] Definir se é **mandatório** (bloqueia exclusão) ou **opcional** (auto-clear)
- [ ] Adicionar tratamento em `useTransferDependencies` (se mandatório)
- [ ] Documentar neste arquivo

---

## Padrões de Implementação

### Adicionando Nova Dependência Mandatória

```typescript
// 1. Adicionar query no useUserDependencies
const { data: myEntities = [], isLoading: myEntitiesLoading } = useQuery({
  queryKey: [...queryKeys.myModule.all(buId), "owner", profileId],
  enabled: !!buId && !!profileId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("my_table")
      .select("id, name")
      .eq("bu_id", buId!)
      .eq("owner_user_id", profileId!)
      .is("deleted_at", null);
    if (error) throw error;
    return (data || []).map((e) => ({ id: e.id, name: e.name }));
  },
});

// 2. Adicionar ao objeto de retorno
return {
  mandatory: {
    // ...existentes
    myEntities,
  },
  // ...
};

// 3. Adicionar tratamento no useTransferDependencies
for (const item of transfers.myEntities) {
  const { error } = await client
    .from("my_table")
    .update({ owner_user_id: item.newOwnerId, updated_at: now })
    .eq("id", item.id);
  if (error) throw error;
}

// 4. Adicionar seção no UserDependenciesDialog
{renderDependencySection(
  "Minhas Entidades",
  <Icon className="h-4 w-4 text-primary" />,
  deps.mandatory.myEntities,
  "myEntities"
)}
```

### Adicionando Nova Dependência Opcional

```typescript
// 1. Adicionar query no useUserDependencies
const { data: myLinks = [], isLoading: myLinksLoading } = useQuery({
  // ...similar ao mandatório
});

// 2. Adicionar ao objeto optional
return {
  optional: {
    // ...existentes
    myLinks,
  },
};

// 3. Adicionar clear automático no useTransferDependencies
const { error: myLinksError } = await client
  .from("my_table")
  .update({ linked_user_id: null, updated_at: now })
  .eq("linked_user_id", profileId);
if (myLinksError) throw myLinksError;
```

---

## Experiência do Usuário

### Para Administradores

> "Posso remover ou alterar pessoas com segurança, sem medo de quebrar nada invisível."

O sistema SEMPRE mostra:
1. Quantas responsabilidades existem
2. Quais são mandatórias (precisam de ação)
3. Quais serão limpas automaticamente
4. Orientação clara de como resolver bloqueios

### Para Usuários

> "Responsabilidades sempre têm dono, mesmo quando pessoas mudam."

O sistema GARANTE:
1. Nenhum KPI/OKR/Ticket fica sem responsável
2. Transições são registradas no histórico
3. Notificações são enviadas aos novos responsáveis

---

## Referências

- `src/hooks/useUserDependencies.ts` - Hook de detecção de dependências de usuário
- `src/hooks/useTeamDependencies.ts` - Hook de detecção de dependências de time
- `src/hooks/useAreaDependencies.ts` - Hook de detecção de dependências de área
- `src/hooks/useProfiles.ts` - Hook de transferência e exclusão
- `src/components/users/UserDependenciesDialog.tsx` - UI de migração de usuário
- `src/components/teams/TeamDependenciesDialog.tsx` - UI de validação de time
- `src/components/areas/AreaDependenciesDialog.tsx` - UI de validação de área
