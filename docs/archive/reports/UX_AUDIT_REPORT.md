# Auditoria Global de UX — Hub Jetimob

**Data:** Janeiro 2026  
**Versão:** 1.0  
**Status:** Em análise

---

## Sumário Executivo

Esta auditoria avaliou a experiência do usuário em toda a plataforma Hub Jetimob, identificando pontos fortes e oportunidades de melhoria em 8 dimensões críticas. O Hub já possui uma **fundação sólida** de componentes canônicos e padrões de desenvolvimento, mas há lacunas na consistência de aplicação e na experiência de recuperação de erros.

### Diagnóstico Geral

| Dimensão | Status | Nota |
|----------|--------|------|
| Navegação e Orientação | 🟡 Parcial | Breadcrumbs inconsistentes entre módulos |
| Estados de Erro | 🟢 Bom | Componentes existem, falta cobertura |
| Feedback Visual | 🟢 Bom | Padrões sólidos, alguns gaps |
| Tooltips e Ajuda | 🟡 Parcial | Presente em OKRs, ausente em outros |
| Consistência de Componentes | 🟢 Bom | Canônicos bem definidos |
| Fluxos Críticos | 🟡 Parcial | Wizards excelentes, transições fracas |
| Copy e IA | 🟡 Parcial | Vic bem estruturado, pouco usado |
| Padrões Globais | 🟢 Bom | Documentação forte, checklist incompleto |

---

## 1. Navegação, Orientação e Senso de Lugar

### 1.1 Estado Atual

#### ✅ Pontos Fortes
- **PageHeader canônico** (`src/components/ui/page-header.tsx`) usado consistentemente
- **OkrBreadcrumb** especializado com presets para visões org/team
- **Página 404** bem implementada com contexto (rota tentada, BU atual)
- **URL State** padronizado para filtros e tabs

#### 🚨 Problemas Identificados

| Problema | Impacto | Módulos Afetados |
|----------|---------|------------------|
| Breadcrumbs ausentes em páginas de detalhe | Usuário perde contexto hierárquico | Tickets, Assets, Users |
| Padrão de breadcrumb inconsistente | Confusão sobre onde está | OKRs usa `OkrBreadcrumb`, outros não têm |
| "Voltar" usa `navigate(-1)` cegamente | Pode levar a lugar inesperado | Formulários, wizards |
| Deep links quebram contexto de BU | Erro 403/404 sem explicação clara | Todos os módulos |

#### 📋 Inventário de Breadcrumbs por Módulo

| Módulo | Tem Breadcrumb | Padrão |
|--------|----------------|--------|
| OKRs | ✅ Sim | `OkrBreadcrumb` (Hub → OKRs → [Contexto]) |
| Teams | ❌ Não | Apenas PageHeader |
| Tickets | ❌ Não | Apenas PageHeader |
| Assets | ❌ Não | Apenas PageHeader |
| KPIs | ❌ Não | Apenas PageHeader |
| Users | ❌ Não | Apenas PageHeader |
| Wizards | ✅ Sim | Stepper lateral (adequado) |

### 1.2 Recomendações

#### Quick Wins (< 1 sprint)
1. **Criar `GlobalBreadcrumb` component** com padrão: `Hub → [Módulo] → [Página] → [Detalhe]`
2. **Adicionar breadcrumbs** em páginas de detalhe de Tickets, Assets e Users
3. **Implementar `useSafeBack()` hook** com fallback hierárquico

#### Estruturais (1-2 sprints)
4. **Criar `ModuleLayout` wrapper** que inclui breadcrumb automaticamente
5. **Definir hierarquia de rotas** por módulo no roteador

### 1.3 Proposta: `useSafeBack` Hook

```typescript
/**
 * Hook para navegação "voltar" com fallback hierárquico
 * Evita becos sem saída quando history.back() não é seguro
 */
export function useSafeBack(options?: {
  moduleRoot?: string;  // ex: '/okrs'
  fallback?: string;    // ex: '/'
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { buSelected } = useBu();
  
  return useCallback(() => {
    // 1. Tentar history.back() se há histórico interno
    if (window.history.length > 2 && document.referrer.includes(window.location.origin)) {
      navigate(-1);
      return;
    }
    
    // 2. Fallback para raiz do módulo
    if (options?.moduleRoot) {
      navigate(options.moduleRoot);
      return;
    }
    
    // 3. Fallback para home (com ou sem BU)
    navigate(buSelected ? '/' : '/select-bu');
  }, [navigate, buSelected, options?.moduleRoot]);
}
```

