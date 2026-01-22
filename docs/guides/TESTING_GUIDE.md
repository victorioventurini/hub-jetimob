# Automated Testing Documentation

## Visão Geral

Este projeto implementa uma estratégia completa de testes automatizados seguindo o roadmap de 6 fases.

## Stack de Testes

| Tipo | Ferramenta | Propósito |
|------|------------|-----------|
| Unit | Vitest | Funções puras, utils, validações |
| Integration | Vitest + MSW | Hooks, React Query |
| Component | Vitest + Testing Library | Componentes React |
| E2E | Playwright | Fluxos críticos completos |

## Estrutura de Arquivos

```
src/
├── test/
│   ├── mocks/
│   │   ├── fixtures/     # Dados de teste (OKRs, profiles, teams, areas)
│   │   │   ├── okrs.ts
│   │   │   ├── profiles.ts
│   │   │   ├── teams.ts   # ⭐ Teams & Areas fixtures
│   │   │   └── index.ts
│   │   ├── handlers.ts   # MSW handlers para Supabase
│   │   └── supabase.ts   # Mock do cliente Supabase
│   ├── setup.ts          # Setup global do Vitest
│   └── test-utils.tsx    # Providers e helpers
├── lib/
│   └── queryKeys/
│       ├── *.ts          # Query keys centralizadas
│       ├── okrs.test.ts  # Testes de query keys OKRs
│       ├── teams.test.ts # ⭐ Testes de query keys Teams/Squads
│       └── areas.test.ts # ⭐ Testes de query keys Areas
└── modules/
    ├── okrs/
    │   ├── types/*.test.ts       # Testes de tipos
    │   ├── utils/*.test.ts       # Testes de validação
    │   ├── hooks/*.test.ts       # Testes de hooks
    │   └── components/*.test.tsx # Testes de componentes
    ├── teams/
    │   └── hooks/useTeams.test.ts # ⭐ Testes de times + area_id
    └── areas/
        └── hooks/useAreas.test.ts # ⭐ Testes de áreas

e2e/
├── fixtures/             # Fixtures E2E
├── *.spec.ts            # Testes Playwright
└── README.md            # Docs E2E
```

## Comandos

```bash
# Unit/Integration tests
npm run test              # Watch mode
npm run test -- --run     # Single run
npm run test -- --coverage # Com cobertura

# E2E tests
npx playwright test       # Todos os testes
npx playwright test --ui  # Modo interativo
npx playwright show-report # Relatório HTML

# Lint e Type check
npm run lint
npx tsc --noEmit
```

## CI/CD Workflows

### `.github/workflows/test.yml`
- **Trigger**: Push/PR para `main` ou `develop`
- **Jobs**:
  1. `unit-tests`: Vitest com cobertura
  2. `e2e-tests`: Playwright (após unit tests)
  3. `lint`: ESLint
  4. `type-check`: TypeScript

### `.github/workflows/test-quick.yml`
- **Trigger**: Push para branches de feature
- **Jobs**: Unit tests + type check (sem E2E)

## Metas de Cobertura

| Área | Meta | Prioridade |
|------|------|------------|
| Pure Utils | 90% | Alta |
| Validation Logic | 85% | Alta |
| Business Hooks | 80% | Alta |
| Components | 70% | Média |
| E2E Flows | Critical paths | Alta |

## Fixtures e Mocks

### OKR Fixtures (`src/test/mocks/fixtures/okrs.ts`)
```typescript
import { FIXTURES } from '@/test/mocks/fixtures/okrs';

// KRs
FIXTURES.healthyKr
FIXTURES.atRiskKr
FIXTURES.criticalKr

// Iniciativas
FIXTURES.onTrackInitiative
FIXTURES.lateInitiative

// Ciclos
FIXTURES.currentCycle
FIXTURES.pastCycle
```

### Teams & Areas Fixtures (`src/test/mocks/fixtures/teams.ts`) ⭐ NOVO
```typescript
import { 
  createMockArea, 
  createMockTeam,
  createMockAreaFormData,
  createMockTeamFormData,
  AREAS_FIXTURES,
  TEAMS_FIXTURES 
} from '@/test/mocks/fixtures';

// Criar área com valores customizados
const area = createMockArea({
  id: 'area-revenue',
  name: 'Revenue',
  color: '#22C55E',
  leader_user_id: 'user-123',
});

// Criar time com area_id
const team = createMockTeam({
  id: 'team-sales',
  name: 'Sales',
  area_id: 'area-revenue',
  member_count: 8,
});

// Fixtures pré-definidas
AREAS_FIXTURES.revenue   // Área Revenue
AREAS_FIXTURES.product   // Área Produto
AREAS_FIXTURES.technology // Área Tecnologia

TEAMS_FIXTURES.engineering // Time Engineering (area: technology)
TEAMS_FIXTURES.sales       // Time Sales (area: revenue)
TEAMS_FIXTURES.frontend    // Sub-time Frontend (parent: engineering)
```


### MSW Handlers (`src/test/mocks/handlers.ts`)
```typescript
import { handlers } from '@/test/mocks/handlers';

// Usa com MSW
setupServer(...handlers);
```

## Padrões de Teste

### Unit Test
```typescript
import { describe, it, expect } from 'vitest';
import { validateKrTitle } from './krValidation';

describe('validateKrTitle', () => {
  it('should reject empty titles', () => {
    const result = validateKrTitle('');
    expect(result.isValid).toBe(false);
  });
});
```

### Hook Test
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

it('should fetch data', async () => {
  const { result } = renderHook(() => useMyHook(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

### Component Test
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

it('should handle click', () => {
  const onClick = vi.fn();
  render(<MyComponent onClick={onClick} />);
  fireEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalled();
});
```

### E2E Test
```typescript
import { test, expect } from '@playwright/test';

test('should complete flow', async ({ page }) => {
  await page.goto('/auth');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
});
```

## Troubleshooting

### Testes falhando por timeout
- Aumentar timeout em `vitest.config.ts`
- Verificar se MSW está configurado corretamente

### Erros de tipo em mocks
- Usar `Partial<T>` para mocks parciais
- Verificar se fixtures estão atualizadas com tipos

### E2E falhando por auth
- Testes que requerem auth devem usar `.skip()` até auth mock estar pronto
- Usar fixtures de auth quando disponível
