# 🏗️ Auditoria Sistêmica do Hub — Visão 360°

**Data:** 2026-01-13  
**Versão:** 1.1.0 (Ações Imediatas Executadas)  
**Objetivo:** Analisar o Hub como produto vivo, identificando dívidas, complexidade desnecessária e ajustes para escalabilidade sustentável  
**Escopo:** Frontend, Backend, Banco, Fluxos, Documentação, Rituais

### Changelog v1.1.0

- ✅ `cleanup_old_audit_logs()` criada (retenção 90 dias para `audit_logs` e `ai_agent_logs`)
- ✅ `DEVELOPMENT_STANDARDS.md` v1.6.0 com seção M (Limites de Código)
- ✅ `DOCUMENTATION_INDEX.md` consolidado (23 docs arquivados como histórico)
- ✅ Edge Functions padrão atualizado para `withMiddleware`


## 📊 DASHBOARD EXECUTIVO

| Eixo | Score | Tendência | Risco |
|------|-------|-----------|-------|
| **Frontend** | 9/10 | ↗️ Melhorando | 🟢 Baixo |
| **Backend** | 9/10 | → Estável | 🟢 Baixo |
| **Banco de Dados** | 8/10 | → Estável | 🟡 Médio |
| **Arquitetura** | 9/10 | → Estável | 🟢 Baixo |
| **Documentação** | 8/10 | ↗️ Melhorando | 🟢 Baixo |
| **Observabilidade** | 8/10 | ↗️ Melhorando | 🟡 Médio |
| **Rituais/Processos** | 7/10 | → Estável | 🟡 Médio |

**Veredicto Geral:** Hub em **excelente estado técnico** para escalar. Principais riscos são de processo, não de código.

---

## 📈 MÉTRICAS DE ESCALA

### Tamanho do Sistema

| Categoria | Quantidade | Tendência |
|-----------|------------|-----------|
| **Módulos Frontend** | 14 | Estável |
| **Edge Functions** | 16 | Crescendo (+2/mês) |
| **Tabelas DB** | 79 | Estável |
| **Views DB** | 25+ | Crescendo |
| **Funções SQL** | 40+ | Estável |
| **Componentes UI** | 55+ | Estável |
| **Hooks Globais** | 28 | Estável |
| **Arquivos .ts/.tsx** | 800+ | Crescendo |

### Saúde do Banco

| Tabela | Rows | Tamanho | Cleanup |
|--------|------|---------|---------|
| ai_agent_logs | 59.759 | 24 MB | ✅ 90 dias |
| cron_execution_logs | 4.788 | 1.4 MB | ✅ 30 dias |
| audit_logs | 652 | 1.2 MB | ✅ 90 dias (v1.1.0) |
| okr_wizard_sessions | 498 | 464 KB | ✅ 7 dias |
| profiles | 65 | 376 KB | N/A |

**⚠️ Alerta:** `audit_logs` sem cleanup automático. A 1.2 MB/mês, pode crescer para 15+ MB/ano.

---

## 🔴 DÍVIDAS TÉCNICAS ATIVAS

### Criticidade Alta (P1) — Requer Ação Imediata

| Item | Impacto | Esforço | Status |
|------|---------|---------|--------|
| ~~Bug `get_cycle_checkins` c.notes→c.comments~~ | Erros 500 | 15 min | ✅ CORRIGIDO |
| ~~Bug `v_shared_okrs_summary.objective_id`~~ | Erros 500 | 15 min | ✅ CORRIGIDO (frontend) |

### Criticidade Média (P2) — Esta Semana

| Item | Impacto | Esforço | Status |
|------|---------|---------|--------|
| 156 arquivos com cores hardcoded | Manutenção | 4h (gradual) | ⏳ Em progresso |
| Cleanup de audit_logs | Crescimento DB | 30 min | 🔲 Pendente |
| DEVELOPMENT_STANDARDS.md desatualizado | Onboarding | 15 min | ⏳ Pendente |

### Criticidade Baixa (P3) — Backlog

| Item | Impacto | Esforço | Status |
|------|---------|---------|--------|
| Nomenclatura de triggers inconsistente | Cosmético | 2h | 🔲 Backlog |
| Colunas text que deveriam ser enum | Type safety | 2h | 🔲 Backlog |
| 8 índices com 0 scans | Overhead | 30 min | ⏳ Monitorando |
| Particionamento ai_agent_logs | Escalabilidade | 4h | 🔲 Futuro |

---

## ⚠️ ONDE A COMPLEXIDADE ESTÁ CRESCENDO

### 1. Documentação Fragmentada

