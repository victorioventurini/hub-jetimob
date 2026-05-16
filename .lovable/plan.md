## Diagnóstico

O cronômetro total (`00:08` no canto direito) zera em ~1 minuto por causa de uma **divergência entre dois RPCs**:

- `rpc_assessment_invite_lookup` (carrega as perguntas na tela) resolve a versão de cada formulário via **última versão publicada** (`assessment_form_versions WHERE status='published' ORDER BY version_number DESC`), caindo para `l.version_id` só como fallback. Por isso a tela mostra as 16 perguntas atuais com `time_limit_seconds = 300s`.
- `rpc_assessment_run_start` (calcula `expires_at` da run) soma `time_limit_seconds` usando **apenas `l.version_id`** — que neste caso aponta para `facf8e55...`, uma versão antiga cujas perguntas estão todas com `deleted_at IS NOT NULL` e `time_limit_seconds = 0`.

Resultado: `v_total_time = 0` → `GREATEST(0, 60) = 60` → `expires_at = started_at + 1min`. A prova “real” precisaria de ~80 min (16 × 300s).

Dados confirmados para o invite `0q0w211r47482v5q5r351o2p6c01011j`:

```text
assessment.default_total_time_seconds = NULL
l.version_id                          = facf8e55-a17f-4b8e-956c-95a4a12c6181 (16 perguntas, todas deletadas, 0s)
run.expires_at - run.started_at       = 60 segundos
```

## Plano

### 1. Corrigir `rpc_assessment_run_start` (migração SQL)

Alterar a query que calcula `v_total_time` para resolver `version_id` da mesma forma que o lookup: preferir a última versão publicada do `form_id` ligado, com fallback para `l.version_id`.

```text
SELECT COALESCE(SUM(q.time_limit_seconds), 0)
FROM assessment_form_links l
JOIN assessment_form_questions q
  ON q.version_id = COALESCE(
       (SELECT v.id FROM assessment_form_versions v
         WHERE v.form_id = l.form_id
           AND v.status = 'published'
           AND v.deleted_at IS NULL
         ORDER BY v.version_number DESC LIMIT 1),
       l.version_id
     )
 AND q.deleted_at IS NULL
WHERE l.assessment_id = v_invite.assessment_id
  AND l.deleted_at IS NULL;
```

Manter o resto do RPC intacto (assinatura, segurança, demais validações).

### 2. Limpar a run expirada do Guilherme

A run `861d5663-0dbc-4bc7-82de-43664455f2d0` já está `expired`. Hard delete dela + answers + reabrir o invite (`status='pending'`, `started_at=NULL`) para ele iniciar de novo já com o tempo total correto.

### 3. Validação

- Re-query a soma esperada (`16 × 300 = 4800s`) com a nova resolução e confirmar.
- Após a migração, novo `rpc_assessment_run_start` para esse invite deve devolver `expires_at ≈ now() + 80min`.

## Fora de escopo

- Não mexer no front-end (`AssessmentRunnerView`): ele só consome `expires_at` do servidor.
- Não alterar `rpc_assessment_invite_lookup` — já está correto.
- Não introduzir snapshot da versão na própria run (mudança maior, fica para outro momento se quisermos imutabilidade pós-publicação).
