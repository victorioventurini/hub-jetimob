## Diagnóstico

O 17706% que aparece no screenshot não vem do bloco gerado pelo backend do MBR Executive Report. Ele vem da seção reutilizada `Como chegamos aqui — OKRs da empresa`, renderizada por `OrgOkrsReportSection`.

Nessa seção, a linha do KR usa `OkrProgressBar`, mas não passa `unit={orgKr.unit}`. Como `OkrProgressBar` assume `unit='%'` por padrão, o cálculo canônico roda sem contexto de unidade e volta a calcular `70822 / 400 * 100 = 17706%`.

## Plano de correção

1. Corrigir `OrgOkrsReportSection`
   - Passar `unit={orgKr.unit}` para o `OkrProgressBar` dos KRs organizacionais.
   - Manter os KRs de time vinculados usando o `progress` já calculado pela query, que já passa unidade corretamente.

2. Blindar o componente base
   - Ajustar o tipo de `OkrProgressBar` para aceitar `unit?: string | null`, compatível com dados do banco.
   - Evitar que `null` caia como unidade inválida; usar fallback apenas quando não houver unidade.

3. Adicionar teste de regressão específico
   - Em `OkrProgressBar.test.tsx`, adicionar caso com `baseline=0`, `current=70822`, `target=400`, `unit="R$ mil"`.
   - Esperado: renderizar aproximadamente `18%`, nunca `17706%`.

4. Verificar usos restantes
   - Revisar todos os usos de `<OkrProgressBar>` encontrados para garantir que chamadas com KR real passam `unit`.
   - Se houver outro uso sem unidade vindo de KR, corrigir no mesmo padrão.

5. Validação esperada
   - Após regenerar/recarregar o MBR Report, o KR “Gerar um incremento de R$ 400 mil em MRR...” deve aparecer em torno de `18%`/`17,7%`, não `17706%`.
   - O guardrail já criado para fórmulas inline continua válido; este fix cobre o vazamento pela camada visual do componente.