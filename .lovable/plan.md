# Plano — Limites de caracteres por entidade + correção de legados

## Objetivo
Estabelecer limites máximos de caracteres como SSOT, aplicar validação no frontend (Zod + UI) e defesa em profundidade no banco (triggers), e corrigir os 7 registros legados que extrapolam os novos limites.

## Limites finais (recalibrados)
| Entidade | Campo | Limite |
|---|---|---|
| Org Objective | `title` | 120 |
| Team Objective | `title` | 120 |
| Key Result | `title` | 160 |
| Initiative | `name` | 120 |
| Project | `name` | 100 |
| Milestone | `name` | 80 |

---

## Fase 1 — Correção dos 7 registros legados (UPDATEs no banco)

Textos confirmados pelo usuário (#1, #2) + ajustes mínimos do AI (#3, #4, #5, #6, #7) para caber nos limites:

### 1.1 Org Objective (`okr_org_objectives`)
- **#1 — `1801fdb9...`** (115 chars): "Elevar a experiência do cliente e pavimentar a evolução da Jetimob como sistema operacional do mercado imobiliário."

### 1.2 Team Objectives (`okr_team_objectives`)
- **#2 — `1470f9f5...`** BizOps Q2 (120 chars): "Consolidar o HubSpot como plataforma padronizada e escalável, com dados confiáveis para sustentar decisões estratégicas."
- **#3 — `b91f3198...`** G&C Q1 + **#4 — `2864bdc6...`** G&C Q2 (109 chars): "Elevar a maturidade organizacional da Jetimob, com Gente & Cultura como pilar do desenvolvimento das pessoas."

### 1.3 Key Result (`okr_team_key_results`)
- **#5 — `39946929...`** Comercial (147 chars): "Reduzir em 30% o gap de faturamento entre top performer e média do time até o fim do Q1 (baseline Q3-Q4), sem queda do top performer."

### 1.4 Projects (`projects`)
- **#6 — `4bf6fa01...`** (86 chars): "Ampliar cobertura e qualidade da base de conhecimento para aumentar resolução via bot."
- **#7 — `bc79779e...`** (99 chars): "Regravar/otimizar vídeos prioritários, garantindo que temas críticos estejam atualizados."

> Será executado via tool de insert/update do Supabase (UPDATEs com WHERE id), preservando `updated_at`/`updated_by` automáticos via triggers de auditoria.

---

## Fase 2 — Constantes centralizadas (SSOT)

**Novo arquivo:** `src/shared/constants/entityLimits.ts`
```ts
export const ENTITY_NAME_LIMITS = {
  ORG_OBJECTIVE_TITLE: 120,
  TEAM_OBJECTIVE_TITLE: 120,
  KEY_RESULT_TITLE: 160,
  INITIATIVE_NAME: 120,
  PROJECT_NAME: 100,
  MILESTONE_NAME: 80,
} as const;
export type EntityNameLimitKey = keyof typeof ENTITY_NAME_LIMITS;
```

Exportar em `src/shared/constants/index.ts` e `src/shared/index.ts`.

> ⚠️ Comentário inquebrável no header: "Manter sincronizado com triggers `validate_*_name_length` no banco."

---

## Fase 3 — Componente reutilizável de feedback

**Refatorar** `src/modules/okrs/components/initiatives/InitiativeNameFeedback.tsx` para componente genérico:

**Novo arquivo:** `src/components/shared/CharCountFeedback.tsx`
- Props: `value: string`, `maxLength: number`, `showWarningAt?: number` (default 90%)
- Estados visuais: `default` / `warning` (≥90%) / `error` (>max)
- Mensagem: `{count}/{max}`
- Reusa Tailwind tokens `text-muted-foreground`, `text-warning`, `text-destructive`

**Manter** `InitiativeNameFeedback` como wrapper fino que delega ao novo componente (back-compat).

---

## Fase 4 — Validação Zod nos formulários

Aplicar `.max(ENTITY_NAME_LIMITS.X, validation.maxLength(X))` em:

| Arquivo | Campo |
|---|---|
| `src/modules/okrs/components/TeamObjectiveFormDialog.tsx` (schema) | `title` → 120 |
| `src/modules/okrs/components/org/OrgObjectiveDialog.tsx` (ou equivalente) | `title` → 120 |
| `src/modules/okrs/components/wizards/team-kr-creation/KrDetailStep.tsx` (schema) | `title` → 160 |
| `src/modules/okrs/components/team-objective-form/teamObjectiveFormTypes.ts` | `title` → 120 |
| `src/modules/okrs/hooks/useKrWizardDraft.ts` (se houver schema) | `title` → 160 |
| `src/modules/projects/components/ProjectDialog.tsx` | `name` → 100 |
| `src/modules/projects/components/MilestoneDialog.tsx` | `name` → 80 |
| Initiatives (KR wizard / dialogs) | `name` → 120 |
| `supabase/functions/_shared/schemas.ts` (validação edge) | espelhar todos |

Adicionar `<CharCountFeedback>` ao lado de cada `<Input>` correspondente.

---

## Fase 5 — Defesa em profundidade no banco (triggers)

Criar 5 funções `BEFORE INSERT OR UPDATE` (validation triggers, **sem** CHECK constraints conforme `mem://standards/database/check-constraint-prohibition`):

```sql
-- Exemplo (replicado para cada tabela)
CREATE OR REPLACE FUNCTION public.validate_team_objective_title_length()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF char_length(NEW.title) > 120 THEN
    RAISE EXCEPTION 'Título do objetivo de time excede 120 caracteres (atual: %).', char_length(NEW.title)
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_team_objective_title_length
  BEFORE INSERT OR UPDATE OF title ON public.okr_team_objectives
  FOR EACH ROW EXECUTE FUNCTION public.validate_team_objective_title_length();
```

Triggers a criar:
- `validate_org_objective_title_length` → `okr_org_objectives` (120)
- `validate_team_objective_title_length` → `okr_team_objectives` (120)
- `validate_kr_title_length` → `okr_team_key_results` (160)
- `validate_initiative_name_length` → `okr_initiatives` (120)
- `validate_project_name_length` → `projects` (100)
- `validate_milestone_name_length` → `project_milestones` (80)

> Triggers entrarão em vigor **após** os UPDATEs da Fase 1, garantindo que nenhum legado quebre.

---

## Fase 6 — Documentação (SSOT em memória)

**Novo arquivo:** `mem://standards/entity-name-length-limits`
- Limites canônicos
- Como adicionar novos campos
- Regra de sincronia constants↔triggers
- Estratégia de tratamento de legados (UPDATE manual + trigger ativo)

Atualizar `mem://index.md` (seção Standards & Patterns) com referência.

---

## Ordem de execução
1. **Fase 1** — UPDATEs nos 7 legados (via insert tool)
2. **Fase 2** — Criar `entityLimits.ts`
3. **Fase 3** — Criar `CharCountFeedback` + refatorar `InitiativeNameFeedback`
4. **Fase 4** — Aplicar Zod + UI nos 8 formulários
5. **Fase 5** — Migration com 6 triggers
6. **Fase 6** — Memória SSOT

## Critérios de aceitação
- [ ] 7 legados ajustados, 0 registros acima do limite no banco
- [ ] Tentar salvar título > limite no UI bloqueia com mensagem amigável
- [ ] Tentar inserir via API/edge sem Zod é bloqueado pelo trigger (erro 23514)
- [ ] Contador `{n}/{max}` aparece em todos os 8 inputs
- [ ] `InitiativeNameFeedback` continua funcionando (back-compat)
- [ ] Memória SSOT publicada e indexada

## Riscos / Mitigações
- **Risco:** Fase 5 antes da Fase 1 quebraria edição dos legados → **Mitigação:** ordem rígida 1→5.
- **Risco:** Edge functions sem schema atualizado aceitariam payloads inválidos → trigger garante última linha de defesa.
- **Risco:** `useKrWizardDraft` pode ter validação separada → auditar e alinhar.
