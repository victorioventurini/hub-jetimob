
# Expandir Destinatarios do E-mail de Resumo do Check-in para Subtimes sem OKRs

## Contexto

Quando o time "Marketing" faz check-in, o e-mail de resumo hoje vai apenas para os membros diretos do time Marketing. Porem, subtimes como "Branding" e "Growth" que nao tem OKRs proprias no ciclo atual (contribuem com as OKRs do time pai) nao recebem o resumo.

A regra nova: alem dos membros do time que fez check-in, incluir membros de **subtimes diretos que nao possuem OKRs proprias no ciclo atual (trimestre)**.

## Pre-checklist

- TCR v3.8.0 (secao 1.5): Clientes Supabase - Edge Function usa `serviceClient` (service role) - OK
- TCR v3.8.0 (secao 1.3): Hierarquia `BU > Area > Time > Subtime > Pessoas`
- IDENTITY_CONVENTION: `user_team_memberships` com `profiles.user_id` (auth.users.id) como identificador
- DATA_MODEL: `teams.parent_team_id` define hierarquia pai-filho
- Memory `team-checkin-summary-architecture`: Destinatarios via `user_team_memberships` com fallback `profiles.team_id`; lider incluso separadamente

## Alteracao

**Arquivo unico**: `supabase/functions/team-checkin-summary/index.ts`

### Logica a adicionar na funcao `loadTeamData` (apos linha ~479, depois de coletar `memberAuthIds` do time principal)

1. **Buscar subtimes diretos** do time que fez check-in:
   ```sql
   SELECT id, name FROM teams
   WHERE parent_team_id = :teamId
     AND status = 'active'
     AND deleted_at IS NULL
   ```

2. **Para cada subtime, verificar se tem OKRs proprias no ciclo**:
   ```sql
   SELECT count(*) FROM okr_team_objectives
   WHERE team_id = :subtimeId
     AND cycle_id = :cycleId
     AND deleted_at IS NULL
     AND status NOT IN ('cancelled', 'discarded')
   ```

3. **Para subtimes SEM OKRs proprias**, buscar membros:
   ```sql
   SELECT profiles.user_id FROM user_team_memberships
   JOIN profiles ON profiles.id = user_team_memberships.profile_id
   WHERE user_team_memberships.team_id IN (:subtimeIdsSemOkrs)
   ```
   Com fallback para `profiles.team_id` (padrao canonico).

4. **Incluir lideres dos subtimes** sem OKRs (mesma logica atual do time principal).

5. **Deduplicar** todos os IDs antes de enviar.

### Pseudocodigo

```text
// Apos coletar memberAuthIds do time principal (linha ~479)

// 1. Buscar subtimes diretos ativos
const subtimes = await serviceClient
  .from('teams')
  .select('id, name, leader_user_id')
  .eq('parent_team_id', teamId)
  .eq('status', 'active')
  .is('deleted_at', null);

if (subtimes.data?.length > 0) {
  const subtimeIds = subtimes.data.map(s => s.id);

  // 2. Verificar quais subtimes tem OKRs no ciclo
  const subtimeOkrs = await serviceClient
    .from('okr_team_objectives')
    .select('team_id')
    .in('team_id', subtimeIds)
    .eq('cycle_id', cycleId)
    .is('deleted_at', null)
    .not('status', 'in', '("cancelled","discarded")');

  const subtimesComOkrs = new Set(subtimeOkrs.data?.map(o => o.team_id));
  const subtimesSemOkrs = subtimeIds.filter(id => !subtimesComOkrs.has(id));

  // 3. Buscar membros dos subtimes sem OKRs
  if (subtimesSemOkrs.length > 0) {
    const subMembers = await serviceClient
      .from('user_team_memberships')
      .select('profiles!inner(user_id)')
      .in('team_id', subtimesSemOkrs);

    // Fallback para profiles.team_id se vazio
    // + incluir lideres dos subtimes
    // Adicionar ao memberAuthIds
  }
}

// Deduplicar
memberAuthIds = [...new Set(memberAuthIds)];
```

### O que NAO muda

- Logica de idempotencia (`summary_sent_at`)
- Orquestracao dos 4 agentes de IA
- Conteudo do e-mail (baseado nos OKRs do time principal)
- Notificacao via `emit_notification_event` canonico
- Estrutura do metadata

### Resultado esperado

- Time Marketing faz check-in
- Membros de Marketing recebem o resumo (como hoje)
- Membros de Branding e Growth (subtimes sem OKRs proprias) tambem recebem
- Subtimes que TEM OKRs proprias no ciclo NAO recebem (farao seu proprio check-in)