**Problema:** 42 arquivos em `docs/engineering/` com nomenclatura inconsistente e sobreposição.

```
docs/engineering/
├── AUDIT_REPORT_2026-01-11.md          ← Versão antiga
├── AUDIT_REPORT_2026-01-11_v3.md       ← Versão atual (qual usar?)
├── TECHNICAL_DEBT_ANALYSIS_2026-01-12.md
├── TECHNICAL_DEBT_ANALYSIS_2026-01-12_v2.md
├── TECHNICAL_DEBT_ANALYSIS_2026-01-13.md  ← 3 versões!
├── HEALTH_REPORT_2026-01-11.md
├── HEALTH_REPORT_2026-01-12.md
├── HEALTH_REPORT_2026-01-13.md         ← Qual é o canônico?
└── ... (35 mais arquivos)
```

**Risco:** Onboarding confuso, decisões baseadas em docs desatualizados.

**Recomendação:**
- [ ] Manter apenas 1 versão canônica por tipo (sem sufixo de data/versão)
- [ ] Usar versionamento interno nos docs (header `Versão: X.Y.Z`)
- [ ] Arquivar versões antigas em `docs/archive/`

### 2. Hooks com Responsabilidades Mistas

**Problema:** Alguns hooks misturam query + mutation + side effects.

```typescript
// ❌ Anti-pattern encontrado em alguns módulos
function useFeatureX() {
  const query = useQuery(...);         // Query
  const mutation = useMutation(...);   // Mutation
  useEffect(() => { ... });            // Side effect
  const handleSomething = () => {};    // Logic
  return { ...query, ...mutation, handleSomething };
}
```

**Onde está bom (padrão a seguir):**
```
src/modules/okrs/hooks/
├── queries/              ✅ Queries isoladas
│   └── useOkrQueries.ts
├── mutations/            ✅ Mutations isoladas
│   └── useOkrMutations.ts
└── index.ts              ✅ Re-exports
```

**Onde precisa melhorar:**
- `src/hooks/useNotificationCenter.ts` (400+ linhas, mistura tudo)
- `src/modules/permissions/hooks/usePermissionGovernance.ts` (350+ linhas)

**Recomendação:**
- [ ] Migrar gradualmente para padrão modular (queries/mutations separados)
- [ ] Limite máximo: 200 linhas por hook

### 3. Módulos com Acoplamento Cruzado

**Problema:** Alguns módulos importam diretamente de outros, criando dependência circular potencial.

```typescript
// ✅ Correto: importar de hooks globais
import { useIdentity } from '@/hooks/useIdentity';

// ⚠️ Atenção: import cruzado entre módulos
import { useTeamObjectives } from '@/modules/okrs/hooks/useTeamObjectives';
// dentro de src/modules/kpis/...
```

**Recomendação:**
- Dados compartilhados → `src/hooks/` (global)
- Dados específicos → `src/modules/<mod>/hooks/`
- Cross-module → via props ou Context

### 4. Edge Functions Crescendo

**Tendência:** +2 funções/mês (12 → 16 em 2 meses)

| Função | Linhas | Criticidade | Complexidade |
|--------|--------|-------------|--------------|
| process-notification-outbox | 720 | Alta | Alta |
| invoke-vic | 380 | Alta | Alta |
| cron-dispatcher | 260 | Alta | Média |
| auth-email-hook | ~150 | Alta | Baixa |

**Risco:** Funções grandes sem testes automatizados.

**Recomendação:**
- [ ] Manter `_shared/` como biblioteca core (já está bem)
- [ ] Limite máximo: 400 linhas por função
- [ ] Considerar: testes E2E para fluxos críticos (notificações, auth)

---

## ✅ O QUE ESTÁ FUNCIONANDO MUITO BEM