---

## 2. Estados de Erro e UX Resiliente

### 2.1 Estado Atual

#### ✅ Pontos Fortes
- **ErrorState** (`src/components/ui/error-state.tsx`) com botões Voltar/Retry
- **ErrorBoundary** global captura crashes de runtime
- **NotFound** página 404 com ilustração e ações claras
- **RequirePermission** guard com fallback visual

#### 🚨 Problemas Identificados

| Problema | Cenário | Consequência |
|----------|---------|--------------|
| Erro de permissão genérico | Usuário sem acesso a módulo | "Acesso negado" sem orientação |
| Recurso deletado | Deep link para OKR removido | 404 genérico, confuso |
| BU errada no deep link | Link de outra BU | Erro 403 ou dados vazios |
| Loading infinito em erro de rede | Conexão instável | Tela "travada" |
| Erro de validação sem contexto | Form inválido | "Erro" sem explicar qual campo |

#### 📋 Cobertura de Estados de Erro

| Cenário | Componente Existe | Usado Consistentemente |
|---------|-------------------|------------------------|
| Lista vazia | `EmptyState` | ✅ Sim |
| Erro de carregamento | `ErrorState` | 🟡 Parcial (nem todas as pages) |
| Recurso não encontrado | `NotFound` (página) | 🟡 Só para rotas |
| Sem permissão | `RequirePermission` | ✅ Sim |
| Erro de rede | Não padronizado | ❌ Não |
| Validação de form | `react-hook-form` | 🟡 Inconsistente |

### 2.2 Recomendações

#### Quick Wins
1. **Criar `ResourceNotFoundState`** para recursos deletados/inacessíveis
2. **Criar `NetworkErrorState`** com retry automático
3. **Padronizar mensagens de erro de validação** via Vic (`revisor-comunicacao`)

#### Estruturais
4. **Criar `BuContextErrorState`** para deep links com BU errada
5. **Implementar `useQueryWithRetry`** com backoff exponencial

### 2.3 Proposta: Componentes de Erro Especializados

```typescript
// ResourceNotFoundState - Quando o recurso existia mas foi removido
export function ResourceNotFoundState({
  resourceType,  // "objetivo", "ticket", "ativo"
  resourceId,
  moduleRoot,
}: ResourceNotFoundStateProps) {
  const safeBack = useSafeBack({ moduleRoot });
  
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Ghost className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">
        Este {resourceType} não existe mais
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md text-center">
        O {resourceType} que você tentou acessar foi removido ou você não tem 
        permissão para visualizá-lo.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={safeBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={() => navigate(moduleRoot)}>
          Ver todos os {resourceType}s
        </Button>
      </div>
    </div>
  );
}
```

---

## 3. Feedback Visual e Microinterações

### 3.1 Estado Atual

#### ✅ Pontos Fortes
- **Skeleton loaders** padronizados (`LoadingState`, `SkeletonTable`)
- **Toast notifications** via Sonner (feedback de ações)
- **Status badges** com cores semânticas
- **Progress bars** em OKRs

#### 🚨 Problemas Identificados

| Problema | Exemplo | Impacto |
|----------|---------|---------|
| Botões sem feedback de loading | "Salvar" em forms | Cliques múltiplos |
| Ações silenciosas | Toggle de checkbox em tabela | Usuário não sabe se funcionou |
| Hover inconsistente | Alguns links mudam cor, outros não | Quebra expectativa |
| Focus ring ausente | Inputs em alguns módulos | Acessibilidade |
| Empty states genéricos | "Nenhum resultado" sem ação | Não orienta |

### 3.2 Recomendações

#### Quick Wins
1. **Adicionar `isLoading` a todos os botões de submit** (já existe no Button)
2. **Garantir toast em toda ação de mutação** (create, update, delete)
3. **Padronizar empty states com ação** orientada ao contexto

#### Estruturais
4. **Auditoria de acessibilidade** (focus, contrast)
5. **Criar variants de EmptyState** por contexto (busca, filtro, primeiro uso)

### 3.3 Proposta: EmptyState Contextual

