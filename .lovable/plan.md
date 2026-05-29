## Objetivo

Permitir overrides pontuais de janelas de ritos por BU + ciclo + persona, e aplicar o primeiro override:

- **MBR (maio/2026, BU ativa):** mover de **ter 02/jun** para **qua 03/jun**.
- **Pré-MBR:** janela **seg 01/jun 00:00 → ter 02/jun 23:59**.

Fora desse caso, a regra padrão de cálculo (1ª terça + janelas em dias úteis) continua intacta.

## Mudanças

### 1. Schema — nova tabela `ritual_window_overrides`

```text
ritual_window_overrides
- id uuid pk
- bu_id uuid (FK bus, NOT NULL)
- cycle_id uuid (FK cycles, NOT NULL)
- wizard_type text NOT NULL   -- 'mbr' | 'mbr-pre' (extensível)
- anchor text NOT NULL         -- 'review_date' | 'review_date_first_month'
                               -- identifica QUAL das janelas compostas substituir
- opens_date date NOT NULL
- closes_date date NOT NULL    -- fechamento EOD
- reason text
- created_by, created_at, updated_at
- UNIQUE (bu_id, cycle_id, wizard_type, anchor)
```

- RLS: leitura para `authenticated` da BU; escrita restrita a `bu_admin`.
- GRANTs padrão (authenticated CRUD, service_role ALL).
- Sem CHECK constraint para datas — validação via trigger (`closes_date >= opens_date`).

### 2. Hook `useRitualAvailability.ts`

- Carregar overrides ativos da BU + ciclo via React Query (`queryKeys.okrs.ritualWindowOverrides(buId, cycleId)`).
- Em `WINDOW_DEFS['mbr']` e `WINDOW_DEFS['mbr-pre']`, antes de chamar `buildWindow(c.review_date_first_month, ...)` ou `buildWindow(c.review_date, ...)`, checar se existe override para aquele `(wizard_type, anchor)` e usar `{ opens: opens_date, closes: closes_date }` no lugar.
- `pickCompositeWindow` permanece igual.

### 3. Seed do override (maio/2026)

Identificar `cycle_id` de `2026-Q2` da BU ativa e inserir 2 linhas:

- `wizard_type='mbr'`, `anchor='review_date'`, opens=2026-06-03, closes=2026-06-03.
- `wizard_type='mbr-pre'`, `anchor='review_date'`, opens=2026-06-01, closes=2026-06-02.

(Inserção via `supabase--insert` após approval da migration.)

### 4. Sincronização do calendário (`ritual_occurrences`)

A edge `sync-ritual-calendar-from-cycles` materializa MBR como 1ª terça do mês. Para refletir o override:

- Após inserir os overrides, executar **update direto** em `ritual_occurrences` da BU ativa para `wizard_type IN ('mbr','mbr-pre')` cuja `planned_date` cai em 02/jun/2026, ajustando para as novas datas (mbr → 03/jun, mbr-pre → 02/jun ou 01/jun).
- Override permanente da edge function fica fora deste escopo (ela continua gerando 1ª terça; o override só corrige o caso pontual).

### 5. Nada de UI nova

Sem tela de gestão de overrides nesta entrega — é uma exceção pontual aplicada via migration + seed. A tabela fica pronta para futura UI.

## Detalhes técnicos

- Query key novo em `src/lib/queryKeys/okrs.ts`: `ritualWindowOverrides(buId, cycleId)`.
- Cliente: `buScopedClient` (dado operacional BU-scoped).
- `useRitualAvailability` recebe overrides como parâmetro opcional ou os busca internamente quando há ciclo ativo; manter o hook síncrono para o consumidor — usar `useQuery` interno com `enabled: !!cycle?.id`.
- Documentar comportamento em `mem://features/okrs/mbr-multi-date-governance` (atualizar) com nota sobre override.

## Fora de escopo

- Mudar a regra padrão de geração de ciclos (`generateCycles.ts`).
- Suporte a janelas com precisão de hora (corte 12h descartado pelo usuário).
- UI de CRUD de overrides.
