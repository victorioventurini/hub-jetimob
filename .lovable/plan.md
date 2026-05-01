## Pré-checklist (executado)

- ✅ TCR (`docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`) — linha 843: **"Gate de comentário: Obrigatório se RAG = `at_risk` ou `off_track`"** é a regra canônica de produto. Linhas 817 e 2916 confirmam que `kpi_calculate_rag(value, target, direction)` é o **SSOT** do cálculo de RAG.
- ✅ Memória `mem://features/kpis/kpi-value-entry-ssot` — `KpiValueEntryForm` é SSOT do form e o gating de notes é responsabilidade do **consumidor** (rito).
- ✅ Função SQL canônica lida no banco — usa thresholds **90/70** e enum `kpi_direction` com apenas `up | down` (sem `maintain`).

## Diagnóstico

A regra de produto (notes obrigatórias quando RAG ≠ `on_track`) está **correta** e não deve mudar. O bug está no **cálculo client-side de RAG estimado** dentro de `CollaboratorKpiStep.tsx`, que **diverge** da função canônica `kpi_calculate_rag`:

| Aspecto | `kpi_calculate_rag` (SSOT, banco) | `estimatedRag` atual (client) | Efeito |
|---------|-----------------------------------|-------------------------------|--------|
| Threshold `on_track` | ≥ 90% | ≥ 70% | Diferente — mas mais permissivo |
| Threshold `at_risk` | ≥ 70% | ≥ 40% | Diferente |
| Fórmula `down` | `target/value*100` | `(target - value + target)/target*100` | **Errada** — fica < 70% mesmo com valor melhor que target |
| `direction = 'maintain'` | Não existe no enum | Tratado com `Math.abs` | Caso fantasma; cai em ramo errado |
| `value = 0` ou `target = 0` | Retorna `no_data` (sem gating) | Não tratado | Pode forçar gating sem dado válido |

**Caso do usuário (EBITDA, direction=`up`, target=20%, value=25%):**
- SSOT: `25/20*100 = 125% → on_track` → notes opcional ✅
- Client atual: `25/20*100 = 125%` cai em `on_track` (≥70). Aqui dá certo por sorte.
- Mas para `direction=down` com value < target (melhor que esperado), a fórmula client infla acima de 100%, então também acaba em `on_track`. **Reproduzir o bug exato exige confirmação** — pode estar acontecendo em KPI com `target=0`, `value=0`, ou algum KPI marcado como `direction=down` cuja fórmula gera valor < 70.

Independente do caso exato, o caminho correto é **eliminar a divergência** alinhando o cálculo client ao SSOT do banco.

## Mudança proposta

### 1. Criar helper canônico no frontend espelhando `kpi_calculate_rag`

Novo arquivo: `src/modules/kpis/utils/rag.ts`

```ts
export type KpiDirection = 'up' | 'down';
export type KpiRagStatus = 'on_track' | 'at_risk' | 'off_track' | 'no_data';

export function calculateKpiRag(
  value: number | null | undefined,
  target: number | null | undefined,
  direction: KpiDirection,
): KpiRagStatus {
  if (value == null || target == null || value === 0 || target === 0) return 'no_data';
  const pct = direction === 'up' ? (value / target) * 100 : (target / value) * 100;
  if (pct >= 90) return 'on_track';
  if (pct >= 70) return 'at_risk';
  return 'off_track';
}
```

Exportar via `src/modules/kpis/utils/index.ts`. Esse helper passa a ser o SSOT client de RAG, reutilizável em qualquer rito/card que precise estimar RAG antes do save.

### 2. Refatorar `CollaboratorKpiStep.tsx`

- Remover o bloco `useMemo` de `estimatedRag` (lógica errada com thresholds 70/40, fórmula custom de `down`, `maintain` fantasma).
- Substituir por `calculateKpiRag(currentValue, kpi.target_value, kpi.direction)`.
- `notesRequired` continua como `!!estimatedRag && estimatedRag !== 'on_track'`, mas agora também ignora `no_data` (sem gating quando não há base para calcular).
- O badge "Status estimado" no card continua exibindo o resultado.

### 3. Tipagem

Validar que `kpi.direction` na UI está tipada como `'up' | 'down'`. Se ainda houver `'maintain'` em algum tipo TS legado, remover (o enum no banco não tem). Se aparecer `'maintain'` em runtime, normalizar para `'up'` com aviso de tipo.

### 4. Testes

`src/modules/okrs/components/wizards/collaborator/__tests__/CollaboratorKpiStep.test.tsx` — adicionar/atualizar:
- `up`, target=20, value=25 → `on_track` → notes opcional (caso do usuário)
- `up`, target=20, value=18 → `at_risk` (90%) → notes obrigatória
- `up`, target=20, value=10 → `off_track` (50%) → notes obrigatória
- `down`, target=10, value=8 → `on_track` (125%) → notes opcional
- `down`, target=10, value=12 → `at_risk` (~83%) → notes obrigatória
- `target=0` ou `value=0` → `no_data` → notes opcional

Novo: `src/modules/kpis/utils/__tests__/rag.test.ts` cobrindo os mesmos casos do helper isoladamente.

## Fora de escopo

- Não alterar `KpiValueEntryForm` (SSOT do form).
- Não alterar a função SQL `kpi_calculate_rag` nem schema/RLS.
- Não mexer no gating de notes em outros ritos (QBR, MBR, Team Check-in, Leader Prep) **nesta entrega** — fica registrado como follow-up: caso esses ritos também recalculem RAG client-side, devem migrar para `calculateKpiRag` do helper canônico.
- Sem mudanças em `/kpis` ou na UI de detalhes.

## Por que esta abordagem

- Mantém a regra de produto canônica (TCR linha 843) intacta.
- Elimina divergência entre client e SSOT do banco — qualquer mudança futura nos thresholds acontece em **dois lugares apenas** (função SQL + helper TS) com mesma fórmula.
- Não duplica componentes — apenas centraliza um helper que hoje está inline e errado.