# Plano — Escopar Responsável da KR ao time correto

## Contexto
No `TeamKrFormDialog` (modal canônico de criação/edição de KRs, inclusive contribuidoras em OKRs compartilhadas), o campo **Responsável** usa `BuUserSelect` sem `teamId`, listando todos usuários da BU. Deve listar apenas usuários do time dono/contribuidor da KR (com subtimes), seguindo o padrão `team-filter-includes-subteams`.

## Mudanças

### 1. `src/modules/okrs/components/TeamKrFormDialog.tsx`
Passar `teamId` e `includeSubteams` para o `BuUserSelect` do campo Responsável:

```tsx
<BuUserSelect
  value={ownerUserId || undefined}
  onValueChange={(id) => setOwnerUserId(id || null)}
  // ...props existentes
  teamId={teamId}
  includeSubteams
/>
```

`teamId` já é prop obrigatória do dialog e representa o time dono (criação própria) ou contribuidor (criação em OKR compartilhada) — em ambos os casos é o escopo correto.

### 2. `.lovable/memory/features/okrs/contributor-kr-uses-modal.md`
Adicionar nota: "O campo Responsável no `TeamKrFormDialog` é escopado pelo `teamId` do dialog (com `includeSubteams`), garantindo que apenas membros do time dono/contribuidor apareçam."

## Padrões respeitados
- `mem://standards/users/team-filter-includes-subteams` — uso canônico do `BuUserSelect` com `teamId` + `includeSubteams`.
- `src/components/selects/index.ts` — reutiliza componente canônico, sem reimplementar select inline.
- Sem alterações de RLS, schema ou hooks — apenas propagação de prop existente.

## Validação manual
1. Abrir KR contribuidora em OKR compartilhada do BizOps (a partir do time Comercial) → Responsável deve listar apenas membros do Comercial e subtimes.
2. Editar KR existente do próprio time → continua listando membros do time dono.