```typescript
// Variants para diferentes contextos
export function EmptyState({ variant, ...props }: EmptyStateProps) {
  const variants = {
    search: {
      icon: SearchX,
      title: "Nenhum resultado encontrado",
      description: "Tente ajustar os termos da busca ou remover alguns filtros.",
      actionLabel: "Limpar busca",
    },
    filter: {
      icon: FilterX,
      title: "Nenhum item corresponde aos filtros",
      description: "Experimente combinar menos filtros ou expandir o período.",
      actionLabel: "Limpar filtros",
    },
    firstUse: {
      icon: Sparkles,
      title: "Ainda não há nada aqui",
      description: "Este é o começo de algo incrível. Que tal criar o primeiro?",
      actionLabel: "Criar primeiro",
    },
    noPermission: {
      icon: Lock,
      title: "Você não tem acesso a este conteúdo",
      description: "Fale com seu líder ou administrador para solicitar acesso.",
      actionLabel: null, // Sem ação
    },
  };
  
  const config = variants[variant] || variants.firstUse;
  // ...
}
```

---

## 4. Tooltips e Ajuda Contextual

### 4.1 Estado Atual

#### ✅ Pontos Fortes
- **Tooltip component** baseado em Radix UI
- **UserHoverCard** para informações de pessoas
- **ReflectionQuestions** para orientação em wizards
- **VicInsightCard** para insights proativos da IA

#### 🚨 Problemas Identificados

| Problema | Onde | Exemplo |
|----------|------|---------|
| Campos técnicos sem explicação | Forms de KPIs | "Threshold" sem tooltip |
| Siglas não explicadas | OKRs, KRs, p.p. | Assumem conhecimento prévio |
| Ações destrutivas sem confirmação | Alguns deletes | Click e já era |
| Conceitos complexos | Modelos de responsabilidade | Sem helper text |

### 4.2 Recomendações

#### Quick Wins
1. **Mapear campos que precisam tooltip** (todos com termos técnicos)
2. **Criar glossário de termos** acessível via `?` global
3. **Adicionar helper text** abaixo de campos complexos

#### Estruturais
4. **Integrar Vic para ajuda contextual** (chat aberto no ponto de dúvida)
5. **Criar `HelpTooltip` component** padronizado com ícone `HelpCircle`

### 4.3 Proposta: HelpTooltip Padronizado

