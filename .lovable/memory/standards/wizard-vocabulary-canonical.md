---
name: Wizard Vocabulary Canonical
description: SSOT dos enums transversais aos ritos (DecisionCategory, DirectiveCategory, RitualBlock, RitualPeopleSignalType, RitualThemeActionType) + DIRECTIVE_TO_DECISION_MAP consumido no QBR Meeting Step 3
type: preference
---

# Padrão

Vocabulário compartilhado entre Pré-Weekly, Weekly, MBR, QBR (Pre, C-Level, Meeting, Post) e Team Checkin vive em **`src/modules/okrs/types/wizard/vocabulary.ts`**. Antes era declarado inline em `shared.ts`/`qbr.ts`/`weekly.ts` como union de string literals — qualquer renomeio quebrava parcialmente.

## Enums canônicos

| Enum | Tipo | Valores |
|------|------|---------|
| `DecisionCategory` | type + `DECISION_CATEGORIES` array | `decision`, `focus_adjustment`, `next_step`, `strategic_proposal` |
| `DirectiveCategory` | type + `DIRECTIVE_CATEGORIES` array | `strategic_question`, `hypothesis`, `non_priority`, `challenge` |
| `RitualBlock` | type + `RITUAL_BLOCKS` array | `performance`, `projetos`, `pessoas` |
| `PreWeeklyBlock` | `Exclude<RitualBlock, 'pessoas'>` | — |
| `RitualPeopleSignalType` | type + array | `celebracao`, `risco`, `mudanca`, `feedback` |
| `RitualThemeActionType` | type + array | `risco`, `oportunidade`, `decisao`, `celebracao`, `alerta` |

## DIRECTIVE_TO_DECISION_MAP

Mapeamento canônico para promover diretiva C-Level (QBR Pre C-Level) a decisão (QBR Meeting):

```ts
strategic_question → next_step       // questão exige investigação/ação
hypothesis         → strategic_proposal  // hipótese vira proposta a validar
non_priority       → focus_adjustment    // despriorização ajusta foco
challenge          → decision            // desafio direto exige decisão
```

**Consumido em:** `QbrMeetingDecisionsStep` (Step 3 do QBR Meeting). Botão "Promover" em cada diretiva cria `TeamCheckinDecision` com:
- `text` copiado da diretiva
- `category` derivada via `DIRECTIVE_TO_DECISION_MAP[directive.category]`
- `metadata.source = 'clevel_directive'` + `directiveCategory` + `directiveText` (chave estável já que diretivas não têm id no snapshot) + `targetTeamId?`

Detecção de já-promovida: `decisions.some(d => d.metadata?.source === 'clevel_directive' && d.metadata?.directiveText === directive.text)`.

## Regras

1. **Snapshots persistidos não migram.** Os literais NÃO mudam — qualquer alteração é puramente estrutural.
2. **Imports**: sempre de `@/modules/okrs/types/wizard/vocabulary` (ou re-export via `@/modules/okrs/types/wizard`).
3. **Novos enums transversais**: adicionar aqui, não inline.
4. **Promoção diretiva→decisão**: sempre via `DIRECTIVE_TO_DECISION_MAP`, nunca hardcoded em outro ponto.
