## Diagnóstico

Na prova `53eb6d37…` o preview aparece **sem perguntas** porque:

- A tabela `assessment_form_links` guarda `version_id` capturado **no momento em que o formulário foi vinculado à prova** (versão 1).
- O formulário já evoluiu: hoje existem v1, v2, v3 e v4 (todas `published`). A v4 tem 16 perguntas ativas.
- A v1 ficou com `0` perguntas ativas (todas com `deleted_at`), porque o usuário continuou editando o formulário e, ao gerar novos rascunhos/publicações, o conteúdo "vivo" migrou para v2→v3→v4.
- Como `rpc_assessment_preview_lookup` (e o público `rpc_assessment_invite_lookup`) lê perguntas **da `version_id` pinada no link**, o respondente vê uma versão vazia.

Resultado prático: toda vez que o admin republica o formulário, todas as provas que apontam para esse formulário "esvaziam" silenciosamente. Não é só este caso — é estrutural.

## Decisão

A `version_id` no link continua existindo (auditoria/histórico de runs já emitidos), **mas a renderização para o respondente passa a usar sempre a versão `published` mais recente do formulário**. Isso elimina a necessidade do admin re-vincular o formulário a cada publicação.

## Mudanças

### 1. Banco — migration

Atualizar duas RPCs (mantendo assinatura/forma de retorno):

- `rpc_assessment_preview_lookup(p_assessment_id uuid)`
- `rpc_assessment_invite_lookup(p_token text)`

Em ambas, ao montar `forms`, ao invés de:

```text
WHERE q.version_id = l.version_id
```

resolver dinamicamente:

```text
v_effective := (
  SELECT id FROM assessment_form_versions
  WHERE form_id = l.form_id
    AND status = 'published'
    AND deleted_at IS NULL
  ORDER BY version_number DESC
  LIMIT 1
)
-- fallback: l.version_id (caso o form ainda não tenha publicação)
```

E retornar `version_id = v_effective` no payload, para o frontend (que usa esse id como chave de runId/respostas) continuar consistente.

### 2. Frontend

Nenhuma mudança de UI. `AssessmentRunnerView` já consome `forms[].version_id` e `forms[].questions` exatamente como vierem da RPC.

## Validação

1. Abrir `/assessments/provas/53eb6d37-617b-4d31-9a50-d4726dcaa2cc/preview` → deve listar as 16 perguntas ativas da v4.
2. Conferir que o link público (`/q/:token`) de qualquer convite ativo dessa prova também passa a mostrar as 16 perguntas.
3. Criar nova versão draft → publicar → reabrir o preview: deve mostrar a nova versão automaticamente, sem precisar mexer no vínculo da prova.
4. Provas com formulário sem nenhuma versão `published` ainda funcionam (fallback para `link.version_id`).

## Fora de escopo

- Limpar/normalizar registros antigos de `assessment_form_links.version_id` (não é necessário; o fallback cuida).
- Mudar a forma como runs já submetidos guardam `version_id` (continua o pinado, para auditoria).