

# Plano: Onboarding Unificado para Todos os Usuários

## Resumo

Simplificar o onboarding removendo a diferenciação entre internos e externos. Todos os usuários passarão pelo **mesmo fluxo** com os **mesmos campos**.

## Descoberta Técnica

O trigger `handle_new_user` (migração `20260130210014`) **já cria `profiles` para usuários externos** quando fazem login:

```sql
-- Linha 204 da migração
(CASE WHEN v_is_external THEN 'external' ELSE 'active' END)::employment_status
-- onboarding_completed = false (linha 206)
```

Isso significa que **não precisamos de nenhuma migração de banco**. A infraestrutura existente já suporta externos.

## Problema Atual

O `OnboardingGuard` contém um bypass incorreto baseado em documentação desatualizada:

```typescript
// src/components/onboarding/OnboardingGuard.tsx (linhas 57-61)
// COMENTÁRIO DESATUALIZADO: "External users do NOT have profiles"
if (isExternal) {
  return <>{children}</>;  // ← Pula onboarding indevidamente!
}
```

## Solução

Remover o bypass no `OnboardingGuard`. Externos passarão pela mesma lógica de internos.

## Mudanças Necessárias

| Arquivo | Mudança |
|---------|---------|
| `OnboardingGuard.tsx` | Remover bypass para externos |
| `EXTERNAL_USER_IDENTITY_PATTERN.md` | Atualizar documentação |

**Total: 2 arquivos modificados, ~10 linhas alteradas**

## Detalhes Técnicos

### 1. OnboardingGuard.tsx

Remover o bloco de bypass para externos (linhas 57-61):

```typescript
// REMOVER este bloco:
if (isExternal) {
  return <>{children}</>;
}
```

E atualizar o comentário do componente:

```typescript
/**
 * OnboardingGuard
 * 
 * Guards routes that require onboarding completion.
 * 
 * Both internal and external users have profiles created by handle_new_user trigger.
 * All users must complete onboarding before accessing protected routes.
 */
```

### 2. EXTERNAL_USER_IDENTITY_PATTERN.md

Atualizar seção "OnboardingGuard" para refletir que externos **PASSAM** pelo onboarding:

```markdown
### OnboardingGuard

Usuários externos **PASSAM** pelo fluxo de onboarding (possuem `profiles` criados pelo trigger).

// Externos usam a mesma lógica de onboarding que internos
// Todos os campos são iguais: nome, foto, aniversário, localização, WhatsApp, Discord, Instagram
```

## Fluxo Resultante (Unificado)

```text
Usuário acessa /auth
        │
        ▼
   Magic Link enviado
        │
        ▼
   /auth/callback
        │
        ▼
   handle_new_user trigger
   ├── Cria profile (employment_status = internal/external)
   ├── onboarding_completed = false
   └── Cria bu_user_membership
        │
        ▼
   OnboardingGuard
   └── profile.onboarding_completed = false?
       ├── SIM → Redirect /onboarding
       └── NÃO → Continua para dashboard
        │
        ▼
   /onboarding (3 steps - IGUAIS para todos)
   ├── Step 1: Dados Pessoais (nome, foto, aniversário)
   ├── Step 2: Contato & Redes (WhatsApp, Discord, Instagram)
   └── Step 3: Localização (cidade, estado)
        │
        ▼
   onboarding_completed = true
        │
        ▼
   /select-bu (ou dashboard se única BU)
```

## Campos do Onboarding (Iguais para Todos)

| Campo | Interno | Externo | Obrigatório |
|-------|:-------:|:-------:|:-----------:|
| `first_name` | ✅ | ✅ | Sim |
| `last_name` | ✅ | ✅ | Sim |
| `photo_url` | ✅ | ✅ | Não |
| `birth_day/month` | ✅ | ✅ | Sim |
| `whatsapp_personal` | ✅ | ✅ | Sim |
| `discord_id` | ✅ | ✅ | Não |
| `instagram_id` | ✅ | ✅ | Não |
| `city/state` | ✅ | ✅ | Sim |

## Vantagens

1. **Zero migrações de banco** — usa estrutura existente
2. **Mínimas mudanças de código** — apenas 2 arquivos
3. **Consistência total** — UX idêntica para todos os tipos de usuário
4. **Simplicidade** — menos código, menos branches, menos bugs
5. **Manutenibilidade** — um único fluxo para manter

## Testes Necessários

1. Usuário externo novo → Deve ir para /onboarding
2. Usuário externo completa onboarding → Vai para /select-bu ou dashboard
3. Todos os campos aparecem → Discord/Instagram visíveis para externos
4. Usuário interno → Comportamento inalterado
5. Upload de foto → Funciona para externos

