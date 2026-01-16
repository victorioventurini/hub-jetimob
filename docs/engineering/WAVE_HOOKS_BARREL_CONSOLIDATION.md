# Wave: Consolidação de Barrel Files de Hooks

**Versão:** v1.0  
**Data:** 2026-01-16  
**Objetivo:** Unificar a estrutura de hooks em todos os módulos do sistema, eliminando duplicações e garantindo que todos os imports usem barrel files centralizados.

---

## 1. Visão Geral

### 1.1 Problema
Atualmente, alguns módulos têm:
- **Exports duplicados**: O `index.ts` do módulo re-exporta hooks individualmente ao invés de usar `export * from "./hooks"`
- **Imports diretos**: Componentes importam de arquivos específicos ao invés do barrel
- **Barrel files incompletos**: Alguns módulos não têm `hooks/index.ts`
- **Inconsistência de padrão**: Cada módulo segue uma convenção diferente

### 1.2 Objetivo
- Todo módulo deve ter `hooks/index.ts` como barrel file central
- Todo `module/index.ts` deve usar `export * from "./hooks"` para hooks
- Componentes devem importar de `@/modules/{module}/hooks` ou `@/modules/{module}`
- Zero imports diretos para arquivos de hooks

---

## 2. Análise por Módulo

### 2.1 Módulos ✅ CONFORMES (apenas validar imports)

| Módulo | Barrel File | Status |
|--------|-------------|--------|
| `areas` | `hooks/index.ts` ✓ | ✅ Conforme - `index.ts` usa `export * from "./hooks"` |
| `home` | `hooks/index.ts` ✓ | ✅ Conforme - `index.ts` usa `export * from "./hooks"` |
| `teams` | `hooks/index.ts` ✓ | ⚠️ Sem `module/index.ts` - criar |
| `bu` | `hooks/index.ts` ✓ | ⚠️ Sem `module/index.ts` - criar |
| `external` | `hooks/index.ts` ✓ | ✅ Conforme |
| `settings` | `hooks/index.ts` ✓ | ⚠️ `module/index.ts` exporta diretamente - corrigir |
| `kpis` | `hooks/index.ts` ✓ | ⚠️ Sem `module/index.ts` - criar |

### 2.2 Módulos ⚠️ COM DUPLICAÇÃO (precisam refatorar)

| Módulo | Problema | Ação |
|--------|----------|------|
| `okrs` | `index.ts` re-exporta hooks individualmente (linhas 3-10) | Substituir por `export * from "./hooks"` |
| `assets` | `index.ts` re-exporta hooks individualmente (linhas 5-10) | Substituir por `export * from "./hooks"` |
| `permissions` | `index.ts` re-exporta hooks individualmente (linhas 5-26) | Substituir por `export * from "./hooks"` |
| `tickets` | `index.ts` re-exporta hooks individualmente (linhas 9-15) | Substituir por `export * from "./hooks"` |
| `vic` | `index.ts` re-exporta hooks individualmente (linhas 11-19) | Substituir por `export * from "./hooks"` |
| `integrations` | `index.ts` re-exporta hooks parcialmente (linha 15) | Substituir por `export * from "./hooks"` |
| `automations` | `index.ts` exporta diretamente do arquivo (linha 4) | Substituir por `export * from "./hooks"` |

### 2.3 Módulos ❌ SEM BARREL FILE (precisam criar)

| Módulo | Hooks Existentes | Ação |
|--------|------------------|------|
| `users-global` | `useGlobalUsers.ts`, `useUserGlobalActions.ts`, `useAllBus.ts` | Criar `hooks/index.ts` |

---

## 3. Plano de Execução por Fase

### Fase 1: Criar barrel files ausentes

**Arquivos a criar:**
```
src/modules/users-global/hooks/index.ts
src/modules/teams/index.ts
src/modules/bu/index.ts
src/modules/kpis/index.ts
```

### Fase 2: Corrigir exports duplicados nos module/index.ts

**Padrão a aplicar:**
```typescript
// ANTES (duplicado)
export { useTickets, useTicket } from './hooks/useTickets';
export { useCreateTicket } from './hooks/useTickets';

// DEPOIS (limpo)
export * from "./hooks";
```

**Arquivos a modificar:**
- `src/modules/okrs/index.ts`
- `src/modules/assets/index.ts`
- `src/modules/permissions/index.ts`
- `src/modules/tickets/index.ts`
- `src/modules/vic/index.ts`
- `src/modules/integrations/index.ts`
- `src/modules/automations/index.ts`
- `src/modules/settings/index.ts`

### Fase 3: Buscar e corrigir imports diretos

**Script de auditoria:**
```bash
# Buscar imports diretos de hooks (violação)
grep -rn "from ['\"]@/modules/.*/hooks/use" src/ --include="*.tsx" --include="*.ts" | grep -v "index"
```

