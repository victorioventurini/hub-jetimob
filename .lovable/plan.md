## Trocar modelo padrão de MBR e QBR para Gemini 2.5 Pro

Atualizar o modelo padrão dos dois edge functions de relatório executivo para `google/gemini-2.5-pro` (mais estável e adequado para contexto longo de relatórios consolidados).

### Mudanças

1. **`supabase/functions/mbr-executive-report/index.ts`** (linha ~221)
   - `google/gemini-3-flash-preview` → `google/gemini-2.5-pro`

2. **`supabase/functions/qbr-executive-report/index.ts`** (linha ~172)
   - `google/gemini-3-flash-preview` → `google/gemini-2.5-pro`

`maxTokens`, `temperature` e todo o resto da lógica permanecem inalterados. Após o deploy, regenerar o relatório executivo do MBR no ciclo afetado para validar.