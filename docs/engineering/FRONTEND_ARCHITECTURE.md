# Frontend Architecture — Hub da Jet

> **Status:** canônico • **Última atualização:** 2026-04-22
>
> Este documento define **onde colocar cada tipo de código** no frontend. Em caso de dúvida, consulte aqui antes de criar arquivos.

---

## 1. Estrutura de diretórios

```
src/
├── App.tsx                  # Bootstrap + providers
├── main.tsx
├── routes/                  # Definição de rotas por área (lazy-loaded)
│
├── integrations/
│   └── supabase/            # AUTO-GERADO — não editar
│       ├── client.ts
│       └── types.ts
│
├── components/              # Componentes COMPARTILHADOS por mais de 1 módulo
│   ├── ui/                  # shadcn/ui (não modificar diretamente)
│   ├── layout/              # HubLayout, PageHeader, Breadcrumbs
│   ├── selects/             # Selects de domínio reutilizáveis (BuUserSelect, TeamSelect)
│   ├── auth/                # ProtectedRoute, ModuleRoute, BuRequiredRoute
│   ├── notifications/       # NotificationBell, NotificationCenter
│   ├── mentions/            # MentionInput
│   └── ...
│
├── hooks/                   # Hooks TRANSVERSAIS (auth, identidade, BU, permissões)
│   ├── useAuth.tsx
│   ├── useIdentity.ts
│   ├── useBuScope.ts
│   ├── usePermissions.ts
│   ├── useModuleAccess.ts
│   └── useDebounce.ts       # Utilitários genéricos
│
├── lib/                     # Utilidades puras (sem React, sem Supabase)
│   ├── queryKeys/           # SSOT de query keys (1 arquivo por domínio)
│   ├── analytics/
│   ├── utils.ts             # cn() do shadcn
│   ├── colors.ts, phone.ts, idTypes.ts
│   └── ...
│
├── shared/                  # Tipos, constantes e helpers compartilhados POR DOMÍNIO
│   ├── types/               # BuId, UserId, ProfileSummary, RitualStatus
│   ├── constants/           # Constantes transversais (units, status colors)
│   ├── filters/             # Filtros de URL state padronizados
│   ├── query/               # Helpers de TanStack Query
│   └── url/
│
├── modules/                 # FEATURE MODULES — código específico de domínio
│   └── <module>/
│       ├── components/      # Componentes EXCLUSIVOS do módulo
│       ├── hooks/           # Hooks EXCLUSIVOS do módulo
│       ├── pages/           # Páginas (rotas) do módulo
│       ├── types.ts         # Tipos exclusivos do módulo
│       ├── constants/       # Constantes exclusivas do módulo
│       └── utils/
│
└── pages/                   # Páginas globais (Index, NotFound, AuthCallback, PublicAsset)
```

---

## 2. Decisão: onde colocar?

### 2.1 Hooks

| Pergunta | Resposta | Local |
|----------|----------|-------|
| O hook é usado por 2+ módulos diferentes? | Sim | `src/hooks/` |
| O hook é usado apenas dentro de 1 módulo? | Sim | `src/modules/<m>/hooks/` |
| O hook lida com auth, identidade, BU, permissões, layout global? | Sim | `src/hooks/` (sempre) |
| O hook é puro utilitário (debounce, mobile)? | Sim | `src/hooks/` |

**Exemplos:**
- ✅ `useAuth`, `useIdentity`, `useBuScope` → `src/hooks/`
- ✅ `useOkrCycle`, `useTeamObjectives` → `src/modules/okrs/hooks/`
- ✅ `useTickets`, `useTicketMessages` → `src/modules/tickets/hooks/`
- ❌ `useHomeData` em `src/hooks/` → mover para `src/modules/home/hooks/`

### 2.2 Componentes

| Tipo | Local |
|------|-------|
| shadcn/ui (button, dialog, input...) | `src/components/ui/` |
| Layout global (HubLayout, PageHeader) | `src/components/layout/` |
| Select reutilizável de domínio (BuUserSelect, TeamSelect, AreaSelect) | `src/components/selects/` |
| Componente exclusivo de 1 módulo | `src/modules/<m>/components/` |
| Wrapper de auth/permissão | `src/components/auth/` |

