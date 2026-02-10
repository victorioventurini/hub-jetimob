# External User Identity Pattern

> **Version**: 1.0.0  
> **Status**: Active  
> **TCR Version**: v2.59.0  
> **Created**: 2026-01-22

## Overview

Este documento formaliza o padrão de identidade para **usuários externos** (partner contacts) no Hub da Jet. Usuários externos são contatos de empresas parceiras que acessam o sistema via `partner_contacts`, diferente dos usuários internos que possuem registros em `profiles`.

## Motivação

### Problema

1. Usuários externos **não possuem** registro em `profiles`
2. Guards e hooks assumiam que todo usuário autenticado tem `profile`
3. Lógica condicional espalhada em múltiplos componentes
4. Erros de tela branca quando guards falhavam

### Solução

Criar um padrão documentado e hooks específicos para detectar e tratar usuários externos, garantindo que:
- Guards façam bypass para externos quando apropriado
- Componentes exibam dados corretamente para ambos os tipos
- Edge Functions validem corretamente ambos os tipos de usuário

## Modelo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTERNAL USER                                │
├─────────────────────────────────────────────────────────────────┤
│  auth.users                                                      │
│  └── profiles (1:1)                                             │
│      └── bu_user_memberships (1:N)                              │
│          └── bu_units                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL USER                                │
├─────────────────────────────────────────────────────────────────┤
│  auth.users                                                      │
│  └── partner_contacts (1:1 via user_id)                         │
│      └── partner_contact_bu_associations (1:N)                  │
│          └── bu_units                                            │
│      └── external_companies (N:1)                                │
└─────────────────────────────────────────────────────────────────┘
```

### Tabelas Relevantes

| Tabela | Propósito |
|--------|-----------|
| `partner_contacts` | Contatos externos globais (únicos por email) |
| `partner_contact_bu_associations` | Associação contato ↔ BU (N:N) |
| `external_companies` | Empresas parceiras globais |
| `external_company_bu_associations` | Associação empresa ↔ BU |

## Hooks Canônicos

### `useExternalUser()`

Hook principal para detectar se o usuário atual é externo.

```typescript
import { useExternalUser } from '@/modules/external/hooks/useExternalUser';

function MyComponent() {
  const {
    isExternal,           // boolean - true se usuário é externo
    externalData,         // Dados completos (contacts, primaryContact)
    externalInfo,         // Backward-compatible: primeiro contato
    allBuIds,             // IDs de todas as BUs associadas
    isLoading,
    error,
  } = useExternalUser();

  if (isExternal) {
    return <ExternalUserView data={externalData} />;
  }
  return <InternalUserView />;
}
```

**Quando usar:**
- ✅ Guards que precisam fazer bypass para externos
- ✅ Header/Navbar para exibir nome/avatar
- ✅ Notification center
- ✅ Qualquer componente que mostre dados do usuário atual

### `useUnifiedParticipant()`

Hook que abstrai interno/externo para operações.

```typescript
import { useUnifiedParticipant } from '@/hooks/useUnifiedParticipant';