**Padrão de correção:**
```typescript
// ANTES (import direto - ERRADO)
import { useTickets } from '@/modules/tickets/hooks/useTickets';

// DEPOIS (import do barrel - CORRETO)
import { useTickets } from '@/modules/tickets/hooks';
// ou
import { useTickets } from '@/modules/tickets';
```

### Fase 4: Limpeza de barrel files

**Remover exports duplicados internos:**
- Verificar se `hooks/index.ts` não re-exporta o mesmo hook de múltiplas formas
- Garantir que cada hook seja exportado apenas uma vez

### Fase 5: Verificar arquivos legados para deletar

**Critérios para deletar:**
1. Arquivo é 100% duplicado de outro
2. Arquivo não é mais importado por nenhum componente
3. Funcionalidade foi movida para outro arquivo

**Usar script:**
```bash
# Verificar se arquivo é importado
grep -rn "from.*fileName" src/ --include="*.ts" --include="*.tsx"
```

---

## 4. Checklist de Validação por Módulo

### Módulo: `{nome}`

- [ ] `hooks/index.ts` existe e exporta todos os hooks
- [ ] `index.ts` do módulo usa `export * from "./hooks"`
- [ ] Zero imports diretos de arquivos de hooks
- [ ] Zero exports duplicados no barrel
- [ ] Nenhum arquivo legacy remanescente

---

## 5. Ordem de Execução

| # | Módulo | Prioridade | Complexidade |
|---|--------|------------|--------------|
| 1 | `users-global` | Alta | Baixa (criar barrel) |
| 2 | `settings` | Alta | Baixa (corrigir export) |
| 3 | `automations` | Alta | Baixa (corrigir export) |
| 4 | `kpis` | Alta | Baixa (criar module index) |
| 5 | `teams` | Alta | Baixa (criar module index) |
| 6 | `bu` | Alta | Baixa (criar module index) |
| 7 | `integrations` | Média | Baixa (corrigir export) |
| 8 | `tickets` | Média | Média (vários hooks) |
| 9 | `permissions` | Média | Média (vários hooks) |
| 10 | `assets` | Média | Média (vários hooks) |
| 11 | `vic` | Média | Média (vários hooks + contexts) |
| 12 | `okrs` | Alta | Alta (muitos hooks, queries/) |

---

## 6. Estrutura Final Esperada

```
src/modules/{module}/
├── index.ts              # export * from "./hooks"; export * from "./types"; ...
├── types/
│   └── index.ts
├── hooks/
│   ├── index.ts          # Barrel file central - ÚNICA fonte de exports
│   ├── useFeatureA.ts
│   ├── useFeatureB.ts
│   └── queries/          # (opcional, para módulos complexos)
│       └── index.ts
├── components/
│   └── index.ts
└── pages/
    └── index.ts
```

---

## 7. Métricas de Sucesso

- [ ] 15/15 módulos com `hooks/index.ts` funcional
- [ ] 0 imports diretos de arquivos de hooks
- [ ] 0 exports duplicados
- [ ] Todos os testes passando após refatoração
- [ ] Documentação atualizada (TCR)

---

## 8. Comandos de Auditoria

```bash
# 1. Listar todos os módulos e seus barrel files
find src/modules -name "index.ts" -path "*/hooks/*" | sort

# 2. Buscar imports diretos (violações)
grep -rn "from ['\"]@/modules/[^/]*/hooks/use" src/ --include="*.tsx" --include="*.ts"

# 3. Buscar exports duplicados em module/index.ts
grep -n "from.*hooks/" src/modules/*/index.ts | grep -v "from.*hooks\""

# 4. Contar hooks por módulo
for dir in src/modules/*/hooks/; do echo "$dir: $(ls $dir/*.ts 2>/dev/null | wc -l) hooks"; done
```

---

## 9. Notas de Implementação

### OKRs (Módulo Complexo)
O módulo OKRs tem estrutura `hooks/queries/` que já segue o padrão correto.
A refatoração deve manter essa estrutura e apenas limpar o `okrs/index.ts`:

```typescript
// ANTES (okrs/index.ts)
export * from './hooks/useOkrStatus';
export * from './hooks/useOkrMutations';
// ... 8+ linhas de exports individuais

// DEPOIS (okrs/index.ts)
export * from './hooks';  // Uma linha substitui todas
```

### VIC (Contextos + Hooks)
O módulo VIC exporta contextos além de hooks. O barrel de hooks deve conter apenas hooks, contextos ficam separados:

```typescript
// vic/index.ts
export * from "./types";
export { VicProvider, useVic } from "./contexts/VicContext";  // Contextos
export * from "./hooks";  // Hooks via barrel
```

---

## 10. Changelog

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
| 2026-01-16 | v1.0 | Lovable | Criação do documento |
