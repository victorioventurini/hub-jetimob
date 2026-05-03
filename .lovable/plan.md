## Problema

No dashboard `/kpis`, ao filtrar por Time = "Comercial", o KPI **MRR Commit** não aparece, mesmo o time Comercial sendo o **Time Responsável** por ele.

**Causa raiz:** o filtro só compara `team_id` (dono direto). KPIs Globais (`scope=org`) ou de Área (`scope=area`) têm `team_id = NULL`, mas podem ter `responsible_team_id = <Comercial>` (campo "Time Responsável" da Responsabilidade Operacional, conforme a tela anexada). Esses KPIs ficam invisíveis no filtro.

Hoje em `useKpiData.ts` (linha 135-137) e `useKpiEvolutionList.ts` (linha 116-118):
```ts
if (teamId) {
  query = query.eq("team_id", teamId);   // ignora responsible_team_id
}
```

## Solução

Quando o filtro de time estiver ativo, retornar KPIs onde **`team_id = X` OU `responsible_team_id = X`**. Isso é consistente com `useCanEditKpi`, que já trata `responsible_team_id` como ownership operacional para fins de permissão de update.

### Mudanças

1. **`src/modules/kpis/hooks/useKpiData.ts`** — substituir o `.eq("team_id", teamId)` por:
   ```ts
   query = query.or(`team_id.eq.${teamId},responsible_team_id.eq.${teamId}`);
   ```

2. **`src/modules/kpis/hooks/useKpiEvolutionList.ts`** — mesma substituição no bloco equivalente.

3. **Sem mudança de UX/label** necessária: o rótulo "Todos os times" / TeamSelect já comunica "time" de forma genérica, e o comportamento esperado pelo usuário é justamente esse (ver KPIs pelos quais o time responde).

### Fora do escopo

- Filtro de Área já cobre `area_id` direto; não vamos expandir para `responsible_area_id` neste plano (não foi pedido e merece avaliação separada para evitar mudanças não solicitadas).
- Permissões e RLS não mudam (apenas predicado de leitura).
- `useKpisForWizardV2` não é afetado (usa `responsible_team_id` como filtro principal em outro fluxo).

### Validação

- Acessar `/kpis?team_id=<comercial>` e confirmar que MRR Commit aparece.
- Confirmar que filtrar por outro time não traz KPIs alheios.
- Verificar que time sem KPI direto nem responsável continua retornando vazio.
