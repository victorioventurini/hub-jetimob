

# Plano: Geração Automática de Ciclos + Janelas de Acesso a Rituais

## Auditoria TCR/Canonical Realizada

| Doc | Versão | Impacto no Plano |
|-----|--------|-----------------|
| TCR v3.21.0 | ✅ Revisado | Schema `cycles` confirmado com `planning_date`, `review_date`, `retro_date` (nullable) |
| DEVELOPMENT_STANDARDS v1.27.0 | ✅ Revisado | POST-BU: `useOptionalBuClient()` para CyclesTab (já usado). Sem `select('*')` |
| BU_SCOPED_SUPABASE_RULES v4.1.0 | ✅ Revisado | CyclesTab usa `useOptionalBuClient` (correto — settings page, pré-BU safe) |
| QUERY_KEYS_STANDARD | ✅ Revisado | Registrar nova key. Nota: CyclesTab tem inline key `['okr-auto-cycle-transition']` (pré-existente, fora do escopo) |
| IDENTITY_CONVENTION | ✅ N/A | Nenhuma operação de identidade neste plano |
| PERMISSIONS_AND_RBAC_MODEL | ✅ Revisado | Permissão `okrs.settings.manage:bu` já usada no CycleFormDialog — reusar para geração |

**Violação pré-existente identificada (fora do escopo):** Múltiplas inline query keys `['qbr', ...]` em QbrPrePage, QbrPostPage, QbrPreCLevelPage. Não serão corrigidas neste plano.

---

## Parte 1 — Geração Automática de Ciclos

### 1.1 Função pura de geração

**Novo:** `src/modules/okrs/utils/generateCycles.ts`

Função `generateCyclesForYears(startYear, count)` — sem dependências externas, testável:

- Para cada ano: 1 anual + 4 trimestrais
- Datas conforme fórmulas do prompt (Q planning = start + 63d, review = start + 35d, retro = start + 77d)
- Retorna objetos com `_tempParentKey` para vinculação parent→child após insert
- Todos com `status: 'planning'`

### 1.2 Botão na CyclesTab

**Editar:** `src/modules/okrs/components/settings/CyclesTab.tsx`

- Verificar se existem ciclos anuais para `currentYear`, `currentYear+1`, `currentYear+2`
- Se faltam anos → exibir card com botão **"Gerar ciclos automaticamente"** + `AlertDialog` de confirmação com preview
- Mutation: gerar → filtrar anos existentes → inserir anuais → obter IDs → inserir trimestrais com `parent_cycle_id` real
- Invalidar `settingsCycles` e `cyclesList`

### 1.3 Exibição de datas de rituais por ciclo

**Novo:** `src/modules/okrs/components/settings/CycleRitualDates.tsx`

Sub-linha compacta abaixo de cada trimestre mostrando:
```text
MBR: 03/fev  ·  Pré-QBR: 09/mar  ·  QBR: 23/mar
```
Badges: cinza (futuro), verde-claro (passado). Fase 2 para status de execução.

**Editar:** `CyclesTab.tsx` para renderizar `CycleRitualDates` dentro de cada quarter row.

---

## Parte 2 — Janelas de Acesso a Rituais

### 2.1 Hook centralizado

**Novo:** `src/modules/okrs/hooks/useRitualAvailability.ts`

```typescript
interface RitualAvailability {
  isAvailable: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  reason: 'not_yet' | 'expired' | 'no_cycle' | 'no_dates' | 'available';
  message: string;
}
```

Mapeamento conforme tabela do prompt. Fallback permissivo quando datas são null (`reason: 'no_dates'`, `isAvailable: true`).

Hook é puramente computacional — sem query ao banco.

### 2.2 Tela informativa

**Novo:** `src/modules/okrs/components/wizards/shared/RitualUnavailableScreen.tsx`

- Usa `FullPageWizardShell` como container (reutiliza componente existente)
- Ícone + nome do rito + mensagem contextual + botão "Voltar"
- Mensagens em PT-BR conforme cenário (não abriu / expirou / ciclo encerrado)

### 2.3 Integração nas páginas

Guard adicionado em **11 páginas** de rituais, após guards existentes (ciclo ativo, team selecionado):

| Página | Ciclo de referência |
|--------|-------------------|
| `CollaboratorCheckinPage` | `activeCycle` |
| `LeaderPrepPage` | `activeCycle` |
| `TeamCheckinPage` | `activeCycle` |
| `ManagersCheckinPage` | `activeCycle` |
| `CLevelCheckinPage` | `activeCycle` |
| `MbrPrePage` | `activeCycle` |
| `MbrPage` | `activeCycle` |
| `QbrPrePage` | `activeQuarterlyCycle` |
| `QbrPreCLevelPage` | `activeQuarterlyCycle` |
| `QbrMeetingPage` | `activeQuarterlyCycle` |
| `QbrPostPage` | `activeQuarterlyCycle` |

Padrão:
```typescript
const availability = useRitualAvailability('qbr-pre', quarterlyCycle);
if (!availability.isAvailable) {
  return <RitualUnavailableScreen wizardType="qbr-pre" availability={availability} />;
}
```

---

## Resumo de arquivos

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `src/modules/okrs/utils/generateCycles.ts` | **Novo** | Função pura de geração |
| `src/modules/okrs/hooks/useRitualAvailability.ts` | **Novo** | Hook de janela de disponibilidade |
| `src/modules/okrs/components/wizards/shared/RitualUnavailableScreen.tsx` | **Novo** | Tela informativa |
| `src/modules/okrs/components/settings/CycleRitualDates.tsx` | **Novo** | Datas de rituais inline |
| `src/modules/okrs/components/settings/CyclesTab.tsx` | **Editar** | Botão geração + CycleRitualDates |
| 11 páginas de rituais | **Editar** | Guard `useRitualAvailability` |

## O que não muda

- Nenhuma migration (colunas já existem)
- `qbr_status` e máquina de estados intactos
- Ciclos gerados com `status = 'planning'` — ativação via fluxo normal
- `CycleFormDialog` não muda (edição manual continua)
- Ciclos existentes não são sobrescritos

