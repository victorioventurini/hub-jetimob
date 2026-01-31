# E2E Tests - Hub da Jet

Este diretório contém testes End-to-End (E2E) usando Playwright para validar fluxos críticos do Hub da Jet.

## Estrutura

```
e2e/
├── fixtures/               # Fixtures e dados de teste
│   ├── test-data.ts       # Dados compartilhados (usuários, rotas, etc.)
│   └── auth.fixture.ts    # Helpers de autenticação
├── accessibility.spec.ts   # Testes de acessibilidade
├── assets.spec.ts         # Testes do módulo Assets
├── auth.spec.ts           # Testes de autenticação
├── integrations.spec.ts   # Testes de Integrações e AI Agents
├── kpis.spec.ts           # Testes do módulo KPIs
├── navigation.spec.ts     # Testes de navegação
├── okr-dashboard.spec.ts  # Testes do dashboard OKR (legacy)
├── okr-wizards.spec.ts    # Testes dos wizards OKR
├── okrs.spec.ts           # Testes abrangentes de OKRs
├── performance.spec.ts    # Testes de performance
├── responsive.spec.ts     # Testes de responsividade
├── teams.spec.ts          # Testes de Times e Organograma
├── tickets.spec.ts        # Testes do módulo Tickets
└── users.spec.ts          # Testes de gerenciamento de Usuários
```

## Executando Testes

### Todos os testes
```bash
npx playwright test
```

### Testes específicos
```bash
npx playwright test auth.spec.ts
npx playwright test --grep "Authentication"
```

### Modo interativo
```bash
npx playwright test --ui
```

### Debug
```bash
npx playwright test --debug
```

### Relatório HTML
```bash
npx playwright show-report
```

## Configuração

O arquivo `playwright.config.ts` na raiz define:
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome
- Base URL: http://localhost:5173
- Screenshots em falhas
- Traces para retry

## Cobertura

### Cobertura Atual: ~70%

| Módulo | Spec File | Status |
|--------|-----------|--------|
| Auth | `auth.spec.ts` | ✅ |
| Navigation | `navigation.spec.ts` | ✅ |
| OKRs | `okrs.spec.ts`, `okr-*.spec.ts` | ✅ |
| KPIs | `kpis.spec.ts` | ✅ |
| Tickets | `tickets.spec.ts` | ✅ |
| Assets | `assets.spec.ts` | ✅ |
| Teams | `teams.spec.ts` | ✅ |
| Users | `users.spec.ts` | ✅ |
| Integrations | `integrations.spec.ts` | ✅ |
| Accessibility | `accessibility.spec.ts` | ✅ |
| Responsive | `responsive.spec.ts` | ✅ |
| Performance | `performance.spec.ts` | ✅ |

### Fluxos Pendentes (requerem auth mock)
- 🔲 Testes autenticados end-to-end
- 🔲 Wizard de Check-in completo
- 🔲 Fluxos de CRUD com dados reais

## Convenções

1. **Nomes de teste**: Descritivos em inglês
2. **Data-testid**: Usar para elementos críticos
3. **Fixtures**: Reutilizar dados de `test-data.ts`
4. **Skip**: Marcar testes que requerem auth com `.skip()`
5. **Routes**: Usar constantes de `ROUTES` em `test-data.ts`
