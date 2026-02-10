# Unified Participant Layer

> **Version**: 1.0.0  
> **Status**: Active  
> **TCR Version**: v2.59.0

## Overview

A Unified Participant Layer é uma camada de abstração que simplifica o tratamento de usuários internos (`profiles`) e externos (`partner_contacts`) **sem unificar as tabelas**, mantendo a semântica de domínio enquanto reduz a complexidade do frontend.

## Motivação

### Problema
- Sistema possui dois tipos de usuários com tabelas separadas: `profiles` (internos) e `partner_contacts` (externos)
- Código duplicado no frontend para lidar com cada tipo
- Lógica condicional espalhada em múltiplos componentes
- "Usuários híbridos" (profile + partner_contact) requerem tratamento especial

### Solução
Criar uma camada de abstração que:
- Mantém tabelas separadas (semântica de domínio preservada)
- Unifica a leitura via View SQL
- Fornece hooks e componentes TypeScript reutilizáveis
- Simplifica ~30% da lógica de participantes no frontend

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Components:                                                │
│  ├── ParticipantAvatar                                      │
│  ├── ParticipantLink                                        │
│  └── ParticipantBadge                                       │
│                                                             │
│  Hooks:                                                     │
│  ├── useUnifiedParticipant() - Current user identity        │
│  ├── useBuParticipantsDirectory() - List all participants   │
│  └── useResolveParticipant() - Resolve by ID                │
│                                                             │
│  Types:                                                     │
│  └── UnifiedParticipant, ParticipantType                    │
├─────────────────────────────────────────────────────────────┤
│                     DATABASE LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  View:                                                      │
│  └── v_all_participants (UNION of profiles + contacts)      │
│                                                             │
│  RPC:                                                       │
│  └── resolve_participant_identity(uuid, uuid)               │
│                                                             │
│  Source Tables (unchanged):                                 │
│  ├── profiles                                               │
│  └── partner_contacts                                       │
└─────────────────────────────────────────────────────────────┘
```

## Database Components

### View: `v_all_participants`

```sql
CREATE VIEW public.v_all_participants
WITH (security_invoker = true) AS
SELECT 
  'internal'::text as user_type,
  p.id as participant_id,
  p.user_id as auth_user_id,
  p.display_name,
  p.work_email as email,
  p.photo_url,
  p.bu_id,
  NULL::uuid as company_id,
  NULL::text as company_name,
  t.name as team_name,
  jt.name as job_title,
  p.employment_status::text as status
FROM public.profiles p
LEFT JOIN public.teams t ON p.team_id = t.id
LEFT JOIN public.job_titles jt ON p.job_title_id = jt.id
WHERE p.deleted_at IS NULL 
  AND p.employment_status != 'terminated'
  AND p.user_type = 'internal'  -- Exclui externos para evitar duplicação com partner_contacts

UNION ALL

SELECT 
  'external'::text as user_type,
  pc.id as participant_id,
  pc.user_id as auth_user_id,
  pc.name as display_name,
  pc.email,
  NULL::text as photo_url,
  pca.bu_id,
  pc.external_company_id as company_id,
  pco.name as company_name,
  NULL::text as team_name,
  NULL::text as job_title,
  pc.status::text as status
FROM public.partner_contacts pc
JOIN public.partner_contact_bu_associations pca ON pc.id = pca.partner_contact_id AND pca.is_active = true AND pca.deleted_at IS NULL
JOIN public.external_companies pco ON pc.external_company_id = pco.id
WHERE pc.deleted_at IS NULL AND pc.status = 'active';
```

### RPC: `resolve_participant_identity`

Resolve um ID de participante para dados unificados de identidade:

```sql
SELECT * FROM resolve_participant_identity(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'bu-id'::uuid
);
```

## Frontend Components

### Types

```typescript
import { 
  UnifiedParticipant, 
  ParticipantType,
  isInternalParticipant,
  isExternalParticipant,
  getParticipantInitials 
} from '@/lib/participantTypes';
```

### Hooks

#### `useUnifiedParticipant()`

Retorna a identidade unificada do usuário atual:

```typescript
const { 
  participant,     // UnifiedParticipant | null
  isInternal,      // boolean
  isExternal,      // boolean
  participantId,   // string | null - use for assignments
  isLoading,
  isReady 
} = useUnifiedParticipant();
```

#### `useBuParticipantsDirectory(options?)`

Lista todos os participantes da BU atual:

```typescript
const { data: participants, isLoading } = useBuParticipantsDirectory({
  q: searchTerm,           // Filter by name/email
  includeExternal: true,   // Include external participants
  companyId: '...',        // Filter by company (external only)
  teamId: '...',           // Filter by team (internal only)
});
```

#### `useResolveParticipant(participantId)`

Resolve um ID para dados unificados:

```typescript
const { data: participant, isLoading } = useResolveParticipant(ownerId);
```

### Components

#### `ParticipantAvatar`

```tsx
import { ParticipantAvatar } from '@/components/participant';

