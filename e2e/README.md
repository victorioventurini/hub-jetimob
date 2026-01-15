# E2E Tests - Hub da Jet

Este diretório contém testes End-to-End (E2E) usando Playwright para validar fluxos críticos do Hub da Jet.

## Estrutura

```
e2e/
├── fixtures/           # Fixtures e dados de teste
│   ├── test-data.ts   # Dados compartilhados (usuários, rotas, etc.)
│   └── auth.fixture.ts # Helpers de autenticação
├── auth.spec.ts       # Testes de autenticação
├── navigation.spec.ts # Testes de navegação
├── okr-dashboard.spec.ts # Testes do dashboard OKR
├── okr-wizards.spec.ts   # Testes dos wizards OKR
├── accessibility.spec.ts # Testes de acessibilidade
├── responsive.spec.ts    # Testes de responsividade
└── performance.spec.ts   # Testes de performance
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

### Fluxos Testados
- ✅ Autenticação (login, validação, redirect)
- ✅ Navegação (rotas públicas/protegidas)
- ✅ Acessibilidade (WCAG básico)
- ✅ Responsividade (mobile, tablet, desktop)
- ✅ Performance (load time, errors)

### Fluxos Pendentes (requerem auth mock)
- 🔲 Dashboard OKR completo
- 🔲 Wizard de Check-in
- 🔲 Wizard de Criação de OKR
- 🔲 Preparação de Liderança

## Convenções

1. **Nomes de teste**: Descritivos em inglês
2. **Data-testid**: Usar para elementos críticos
3. **Fixtures**: Reutilizar dados de `test-data.ts`
4. **Skip**: Marcar testes que requerem auth com `.skip()`
