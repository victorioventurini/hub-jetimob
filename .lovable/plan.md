
# Fix: KPIs sem valor exibindo badge "OK" incorretamente

## Problema
KPIs que nao possuem valor preenchido (`latest_rag_status = null` e `latest_value = null`) estao recebendo `ragStatus: 'green'` como fallback na logica de seeding do MBR, fazendo com que aparecam com o badge "OK" -- o que e enganoso.

## Solucao

Introduzir o status `no_data` para KPIs sem dados, com badge "Sem dados" em estilo neutro (cinza).

### Alteracoes

**1. `src/modules/okrs/pages/MbrPage.tsx`** (seeding)

Alterar a logica de mapeamento de `ragStatus` (linhas 213-216) para retornar `'no_data'` quando `latest_rag_status` for nulo OU quando `currentValue` for nulo:

```text
ragStatus: kpi.latest_rag_status === 'on_track' ? 'green'
  : kpi.latest_rag_status === 'at_risk' ? 'yellow'
  : kpi.latest_rag_status === 'off_track' ? 'red'
  : 'no_data',
```

**2. `src/modules/okrs/components/wizards/mbr/MbrPanoramaStep.tsx`** (rendering)

- Adicionar `no_data` ao mapa de prioridade RAG (peso 3, abaixo de green):
  ```
  RAG_PRIORITY = { red: 0, yellow: 1, green: 2, no_data: 3 }
  ```

- Adicionar case `no_data` na funcao `ragBadgeClass`:
  ```
  case 'no_data': return 'bg-muted text-muted-foreground';
  ```
  (ja coberto pelo `default`, mas torna explicito)

- Atualizar o label do badge (linha 90) para incluir `no_data`:
  ```
  {kpi.ragStatus === 'green' ? 'OK'
   : kpi.ragStatus === 'yellow' ? 'Atenção'
   : kpi.ragStatus === 'red' ? 'Crítico'
   : 'Sem dados'}
  ```

- Atualizar a contagem de KPIs em atencao para excluir `no_data` (nao e risco, e ausencia de dados).

**3. `src/modules/okrs/components/wizards/mbr/__tests__/MbrPanoramaStep.test.tsx`**

- Adicionar teste para KPIs com `ragStatus: 'no_data'` exibindo badge "Sem dados".

### Resultado
- KPIs com valores preenchidos: mantem badges OK / Atencao / Critico conforme RAG real
- KPIs sem valores: exibem badge neutro "Sem dados" em cinza, sem inflar a contagem de "OK"
