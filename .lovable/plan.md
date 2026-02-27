

# Corrigir visibilidade de perfil bloqueado por falta de membership

## Problema

O perfil `9574fe99-a699-4cd1-a505-646e61e5be34` nao pode ser visualizado porque o hook `usePublicProfile.ts` (linhas 52-62) verifica a existencia de registro em `bu_user_memberships` para decidir se o perfil e visivel. Usuarios importados que nunca fizeram login podem nao ter membership, mesmo pertencendo a BU.

Isso viola o padrao **User Directory Global v2** documentado no TCR v3.8.0, que estabelece `v_bu_active_profiles` como fonte unica de verdade para visibilidade de usuarios.

## Solucao

Substituir a verificacao de `bu_user_memberships` pela view canonica `v_bu_active_profiles`, que ja implementa as regras corretas:
- Profiles com `bu_id` na BU ativa sao visiveis (mesmo sem membership)
- Profiles com membership ativa na BU sao visiveis
- Terminated e deleted sao excluidos pela propria view

## Alteracao

**Arquivo:** `src/hooks/usePublicProfile.ts` (linhas 52-62)

Substituir:

```typescript
const { data: membershipCheck } = await supabase
  .from("bu_user_memberships")
  .select("id")
  .eq("profile_id", profileData.id)
  .eq("bu_id", currentBu.id)
  .is("deleted_at", null)
  .maybeSingle();

if (!membershipCheck) return null;
```

Por:

```typescript
const { data: directoryCheck } = await supabase
  .from("v_bu_active_profiles")
  .select("id")
  .eq("id", profileData.id)
  .eq("bu_id", currentBu.id)
  .maybeSingle();

if (!directoryCheck) return null;
```

Nenhuma outra alteracao necessaria. O restante do hook (team, job title, manager, privacy) permanece intacto.