function TicketAssignment() {
  const { 
    participant,      // UnifiedParticipant | null
    participantId,    // ID para usar em assignments
    isInternal,
    isExternal,
    isReady,
  } = useUnifiedParticipant();

  // Use participantId para atribuições
  await assignTicket({ owner_id: participantId });
}
```

**Quando usar:**
- ✅ Atribuição de tickets/tarefas
- ✅ Menções
- ✅ Qualquer operação que aceite interno OU externo

## Guards e Onboarding

### OnboardingGuard

Usuários externos **PASSAM** pelo fluxo de onboarding (possuem `profiles` criados pelo trigger `handle_new_user`).

O trigger `handle_new_user` cria um registro em `profiles` para todos os usuários (internos e externos) com:
- `employment_status = 'external'` para usuários externos
- `user_type = 'external'` para usuários externos (garante consistência com `employment_status`)
- `onboarding_completed = false` (padrão)

```typescript
// src/components/onboarding/OnboardingGuard.tsx
export function OnboardingGuard({ children }) {
  // Mesma lógica para internos e externos - ambos têm profiles
  const { data: profile, isLoading } = useQuery({
    queryKey: queryKeys.onboarding.check(user?.id),
    queryFn: async () => {
      // Query profiles - funciona para ambos os tipos
      return await supabase.from("profiles").select("onboarding_completed")...
    },
  });
  
  if (!profile?.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}
```

**Campos do onboarding (iguais para todos):**
- `first_name`, `last_name` (obrigatórios)
- `photo_url` (opcional)
- `birth_day`, `birth_month` (obrigatórios)
- `whatsapp_personal` (obrigatório)
- `discord_id`, `instagram_id` (opcionais)
- `city`, `state` (obrigatórios)

### BuProvider

Externos obtêm BUs via `partner_contact_bu_associations`, não `bu_user_memberships`.

```typescript
// src/contexts/BuContext.tsx
function BuProvider({ children }) {
  const { data: internalBus } = useUserBus();      // bu_user_memberships
  const { data: externalBus } = useExternalUserBus(); // partner_contact_bu_associations
  
  // Merge com prioridade para interno
  const userBus = mergeBuMemberships(internalBus, externalBus);
}
```

## RLS Policies

### Self-Service Access

Usuários externos precisam acessar seus próprios dados ANTES de ter contexto de BU.

```sql
-- Permite que externos vejam seu próprio registro
CREATE POLICY "partner_contacts_self_view" ON partner_contacts
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Permite que externos vejam suas associações
CREATE POLICY "partner_contact_bu_associations_self_view" 
ON partner_contact_bu_associations
FOR SELECT TO authenticated
USING (
  partner_contact_id IN (
    SELECT id FROM partner_contacts WHERE user_id = auth.uid()
  )
);
```

## Edge Functions

### Validação de Usuário Externo

```typescript
// request-magic-link/index.ts
async function getEmailBu(email: string) {
  // 1. Check partner_contacts first
  const { data: partnerContact } = await supabase
    .from("partner_contacts")
    .select(`id, external_company:external_companies(status)`)
    .eq("email", email.toLowerCase())
    .eq("status", "active")
    .maybeSingle();

  if (partnerContact?.partner_company?.status === 'active') {
    // Check for active BU associations
    const { data: associations } = await supabase
      .from("partner_contact_bu_associations")
      .select("id, bu:bu_units(name, status)")
      .eq("partner_contact_id", partnerContact.id)
      .eq("is_active", true);
    
    if (associations?.length > 0) {
      return { allowed: true, isPartnerContact: true };
    }
  }

  // 2. Continue with internal user check...
}
```

## UI Patterns

### Header/Avatar

```typescript
// src/components/layout/Header.tsx
function Header() {
  const { user } = useAuth();
  const { externalData, isExternal } = useExternalUser();
  
  // Display name resolution
  const displayName = isExternal
    ? externalData?.primaryContact?.name || 'Usuário Externo'
    : profile?.display_name || user?.email;
  
  // Avatar with fallback
  const photoUrl = isExternal ? null : profile?.photo_url;
  const initials = getInitials(displayName);
}
```

### Notification Center

```typescript
// Fallbacks para tipos não mapeados
const notificationType = notification.type || 'default';
const Icon = notificationIcons[notificationType] || notificationIcons.default;
const iconColor = notificationColors[notificationType] || notificationColors.default;
```

## Checklist de Implementação

Ao criar features que envolvem usuários:

- [ ] **Verificar se feature aplica a externos**
- [ ] **Usar hooks canônicos** (`useExternalUser`, `useUnifiedParticipant`)
- [ ] **Implementar bypass em guards** se apropriado
- [ ] **Fallbacks para dados ausentes** (externos não têm photo_url, team, etc.)
- [ ] **RLS policies self-service** para dados externos
- [ ] **Edge Functions validar ambos os tipos**

## Erros Comuns

### ❌ Erro: Tela branca para externos

**Causa**: Guard assume que todo usuário tem `profile`

**Solução**: Adicionar bypass para externos

```typescript
const { isExternal } = useExternalUser();
if (isExternal) return <>{children}</>;
```

### ❌ Erro: Dados não aparecem

**Causa**: Query usa `profiles.id` para externo

**Solução**: Usar `useUnifiedParticipant` ou verificar tipo antes

```typescript
const { participantId, isExternal } = useUnifiedParticipant();
// participantId é profile_id para interno, contact_id para externo
```

### ❌ Erro: Notification crash

**Causa**: Tipo de notificação não mapeado

**Solução**: Sempre ter fallback default

```typescript
const Icon = notificationIcons[type] || notificationIcons.default;
```

## Related Documentation

- [IDENTITY_CONVENTION.md](../IDENTITY_CONVENTION.md) - Convenção user_id vs profile_id
- [UNIFIED_PARTICIPANT_LAYER.md](./UNIFIED_PARTICIPANT_LAYER.md) - Camada unificada de participantes
- [DATA_MODEL_REGISTRY.md](./DATA_MODEL_REGISTRY.md) - Schema do banco
- [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) - Padrões de desenvolvimento