```typescript
/**
 * Tooltip de ajuda padronizado com ícone HelpCircle
 * Uso: <HelpTooltip content="Explicação do campo" />
 */
export function HelpTooltip({ 
  content, 
  side = "top",
  className,
}: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle 
            className={cn(
              "h-4 w-4 text-muted-foreground cursor-help",
              className
            )} 
          />
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

## 5. Consistência de Componentes

### 5.1 Estado Atual

#### ✅ Pontos Fortes
- **Componentes canônicos bem definidos** em `src/components/ui/`
- **Documentação de padronização** (`COMPONENT_STANDARDIZATION_REPORT.md`)
- **Selects unificados** (`BuUserSelect`, `TeamSelect`, etc.)
- **Guards de permissão** consistentes

#### 🚨 Problemas Identificados (via relatório existente)

| Problema | Status | Ação |
|----------|--------|------|
| Headers inline em Profile/UserProfile | ⏳ Wave 3 pendente | Migrar para PageHeader |
| `MultiUserSelect` deprecated | ⚠️ Deprecado | Migrar para `BuUserMultiSelect` |
| Mensagens de erro de form inconsistentes | 🟡 Parcial | Padronizar via Zod |

### 5.2 Recomendações

#### Quick Wins
1. **Concluir Wave 3 de migração** (headers inline)
2. **Remover componentes deprecated** após migração
3. **Criar lint rule** para prevenir uso de deprecated

#### Estruturais
4. **Storybook ou docs de componentes** para visualização
5. **Testes visuais** (Chromatic ou similar)

---

## 6. Fluxos Críticos e Redução de Fricção

### 6.1 Estado Atual

#### ✅ Pontos Fortes
- **Wizards de OKRs** exemplares (10 passos bem guiados)
- **Persistência de rascunho** (localStorage + DB)
- **URL state** permite compartilhar progresso
- **Stepper lateral** com indicador de progresso

#### 🚨 Problemas Identificados

| Fluxo | Problema | Impacto |
|-------|----------|---------|
| Troca de BU | Modal de confirmação genérico | Ansiedade sobre perder contexto |
| Primeiro acesso | Sem onboarding guiado | Usuário perdido |
| Criação de ticket | Form longo sem validação inline | Frustração ao final |
| Edição de OKR | Saída sem salvar não avisa | Perda de trabalho |

### 6.2 Recomendações

#### Quick Wins
1. **Adicionar `beforeunload` warning** em forms com dirty state
2. **Validação inline** em campos obrigatórios (onBlur)
3. **Melhorar modal de troca de BU** com contexto

#### Estruturais
4. **Onboarding wizard** para novos usuários
5. **Command palette** (⌘K) para navegação rápida

---

## 7. Copy, Tom de Voz e Uso de IA

### 7.1 Estado Atual

#### ✅ Pontos Fortes
- **Vic bem definido** com persona clara (direto, humano, sem firulas)
- **Agentes especializados** (coach-okrs, cultura, revisor-comunicacao)
- **Padrão de primeiro nome** para saudações
- **VicInsightCard** para feedback proativo

#### 🚨 Problemas Identificados

| Problema | Exemplo | Agente que Deveria Atuar |
|----------|---------|--------------------------|
| Mensagens de erro técnicas | "Foreign key violation" | `revisor-comunicacao` |
| Títulos genéricos | "Erro" sem contexto | `vic-persona` |
| Empty states frios | "Nenhum dado" | `cultura` |
| Onboarding inexistente | - | `onboarding-buddy` |

#### 📋 Uso de Agentes por Área

| Área | Agente Usado | Poderia Usar |
|------|--------------|--------------|
| Dashboard home | `cultura` (VicCard) | ✅ Adequado |
| Wizards OKR | `coach-okrs`, `revisor-comunicacao` | ✅ Adequado |
| Páginas de erro | Nenhum | `vic-persona` |
| Empty states | Nenhum | `cultura` |
| Validação de forms | Nenhum | `revisor-comunicacao` |
| Notificações | Nenhum | `vic-persona` |

### 7.2 Recomendações

#### Quick Wins
1. **Humanizar mensagens de erro** usando `revisor-comunicacao`
2. **Adicionar copy inspiracional** em empty states via `cultura`
3. **Revisar todos os textos de botão** (verbos de ação claros)

#### Estruturais
4. **Criar `useHumanizedError()`** hook que traduz erros técnicos
5. **Implementar onboarding** com `onboarding-buddy`
6. **Revisar toda copy** de headers, descrições e ações

### 7.3 Proposta: Humanização de Erros

```typescript
/**
 * Hook para humanizar mensagens de erro usando Vic
 * Transforma erros técnicos em mensagens amigáveis
 */
export function useHumanizedError() {
  const { invokeVic } = useVic();
  
  const humanize = useCallback(async (error: Error | string) => {
    const errorText = typeof error === 'string' ? error : error.message;
    
    // Cache para erros comuns
    const cached = ERROR_CACHE[errorText];
    if (cached) return cached;
    
    // Para erros conhecidos, usar mapeamento local
    const mapped = ERROR_MAP[errorText];
    if (mapped) return mapped;
    
    // Para erros desconhecidos, usar Vic
    const response = await invokeVic(
      'revisor-comunicacao',
      'humanize-error',
      { errorText },
      'Transforme esta mensagem de erro técnica em algo amigável para o usuário.'
    );
    
    return response.response || 'Algo deu errado. Tente novamente.';
  }, [invokeVic]);
  
  return { humanize };
}

// Mapeamento local de erros comuns (sem precisar de IA)
const ERROR_MAP: Record<string, string> = {
  'Network request failed': 'Parece que você está sem conexão. Verifique sua internet e tente novamente.',
  'foreign key violation': 'Este item está vinculado a outros registros e não pode ser removido.',
  'duplicate key': 'Já existe um registro com essas informações.',
  'unauthorized': 'Você precisa estar logado para fazer isso.',
  'forbidden': 'Você não tem permissão para esta ação.',
};
```

---

## 8. Regras e Padrões Globais de UX

### 8.1 Princípios Consolidados

```
1. Toda tela precisa ter saída clara.
2. Nenhum erro sem ação possível.
3. Nenhuma ação importante sem feedback.
4. UX quebrada é bug, não detalhe.
5. Nunca culpar o usuário.
6. Preferir orientação a instrução.
7. O sistema deve ser resiliente a imprevistos.
```

### 8.2 Checklist de UX para PRs

```markdown
## Checklist de UX

### Navegação
- [ ] Breadcrumb presente em páginas de detalhe
- [ ] Botão "Voltar" usa `useSafeBack()` com fallback
- [ ] Links usam `<Link>` (não `onClick` + `navigate`)