### 1. Arquitetura Multi-BU Sólida

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                         │
│  useBuScopedSupabase() → x-current-bu-id header    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                 Edge Functions                       │
│  withMiddleware() → BU validation + auth            │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    Database                          │
│  RLS policies → is_current_bu(bu_id)                │
│  Triggers → assert_bu_scope()                       │
└─────────────────────────────────────────────────────┘
```

**Resultado:** Zero vazamento de dados entre BUs detectado.

### 2. Sistema de Permissões V2

- ✅ 100% tabelas com RLS
- ✅ Permission keys centralizados (`permission_catalog`)
- ✅ Templates reutilizáveis (`permission_templates_v2`)
- ✅ Frontend guard (`RequirePermission`, `usePermissions`)

### 3. Padrões de Código Consistentes

| Padrão | Aderência |
|--------|-----------|
| staleTime em queries | 82 arquivos ✅ |
| Query keys centralizados | 100% ✅ |
| URL state para filtros | 100% páginas principais ✅ |
| BU-scoped client | 100% operacional ✅ |
| Identity convention | 100% ✅ |

### 4. Design System Maduro

- ✅ 55+ componentes UI
- ✅ Tokens semânticos (cores, status, shadows)
- ✅ Dark mode completo
- ✅ Selects canônicos (17 componentes)
- ✅ Estados padronizados (Empty, Error, Loading)

### 5. Observabilidade

- ✅ Structured logging em Edge Functions
- ✅ Correlation ID tracking
- ✅ Cleanup automático de logs (3 tabelas)
- ✅ Notification health monitoring

---

## 📋 PLANO DE SUSTENTABILIDADE

### Semana 1 (Imediato)

| Item | Responsável | Esforço |
|------|-------------|---------|
| Criar cleanup para audit_logs | Lovable | 30 min |
| Atualizar DEVELOPMENT_STANDARDS.md | Lovable | 15 min |
| Arquivar docs duplicados | Lovable | 1h |

### Semana 2-4 (Curto Prazo)

| Item | Responsável | Esforço |
|------|-------------|---------|
| Migrar 30% cores hardcoded → tokens | Gradual | 2h |
| Refatorar useNotificationCenter | Lovable | 2h |
| Documentar padrão de hooks | Lovable | 1h |

### Trimestre (Médio Prazo)

| Item | Responsável | Esforço |
|------|-------------|---------|
| Migrar 100% cores para tokens | Gradual | 8h |
| Testes E2E para auth + notificações | Equipe | 16h |
| Padronizar nomenclatura triggers | Lovable | 2h |
| Avaliar particionamento de logs | Lovable | 4h |

---

## 🎯 MÉTRICAS DE SUCESSO

### Saúde Técnica (Atual)

| Métrica | Valor | Meta | Status |
|---------|-------|------|--------|
| RLS Coverage | 100% | 100% | ✅ |
| Queries com staleTime | 95% | 100% | ✅ |
| Componentes documentados | 80% | 90% | ⚠️ |
| Testes automatizados | 0% | 30% | 🔴 |
| Docs atualizados | 85% | 100% | ⚠️ |

### Escalabilidade

| Métrica | Atual | Limite Recomendado |
|---------|-------|-------------------|
| Tabelas DB | 79 | 150 |
| Linhas maior Edge Function | 720 | 500 |
| Linhas maior hook | 400+ | 200 |
| Docs em engineering/ | 42 | 20 canônicos |

---

## 📝 CONCLUSÃO E RECOMENDAÇÕES

### O Hub está pronto para escalar?

**SIM**, com ressalvas:

1. **Código:** ✅ Excelente qualidade, padrões consistentes
2. **Segurança:** ✅ RLS 100%, multi-tenancy sólido
3. **Arquitetura:** ✅ Bem modularizada, extensível
4. **Performance:** ✅ Índices otimizados, RPCs agregadoras
5. **Documentação:** ⚠️ Fragmentada, precisa consolidação
6. **Testes:** 🔴 Ausentes, risco para refatorações
7. **Rituais:** ⚠️ Falta processo de cleanup de docs

### Top 3 Ações para Sustentabilidade

1. **Consolidar documentação** — Manter 1 versão canônica por tipo
2. **Estabelecer limites** — Max 200 linhas/hook, 500 linhas/edge function
3. **Adicionar testes** — Iniciar com fluxos críticos (auth, notificações)

### O que NÃO fazer

- ❌ Reescrever módulos funcionando
- ❌ Migrar para outro framework
- ❌ Criar abstrações antes de precisar
- ❌ Adicionar bibliotecas sem necessidade clara

---

## 📚 DOCUMENTOS RELACIONADOS

| Documento | Propósito |
|-----------|-----------|
| [TECHNICAL_CONTEXT_REGISTRY.md](../TECHNICAL_CONTEXT_REGISTRY.md) | Fonte de verdade |
| [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) | Padrões obrigatórios |
| [TECHNICAL_DEBT_ANALYSIS_2026-01-13.md](./TECHNICAL_DEBT_ANALYSIS_2026-01-13.md) | Débitos detalhados |
| [FRONTEND_UX_AUDIT_2026-01-13.md](./FRONTEND_UX_AUDIT_2026-01-13.md) | Auditoria frontend |
| [BACKEND_AUDIT_2026-01-13.md](./BACKEND_AUDIT_2026-01-13.md) | Auditoria backend |

---

*Auditoria realizada em: 2026-01-13*  
*Próxima revisão: 2026-01-27 (quinzenal)*
