

## Plano: Exibir KRs abaixo dos Objetivos no Relatório QBR

Atualmente a tabela de propostas mostra apenas "N KRs" por objetivo. A mudança faz os títulos individuais das KRs aparecerem abaixo de cada objetivo.

---

### Alterações

**1. Edge Function (`supabase/functions/qbr-executive-report/index.ts`)**
- Na função `extractNextCycleProposals` (linha ~146), incluir os títulos das KRs no retorno além do `krCount`:
  ```ts
  krs: (okr.keyResults || okr.krs || []).map(kr => kr.title || kr.name || 'Sem título')
  ```

**2. Hook + Tipos (`src/modules/okrs/hooks/useQbrExecutiveReport.ts`)**
- Adicionar `krs: string[]` ao tipo `teamProposals` na interface `QbrExecutiveReportData`
- Atualizar `normalizeQbrExecutiveReportData` para mapear o array `krs` (com fallback `[]`)

**3. UI — Tabela de Propostas (`src/modules/okrs/pages/QbrExecutiveReportPage.tsx`)**
- Na seção "O que os times propõem", expandir cada linha da tabela para listar as KRs logo abaixo do título do objetivo, com bullet points em texto menor e cor `muted-foreground`
- Remover a coluna "KRs" (contagem numérica) já que os itens estarão visíveis

---

### Resultado Visual

```text
┌─────────┬──────────────────────────────────┐
│ Time    │ Objetivo proposto                │
├─────────┼──────────────────────────────────┤
│ Growth  │ Expandir base de clientes        │
│         │  · MRR de R$ 500k               │
│         │  · 200 novos logos               │
│         │  · Churn < 2%                    │
├─────────┼──────────────────────────────────┤
│ Produto │ Lançar módulo X                  │
│         │  · 90% de adoção                 │
│         │  · NPS > 50                      │
└─────────┴──────────────────────────────────┘
```

3 arquivos alterados, sem mudança de schema de banco.