### Estados
- [ ] Loading state enquanto carrega dados
- [ ] Empty state quando lista vazia (com ação)
- [ ] Error state com retry/voltar
- [ ] Validação inline em forms

### Feedback
- [ ] Toast após ações de mutação (create/update/delete)
- [ ] Botões de submit mostram loading
- [ ] Ações destrutivas têm confirmação

### Acessibilidade
- [ ] Focus ring visível em interativos
- [ ] Contraste mínimo WCAG AA
- [ ] Labels em todos os inputs
- [ ] Alt text em imagens

### Copy
- [ ] Mensagens de erro humanizadas
- [ ] Títulos claros e orientados à ação
- [ ] Textos revisados por Vic (quando aplicável)
```

### 8.3 Componentes Canônicos de UX

| Componente | Uso | Localização |
|------------|-----|-------------|
| `PageHeader` | Header de página com título e ações | `src/components/ui/page-header.tsx` |
| `EmptyState` | Lista vazia com orientação | `src/components/ui/empty-state.tsx` |
| `ErrorState` | Erro com retry/voltar | `src/components/ui/error-state.tsx` |
| `LoadingState` | Carregamento com spinner | `src/components/ui/loading-state.tsx` |
| `Skeleton` | Placeholder de conteúdo | `src/components/ui/skeleton.tsx` |
| `Tooltip` | Dica curta | `src/components/ui/tooltip.tsx` |
| `HelpTooltip` | Ajuda com ícone ? | `src/components/ui/help-tooltip.tsx` ✅ |
| `GlobalBreadcrumb` | Navegação hierárquica | `src/components/ui/global-breadcrumb.tsx` ✅ |
| `ResourceNotFoundState` | Recurso deletado/inacessível | `src/components/ui/resource-not-found-state.tsx` ✅ |
| `useSafeBack` | Hook de voltar com fallback | `src/hooks/useSafeBack.ts` ✅ |
| `getHumanizedError` | Humanização de erros | `src/lib/errorMessages.ts` ✅ |

---

## 9. Plano de Implementação

### Fase 1: Quick Wins (1 sprint)

| Item | Esforço | Impacto |
|------|---------|---------|
| Criar `HelpTooltip` component | P | Alto |
| Criar `useSafeBack()` hook | P | Alto |
| Adicionar toasts faltantes em mutações | M | Alto |
| Humanizar 10 mensagens de erro mais comuns | P | Médio |
| Revisar empty states existentes | M | Médio |

### Fase 2: Consistência (2 sprints)

| Item | Esforço | Impacto |
|------|---------|---------|
| Criar `GlobalBreadcrumb` component | M | Alto |
| Adicionar breadcrumbs em Tickets, Assets, Users | M | Alto |
| Criar `ResourceNotFoundState` | P | Médio |
| Implementar `useQueryWithRetry` | M | Médio |
| Concluir Wave 3 de migração de headers | M | Médio |

### Fase 3: Excelência (2-3 sprints)

| Item | Esforço | Impacto |
|------|---------|---------|
| Onboarding wizard para novos usuários | G | Alto |
| Command palette (⌘K) | G | Alto |
| Integração de Vic em empty states | M | Médio |
| Auditoria de acessibilidade completa | G | Alto |
| Storybook de componentes | G | Médio |

### Legenda
- **P**: Pequeno (< 4h)
- **M**: Médio (4-16h)
- **G**: Grande (> 16h)

---

## 10. Métricas de Sucesso

| Métrica | Baseline | Meta |
|---------|----------|------|
| % de páginas com breadcrumb | ~30% | > 90% |
| Erros sem ação de recuperação | Não medido | 0 |
| Cobertura de empty states orientados | ~50% | > 95% |
| Tempo médio de recuperação de erro | Não medido | < 5s |
| NPS de usabilidade (survey) | Não medido | > 40 |

---

## Anexos

### A. Inventário de Componentes de UX

Ver `docs/engineering/COMPONENT_STANDARDIZATION_REPORT.md`

### B. Guia de Estilo de Copy

Ver `docs/engineering/DEVELOPMENT_STANDARDS.md` seção K (Padrões de Nome e Saudações)

### C. Catálogo de Agentes de IA

Ver `src/modules/vic/types.ts` (VIC_AGENTS)

---

*Documento vivo. Atualizar conforme implementação avança.*
