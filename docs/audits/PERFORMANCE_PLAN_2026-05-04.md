# Plano — Atualização do TCR e Docs Canônicos

## Diagnóstico

Vários padrões e features recentes estão registrados apenas em memórias (`mem://...`) ou em código, mas **não** no TCR nem nos docs canônicos:

- **MBR v2** (`/rituals/mbr-v2`) — rito paralelo por Org Objective + severidade.
- **Pré-MBR — KPI Gate ancorado ao mês de referência** (não contamina com valores de meses futuros).
- **Pré-MBR — `safeProjectJustifications`** (fallback obrigatório para drafts antigos sem `projectJustifications`).
- **Anonymous Ritual Evaluation** expandido (já em memória, ausente do TCR).
- **PostgREST `or() / cs.{}` quoting** (memória recente, ausente dos standards).
- **Lazy with retry** obrigatório em `src/routes/*` (idem).
- **Entity name length limits** (idem).
- **Wizard snapshot denorm deprecation** (idem).
- **Pré-checklist obrigatório** (já está em `<project-knowledge>` mas não tem espelho em doc canônico legível pelos engenheiros).

## Entregas

### 1. `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`
- Bumpar para **v3.30.0** com `Última atualização: 2026-05-04`.
- Ajustar a linha de **Status** adicionando: `MBR v2 ✅`, `Pré-MBR Reference-Month KPI Gate ✅`, `Pré-MBR Resilient Drafts ✅`.
- Inserir nova entrada **`### v3.30.0 (2026-05-04) — MBR v2 + Pré-MBR Hardening`** no topo do Changelog cobrindo:
  - MBR v2: rota, agrupamento por Org Objective, severidade, consumo do Pré-MBR v1 sem alteração.
  - KPI Gate ancorado ao mês de referência (`classifyKpiGateBucketsFromMonthlySnapshots`, `useMbrPreTeamKpisMonthly`).
  - `safeProjectJustifications` em `MbrPreProjectsStep` + fallbacks em `MbrPrePage`.
- Atualizar §3 (Módulos do Hub) para referenciar o sub-rito MBR v2.
- Atualizar §4 (Regras de Negócio) com a regra "análise de KR/KPI no Pré-MBR usa apenas dados do mês de referência".

### 2. `docs/canonical/DEVELOPMENT_STANDARDS.md`
- Bumpar versão para **1.31.0**, referência **TCR v3.30.0**.
- Em **D. Queries, Performance e DX**: adicionar subseção **D.x — Resilient Draft Hydration** (drafts antigos podem ter shape parcial; sempre usar fallbacks defensivos `?? {...}` e memos `safeXxx`).
- Em **D**: adicionar regra **PostgREST `or()` array-contains quoting** (`cs.{"uuid"}` com aspas).
- Em **L (Layout)**: registrar **Lazy with retry** obrigatório em rotas.
- Em **G (Banco)**: registrar **Entity name length limits** (Org/Team Obj 120, KR 160, Initiative 120, Project 100, Milestone 80) e triggers correspondentes.
- Em **I (Anti-patterns)**: incluir "ler campos de nome/título denormalizados em snapshots de wizard — preferir lookup por ID".
- Adicionar nova **Seção P — Pré-Checklist Obrigatório** (espelho legível do bloco em `<project-knowledge>`).

### 3. `docs/canonical/README.md`
- Adicionar entradas para `MBR v2` e atualizar a referência de versão do TCR.

### 4. `docs/engineering/DOCUMENTATION_INDEX.md` e `docs/DOCUMENTATION_INDEX.md`
- Linkar novos itens (MBR v2, Pré-MBR Reference-Month, Pré-Checklist).

### 5. Novo doc: `docs/canonical/MBR_RITUAL.md`
- Single source-of-truth do **Pré-MBR + MBR v2** (rotas, steps, regras de KPI Gate por mês de referência, justificativas de projetos resilientes, persistência via `useMbrPreDraft`, agrupamento por Org Objective no v2).
- Linkar para as memórias correspondentes (`mem://features/rituals/mbr-v2-standard`, `mem://features/rituals/anonymous-evaluation-standard`).

### 6. Novo doc: `docs/canonical/PRE_CHECKLIST.md`
- Versão renderizada do pré-checklist obrigatório listado em `<project-knowledge>` (consultar TCR, IDENTITY_CONVENTION, PERMISSIONS_AND_RBAC_MODEL, DATA_MODEL_REGISTRY, busca por implementação similar).
- Servirá como link único a citar em PR templates e onboarding.

## Detalhes técnicos

- Mantém todas as memórias (`mem://...`) intactas — docs apenas espelham/referenciam.
- Não toca código de produção (`src/`, `supabase/`).
- Sem migrações de banco.
- Não regenera `DATA_MODEL_REGISTRY.{md,json}` — schema não mudou nesta janela.
- Edição em arquivos `.md` de docs apenas; nenhum impacto em build, runtime ou tipos.

## Fora de escopo

- Refatorar código do MBR v2 ou Pré-MBR.
- Atualizar `DATA_MODEL_REGISTRY` (não houve mudança de schema).
- Tocar em memórias (já estão atualizadas).
