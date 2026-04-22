# 🧩 Wizards Framework — Padrão de Fronteira

**Versão:** v1.0.0  
**Última atualização:** 2026-04-22  
**Status:** Normativo  
**Referência cruzada:** TCR §4.8.1 (Framework Unificado de Wizards) · `HOOKS_BARREL_STANDARD.md`

---

## Objetivo

O Hub possui um **framework genérico de wizards** (BalanceStep, KrsStep, KpiGateStep, ProjectsAndInitiativesStep, HighlightsAndRisksStep, LeaderInsightsStep, DecisionsStep, ClosingStep, SummaryAndSubmitStep, ReflectionStep + config SSOT + evaluators). Hoje a implementação vive dentro de `src/modules/okrs/components/wizards/shared/framework/` por razões históricas, mas o framework é **agnóstico de OKR** e deve ser tratado como um módulo de plataforma.

---

## Fronteira Pública

Há **um único ponto de entrada canônico**:

```ts
// ✅ Correto (qualquer módulo, incluindo futuros consumidores fora de OKR)
import {
  BalanceStep,
  KrsStep,
  STEP_DEFINITIONS,
  getCurrentStructureVersion,
} from "@/wizards-framework";
```

```ts
// ❌ Proibido em código fora de src/modules/okrs/
import { BalanceStep } from "@/modules/okrs/components/wizards/shared/framework";
```

Dentro de `src/modules/okrs/` o caminho interno permanece tolerado (será migrado quando o split físico for executado).

---

## Política de Migração Física

A migração de pastas (`okrs/.../framework/` → `src/modules/wizards-framework/`) é **deferida** até existirem **dois consumidores reais** fora de OKR. Razões:

1. Risco de regressão em 19 wizards de produção.
2. ~533 arquivos no módulo OKR atualmente — toda mudança em paralelo gera conflito.
3. O barrel canônico (`@/wizards-framework`) já oferece a abstração necessária para começar a usar o framework em outros módulos sem mover nada.

Quando o split físico for executado:
- Mover apenas a pasta `framework/` (não os wizards específicos de OKR).
- Apontar o barrel canônico para o novo caminho.
- Atualizar imports internos de OKR no mesmo PR.

---

## Regras de Conteúdo

1. **Componentes em `framework/components/`** não podem ler `wizardType` para mudar comportamento — toda variação vive em `framework/config/`.
2. **SSOT de labels:** `@/modules/okrs/constants/ritualLabels` (RITUAL_STEP_LABELS) — também a ser migrado quando o split ocorrer.
3. **SSOT estrutural:** `framework/config/stepDefinitions.ts`.
4. **SSOT de versões:** `framework/config/structureVersions.ts`.
5. **Decisão inline ubíqua:** todos os steps ativos renderizam `InlineDecisionInput` via `_InlineDecisionsSlot`. Steps de consolidação final (`SummaryAndSubmitStep`, `ClosingStep`) são exceção documentada.

---

## Enforcement

- **Lint manual / code review:** rejeitar PRs fora de OKR que importem do caminho interno.
- **Auditoria periódica:** rodar `rg "modules/okrs/components/wizards/shared/framework" src/ --glob '!src/modules/okrs/**'` deve retornar zero ocorrências.

---

*Mantido pela equipe de arquitetura.*
