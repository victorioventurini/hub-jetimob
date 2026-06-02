## Diagnóstico

O erro não parece ser mais um problema de particionamento/modelo. Pelos logs da função `mbr-executive-report`, a causa atual é uma rajada de chamadas de IA em paralelo:

- A função dispara 4 análises parciais simultâneas (`projects`, `KRs`, `KPIs`, `decisions`) e depois uma consolidação.
- Quando o gateway responde `429`, cada chamada faz retries ao mesmo tempo, amplificando a rajada.
- A função captura a falha da consolidação e retorna um relatório parcial com `monthNarrative: ""`.
- No frontend, `useMbrExecutiveReport` considera qualquer relatório sem `monthNarrative` como inválido e lança `Invalid report response`.

Resultado: o backend às vezes retorna “sucesso parcial”, mas a UI trata como erro ao regenerar.

## Plano de correção

### 1. Remover a rajada paralela na geração MBR

Alterar `supabase/functions/mbr-executive-report/index.ts` para executar as etapas de IA de forma sequencial, não com `Promise.allSettled`:

```text
Projetos → KRs → KPIs → Decisões → Consolidação
```

Isso reduz o pico de requisições simultâneas e evita que os retries de 4 chamadas concorram entre si.

### 2. Adicionar espaçamento curto entre chamadas de IA

Criar um pequeno helper local, por exemplo `pauseBetweenAiCalls`, com espera curta entre etapas bem-sucedidas/falhas.

Objetivo: suavizar o throughput sem mudar o modelo nem aumentar particionamento.

### 3. Garantir fallback não vazio para a narrativa executiva

Adicionar um fallback determinístico no backend quando a consolidação por IA falhar:

- `monthNarrative`: texto básico usando mês, progresso geral, quantidade de times analisados e quantidade de KRs/projetos/KPIs com issues.
- `commitmentsAnalysis`: resumo baseado nos compromissos existentes.
- `leaderSignals`: resumo baseado em decisões/pautas/sinais coletados.

Assim, mesmo com `429`, a função retorna um relatório válido e persistível, em vez de `monthNarrative: ""`.

### 4. Ajustar a validação do frontend sem mascarar erro real

Em `src/modules/okrs/hooks/useMbrExecutiveReport.ts`:

- Manter validação de estrutura mínima.
- Não rejeitar automaticamente um relatório que tem dados operacionais, mas veio com narrativa fallback.
- Se a função retornar erro HTTP real (`429`, `402`, `503`), continuar mostrando o toast específico já existente.

### 5. Opcional no mesmo patch: mensagem de qualidade parcial

Se o backend marcar o relatório como gerado com fallback, podemos persistir um campo simples em `reflection_data`, como:

```text
aiGenerationStatus: "partial_fallback"
```

E a tela pode mostrar uma observação discreta: “Narrativa gerada em modo reduzido por instabilidade temporária da IA”.

Sem migration: esse campo fica dentro do snapshot JSON já existente.

## Arquivos a alterar

- `supabase/functions/mbr-executive-report/index.ts`
  - trocar execução paralela por sequencial;
  - adicionar fallback determinístico de consolidação;
  - opcionalmente incluir metadado de status da geração.

- `supabase/functions/mbr-executive-report/types.ts`
  - opcional: adicionar campo de metadado no tipo `ReportResponse`.

- `src/modules/okrs/hooks/useMbrExecutiveReport.ts`
  - aceitar fallback válido e manter tratamento de erros HTTP reais.

- `src/modules/okrs/pages/MbrExecutiveReportPage.tsx`
  - opcional: exibir aviso discreto quando `aiGenerationStatus === "partial_fallback"`.

## Validação

- Testar a edge function `mbr-executive-report` diretamente para o ciclo informado e mês atual.
- Confirmar que, mesmo sob `429`, ela não retorna mais relatório inválido.
- Confirmar que a regeneração persiste o snapshot em `okr_wizard_sessions` e a página abre o relatório sem cair no toast genérico.