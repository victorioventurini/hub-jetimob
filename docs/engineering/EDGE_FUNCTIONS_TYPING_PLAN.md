# 🧪 Edge Functions — Plano de Tipagem & Lint Cleanup

**Versão:** v1.0.0
**Última atualização:** 2026-04-22
**Status:** Em execução
**Owner:** Plataforma / Backend
**Referência cruzada:** `docs/canonical/EDGE_PERFORMANCE_STANDARD.md`,
`mem://backend/edge-function-standard-v4`,
`mem://standards/ai/response-parsing-canonical.md`

---

## 1. Contexto

O CI do Hub aponta erros de lint concentrados em `supabase/functions/`.
Após auditoria real (não a contagem agregada do CI), o panorama é:

| Categoria | Erros | Observação |
|-----------|-------|------------|
| `@typescript-eslint/no-explicit-any` | **182** | Distribuídos em 26 arquivos |
| `prefer-const` | 9 | Variáveis declaradas `let` mas nunca reatribuídas |
| `no-useless-escape` | 6 | Regex com escapes desnecessários |
| `no-case-declarations` | 3 | `let/const` em `case` sem bloco `{}` |
| `@typescript-eslint/ban-ts-comment` | 2 | `@ts-ignore` deve ser `@ts-expect-error` |
| `no-async-promise-executor` | 1 | `new Promise(async ...)` |
| **Total** | **203** | em 30 arquivos |

> Os módulos do frontend (`src/`) estão **limpos** — todos os erros vivem em
> `supabase/functions/`. Esse PR não toca em código de UI/aplicação.

---

## 2. Estratégia

1. **Quick-wins primeiro** (21 erros não-`any`) — risco zero, ganho imediato.
2. **`_shared` antes das functions** — tipos compartilhados em
   `_shared/types/` para evitar duplicação.
3. **Tipar contra o esquema do banco** — usar `Database` de
   `_shared/database.types.ts` (gerado pelo Supabase) sempre que a função
   acessar tabelas conhecidas.
4. **Tipos locais para LLM I/O** — payloads de modelos viram `interface`
   próprios (já parcialmente em uso nos summaries).
5. **Não alterar comportamento.** Esse PR é puramente de tipagem/lint —
   nenhuma mudança de lógica, RLS, prompts ou contratos.

### Anti-padrões a remover

- `any` cru em parâmetros de função → tipar contra `Database` ou criar
  `interface` local.
- `any[]` em arrays Supabase → usar `Pick<Tables<'tabela'>['Row'], '...'>`.
- `(svc: any)` em helpers → usar `SupabaseClient<Database>`.
- `as any` em casts de parsing LLM → usar `tryParseAiJson<T>()` (já canônico).

---

## 3. Distribuição (top arquivos)

```
44  supabase/functions/analysis-generate/index.ts
15  supabase/functions/team-checkin-summary/index.ts
14  supabase/functions/_shared/hub-tools.ts
14  supabase/functions/qbr-executive-report/index.ts
12  supabase/functions/mbr-summary/index.ts
 8  supabase/functions/clevel-checkin-summary/index.ts
 8  supabase/functions/collaborator-checkin-summary/index.ts
 8  supabase/functions/generate-ritual-occurrences/index.ts
 8  supabase/functions/qbr-meeting-summary/index.ts
 8  supabase/functions/qbr-pre-summary/index.ts
 7  supabase/functions/qbr-post-summary/index.ts
 7  supabase/functions/sync-ritual-calendar-from-cycles/index.ts
 6  supabase/functions/okr-construction-review/index.ts
 5  supabase/functions/_shared/llm-client.ts
 4  supabase/functions/_shared/agent-loader.ts
 4  supabase/functions/_shared/email-sender.ts
 4  supabase/functions/_shared/instruction-sources.ts
 4  supabase/functions/cron-dispatcher/index.ts
 4  supabase/functions/invoke-vic/index.ts
 ...
```

---

## 4. Checklist do PR

### Etapa 1 — Quick-wins (21 erros)
- [x] `_shared/hub-tools.ts` — `prefer-const` + `no-case-declarations`
- [x] `_shared/llm-client.ts` — refatorar `no-async-promise-executor`
- [x] `analysis-generate/index.ts` — `prefer-const` ×3 + `ban-ts-comment` ×2
- [x] `clevel-checkin-summary/index.ts` — `prefer-const`
- [x] `collaborator-checkin-summary/index.ts` — `prefer-const`
- [x] `generate-ritual-occurrences/index.ts` — `prefer-const`
- [x] `mbr-summary/index.ts` — `prefer-const`
- [x] `okr-construction-review/index.ts` — `no-useless-escape` ×6
- [x] `team-checkin-summary/index.ts` — `prefer-const`

### Etapa 2 — Tipagem do `_shared`
- [ ] `_shared/hub-tools.ts` (14 `any`)
- [ ] `_shared/llm-client.ts` (5 `any`)
- [ ] `_shared/agent-loader.ts` (4)
- [ ] `_shared/email-sender.ts` (4)
- [ ] `_shared/instruction-sources.ts` (4)
- [ ] `_shared/middleware.ts` (2)
- [ ] `_shared/notification-providers/types.ts` (1)

### Etapa 3 — Summaries de ritos
- [ ] `team-checkin-summary` (15)
- [ ] `qbr-executive-report` (14)
- [ ] `mbr-summary` (12)
- [ ] `clevel-checkin-summary` (8)
- [ ] `collaborator-checkin-summary` (8)
- [ ] `qbr-meeting-summary` (8)
- [ ] `qbr-pre-summary` (8)
- [ ] `qbr-post-summary` (7)
- [ ] `qbr-clevel-learnings-summary`

### Etapa 4 — Demais functions
- [ ] `analysis-generate` (44)
- [ ] `generate-ritual-occurrences` (8)
- [ ] `sync-ritual-calendar-from-cycles` (7)
- [ ] `okr-construction-review` (6)
- [ ] `cron-dispatcher` (4)
- [ ] `invoke-vic` (4)
- [ ] Outras (≤3 cada): `get-public-asset`, `search-cities`,
  `weekly-curate-opening`, `analysis-share`, `auth-email-hook`,
  `evaluate-notification-health`, `get-place-details`, `search-address`,
  `send-partner-invite`

### Etapa 5 — Validação
- [ ] `npx eslint supabase/functions --ext .ts` → 0 erros
- [ ] `npx tsc --noEmit` (já passa)
- [ ] `npm run test -- --run` → suite verde
- [ ] Smoke nas functions críticas via `supabase--curl_edge_functions`

---

## 5. Critérios de aceite

1. **Zero** `@typescript-eslint/no-explicit-any` em `supabase/functions/`.
2. Zero erros das demais regras listadas na seção 1.
3. Nenhuma alteração de comportamento — diffs revisáveis devem mostrar
   apenas tipos, `const`/`let` e refatoração mecânica.
4. CI verde nas três etapas: Lint, Type Check, Tests.

---

## 6. Fora de escopo

- Mudanças em prompts, modelos LLM, ou contratos de resposta.
- Alterações em RLS, migrações ou estrutura do banco.
- Refatoração de lógica de negócio dos rituais.
- Frontend (`src/`).

Tudo isso fica para PRs próprios.

---

*Mantido pela equipe de plataforma. Atualizar a cada conclusão de etapa.*