**Regra:** Se um componente vive em `src/modules/<m>/components/` e passou a ser usado por outro módulo, **mova para `src/components/`** com props padronizadas.

### 2.3 Tipos

| Tipo | Local |
|------|-------|
| Tipos primitivos transversais (BuId, UserId, ProfileSummary) | `src/shared/types/` |
| Tipos auto-gerados do Supabase | `src/integrations/supabase/types.ts` (não editar) |
| Tipos exclusivos do módulo (Objective, KeyResult, Ritual) | `src/modules/<m>/types.ts` |
| Tipos de framework (wizards, filtros) | `src/shared/types/` ou `src/modules/<m>/types/` |

### 2.4 Constantes

| Tipo | Local |
|------|-------|
| Constantes transversais (UNITS, STATUS_COLORS, dialog sizes) | `src/shared/constants/` |
| Mensagens de validação/erro genéricas | `src/lib/validationMessages.ts`, `src/lib/errorMessages.ts` |
| Constantes exclusivas de 1 módulo (RITUAL_LABELS, KR_TYPES) | `src/modules/<m>/constants/` |

### 2.5 Utilities

| Tipo | Local |
|------|-------|
| Pura função, sem React/Supabase (cn, formatPhone, parseColor) | `src/lib/` |
| Função que depende de 1 módulo | `src/modules/<m>/utils/` |
| Helpers de TanStack Query | `src/shared/query/` |
| Query keys | `src/lib/queryKeys/<dominio>.ts` |

---

## 3. Regras inquebráveis

1. **Nunca importe de `src/integrations/supabase/types.ts` para tipos manuais.** Esse arquivo é regenerado e seus edits serão perdidos. Crie tipos derivados em `src/shared/types/` quando necessário.
2. **Query keys SOMENTE de `src/lib/queryKeys/`.** Nunca declare arrays de query key inline em hooks.
3. **Componentes em `src/components/ui/`** são shadcn — nunca modifique diretamente. Crie wrappers em `src/components/` se precisar customizar.
4. **Hooks de domínio NÃO vivem em `src/hooks/`.** Se você criar um hook que mexe com OKRs/Tickets/Rituais, ele vai para o módulo respectivo.
5. **`src/lib/` não importa de `src/modules/`.** Garante grafo de dependências limpo.
6. **`src/shared/` não importa de `src/modules/`.** Mesma regra.
7. **`src/modules/A/` raramente importa de `src/modules/B/`.** Se acontecer, o código compartilhado deve subir para `src/components/`, `src/hooks/` ou `src/shared/`.

---

## 4. Adição de um novo módulo

```bash
src/modules/<novo-modulo>/
├── components/
├── hooks/
├── pages/
├── types.ts        # tipos do domínio
├── constants/      # se houver
└── utils/          # se houver
```

E:
- Crie `src/lib/queryKeys/<novo-modulo>.ts` para as query keys
- Crie `src/routes/<novo-modulo>.routes.tsx` com lazy imports
- Registre as rotas em `src/App.tsx`

---

## 5. Anti-padrões observados (para evitar)

| Anti-padrão | Correção |
|-------------|----------|
| Hook de domínio em `src/hooks/` | Mover para `src/modules/<m>/hooks/` |
| `types.ts` por módulo com tipos duplicados (`type Profile = ...`) | Consolidar em `src/shared/types/` |
| Constants inline em components (`const COLORS = {...}`) | Mover para `src/shared/constants/` ou `src/modules/<m>/constants/` |
| Select de domínio em `src/modules/<m>/components/` usado por outros módulos | Mover para `src/components/selects/` |
| `import { ... } from '@/modules/A/...'` dentro de `src/modules/B/` | Subir o código compartilhado |

---

**Validação:** Após qualquer movimentação, rodar `npx tsc --noEmit`. Se passar, está OK.