<ParticipantAvatar 
  participant={participant} 
  size="md"                    // xs | sm | md | lg | xl
  showExternalIndicator={true} // Show badge for external
/>
```

#### `ParticipantLink`

```tsx
import { ParticipantLink } from '@/components/participant';

<ParticipantLink 
  participant={participant}
  openInNewTab={false}
>
  View Profile
</ParticipantLink>
```

#### `ParticipantBadge`

```tsx
import { ParticipantBadge } from '@/components/participant';

<ParticipantBadge 
  participant={participant}
  size="md"              // sm | md | lg
  linkToProfile={true}   // Name is a link
  showExternalBadge      // Show "Externo" badge
  showCompanyName        // Show company for external
  showMeta               // Show team/job for internal
/>
```

## Migration Guide

### Before (duplicated logic)

```tsx
// ❌ Old pattern - conditional logic everywhere
function TicketOwner({ ticket }) {
  if (ticket.owner) {
    return (
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarImage src={ticket.owner.photo_url} />
          <AvatarFallback>{getInitials(ticket.owner.display_name)}</AvatarFallback>
        </Avatar>
        <Link to={`/users/${ticket.owner.id}`}>
          {ticket.owner.display_name}
        </Link>
      </div>
    );
  }
  
  if (ticket.assigned_contact) {
    return (
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarFallback className="bg-orange-100">
            {getInitials(ticket.assigned_contact.name)}
          </AvatarFallback>
        </Avatar>
        <Link to={`/contacts/${ticket.assigned_contact.id}`}>
          {ticket.assigned_contact.name}
        </Link>
        <Badge>Externo</Badge>
      </div>
    );
  }
  
  return <span>Não atribuído</span>;
}
```

### After (unified)

```tsx
// ✅ New pattern - single component
function TicketOwner({ ownerId }) {
  const { data: participant, isLoading } = useResolveParticipant(ownerId);
  
  if (isLoading) return <Skeleton />;
  if (!participant) return <span>Não atribuído</span>;
  
  return (
    <ParticipantBadge 
      participant={participant} 
      linkToProfile 
      showExternalBadge 
    />
  );
}
```

## Query Keys

```typescript
import { queryKeys } from '@/lib/queryKeys';

// List
queryKeys.participants.list(buId, { q, includeExternal, companyId });

// Detail  
queryKeys.participants.detail(participantId);

// Resolve
queryKeys.participants.resolve(participantId, buId);
```

## Best Practices

1. **Use `participantId` para atribuições**
   ```typescript
   const { participantId } = useUnifiedParticipant();
   await createTicket({ owner_id: participantId });
   ```

2. **Use componentes ao invés de lógica condicional**
   ```tsx
   // ❌ Avoid
   {isInternal ? <UserAvatar /> : <ContactAvatar />}
   
   // ✅ Prefer
   <ParticipantAvatar participant={participant} />
   ```

3. **Use `useResolveParticipant` para IDs desconhecidos**
   ```typescript
   // Quando você tem um ID mas não sabe o tipo
   const { data: participant } = useResolveParticipant(someId);
   ```

## Related Documentation

- [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md) - Identity patterns
- [DATA_MODEL_REGISTRY.md](./DATA_MODEL_REGISTRY.md) - Database schema
- [QUERY_KEYS_STANDARD.md](./QUERY_KEYS_STANDARD.md) - Query key patterns
