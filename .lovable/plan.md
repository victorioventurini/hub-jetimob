## Diagnóstico

O botão envia, mas o `INSERT` em `analysis_threads` falha silenciosamente antes mesmo de chamar a edge function (0 threads no banco, 0 logs em `analysis-chat`). Duas causas confirmadas na migration `20260612141215_…`:

1. **GRANTs ausentes** — as tabelas `analysis_threads` e `analysis_messages` não têm nenhum `GRANT` para `authenticated`/`service_role`. Sem GRANT, PostgREST retorna erro de permissão mesmo com RLS válida.
2. **RLS comparando `auth.uid()` com `owner_profile_id`** — viola a convenção do projeto (`auth.uid()` ≠ `profiles.id`). O código insere `realProfileId` (= `profiles.id`), mas a policy exige `owner_profile_id = auth.uid()` → sempre falso → 42501.

O padrão canônico do projeto é usar a função `my_profile_id()` (mapeia `auth.uid()` → `profiles.id`).

## Correção (nova migration)

```sql
-- 1. GRANTs (obrigatórios)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_threads TO authenticated;
GRANT ALL ON public.analysis_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_messages TO authenticated;
GRANT ALL ON public.analysis_messages TO service_role;

-- 2. Recriar policies usando my_profile_id()
DROP POLICY "Users manage own analysis threads" ON public.analysis_threads;
CREATE POLICY "Users manage own analysis threads"
  ON public.analysis_threads FOR ALL TO authenticated
  USING (owner_profile_id = public.my_profile_id())
  WITH CHECK (owner_profile_id = public.my_profile_id());

DROP POLICY "Users read messages of own threads"    ON public.analysis_messages;
DROP POLICY "Users insert messages on own threads"  ON public.analysis_messages;
DROP POLICY "Users delete messages on own threads"  ON public.analysis_messages;

CREATE POLICY "Users read messages of own threads"
  ON public.analysis_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM analysis_threads t
                 WHERE t.id = thread_id AND t.owner_profile_id = public.my_profile_id()));

CREATE POLICY "Users insert messages on own threads"
  ON public.analysis_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM analysis_threads t
                      WHERE t.id = thread_id AND t.owner_profile_id = public.my_profile_id()));

CREATE POLICY "Users delete messages on own threads"
  ON public.analysis_messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM analysis_threads t
                 WHERE t.id = thread_id AND t.owner_profile_id = public.my_profile_id()));
```

## Validação

1. Abrir `/analysis/chat`, digitar mensagem e enviar.
2. Confirmar linha em `analysis_threads` e duas em `analysis_messages` (user + assistant).
3. Conferir `edge_function_logs analysis-chat` para ver a invocação.

Escopo restrito ao banco — nenhuma mudança em frontend ou edge function.
