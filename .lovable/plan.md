## Objetivo

Criar o questionário "Autoavaliação Pippi" como um formulário pronto no módulo `/assessments`, com as 10 perguntas (todas com sub-itens a/b/c/...) já cadastradas e prontas para gerar uma prova e convite.

## O que será feito

1. **Seed via migration idempotente** (`INSERT ... ON CONFLICT DO NOTHING`) executado no contexto da BU "Jetimob" (resolvido por slug/nome — fallback: primeira BU com módulo `assessments` habilitado):
   - 1 `assessment_themes` → "Autoavaliação Pippi"
   - 1 `assessment_forms` → "Autoavaliação Pippi", `level = senior` (ou default), descrição curta
   - 1 `assessment_form_versions` → versão 1 publicada (frozen)
   - 28 `assessment_form_questions` (uma por sub-item a/b/c/d/e), `kind = text`, parágrafo longo, sem timer, ordenadas por `order_index`. Cada pergunta carrega no `prompt`:
     - Cabeçalho do bloco (ex.: "Pergunta 1 — O que você entende por estratégico")
     - Sub-item ("a) ...") com o enunciado completo
   - Sem `multiple_choice`/`scale`: o questionário é 100% dissertativo.

2. **Mapeamento das 28 sub-perguntas** (ordem final):
   - P1: a, b, c, d (4)
   - P2: a, b, c, d (4)
   - P3: a, b, c, d (4)
   - P4: a, b (2)
   - P5: a, b, c, d, e (5)
   - P6: a, b, c (3)
   - P7: a, b, c, d (4)
   - P8: a, b, c (3)
   - P9: a, b, c (3)
   - P10: a, b (2)
   - **Total: 34 sub-itens** (corrigindo a contagem). Cada um é uma `assessment_form_questions` independente para permitir resposta separada e revisão item-a-item.

3. **Sem alteração de UI nesta fatia.** O formulário aparece automaticamente em `/assessments` (aba Formulários). Nenhuma página/rotas/componentes novos.

4. **Saída para o usuário**: link direto para o formulário (`/assessments/forms/:id`) e instrução de como criar a prova + convite pela UI já existente.

## Detalhes técnicos

- Migration usa bloco `DO $$ ... $$` em PL/pgSQL para:
  - Resolver `bu_id` por `name ILIKE 'jetimob%'` (ou primeiro BU com `assessments` em `bu_modules`).
  - `INSERT` tema → form → version → 34 questions (ids gerados, `order_index` 1..34).
  - `ON CONFLICT (bu_id, name)` no tema/form para idempotência (criar índice único parcial caso não exista — verificar antes; se não existir, usar guarda `IF NOT EXISTS (SELECT 1 ...)`).
- `kind = 'text'`, `required = true`, `paragraph = true`, `timer_seconds = NULL`.
- `prompt` em Markdown leve para preservar quebras (negrito no cabeçalho do bloco, item em nova linha).
- Não toca em `assessments` (instância) nem `invites` — o usuário cria pela UI quando quiser aplicar.

## Riscos / decisões a confirmar

- **Nível do form** (`level`): default `senior` — ok?
- **Identificação do candidato**: manter padrão atual (CPF + nome no runner) sem CPF esperado pré-fixado.
- **Anti-fraude**: já vem do padrão do módulo (LockedTextarea, telemetria). Sem mudanças.

## Não-objetivos

- Não implementa correção/score (perguntas dissertativas).
- Não cria convite nem dispara e-mail.
- Não altera schema do módulo.

```text
Migration → seed (theme + form + version + 34 questions)
              ↓
          /assessments (UI já existente lista o form)
              ↓
   usuário cria prova + convite manualmente pela UI
```