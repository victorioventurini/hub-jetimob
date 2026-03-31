

# Plano: Unicidade de Rascunhos por Time + Melhorias no Histórico

## Problema

1. **localStorage key** (`okr-draft.${wizardType}`) não inclui `teamId` — líder com 2 times sobrescreve rascunho do Time A ao abrir ritual para Time B
2. **DB query** para sessão existente não filtra por `team_id` — pode retornar rascunho do time errado
3. **saveDraftMutation** não verifica duplicatas antes de inserir
4. **WIZARD_TYPE_OPTIONS** no filtro do histórico está incompleto — faltam `qbr-pre`, `qbr-pre-clevel`, `qbr-meeting`, `qbr-post`, `mbr-pre`

---

## Arquivos a modificar (3)

### 1. `src/modules/okrs/hooks/useGenericWizardDraft.ts`

**a) `getDraftKey` com escopo de time:**
```typescript
function getDraftKey(wizardType: WizardPersona, teamId?: string | null): string {
  return teamId ? `okr-draft.${wizardType}.${teamId}` : `okr-draft.${wizardType}`;
}
```
Atualizar `storageKey` para usar `getDraftKey(wizardType, teamId)`.

**b) `existingSessionQuery` — filtrar por teamId:**
```typescript
// Após .eq('status', 'in_progress')
if (teamId) {
  query = query.eq('team_id', teamId);
} else {
  query = query.is('team_id', null);
}
```
Atualizar `queryKey` para incluir `teamId`: `wizardDraftGeneric(profile?.id, wizardType, teamId)`.

**c) `saveDraftMutation` — check antes de inserir:**
No branch `else` (criação), verificar se já existe uma sessão `in_progress` para o mesmo `(wizard_type, started_by, team_id)`. Se existir, reutilizar o `id` em vez de inserir nova linha.

### 2. `src/lib/queryKeys/okrs.ts`

Atualizar a assinatura de `wizardDraftGeneric` para aceitar `teamId` opcional:
```typescript
wizardDraftGeneric: (userId: string, wizardType: string, teamId?: string | null) =>
  ['okr-wizard-draft-generic', userId, wizardType, teamId ?? 'global'] as const,
```

### 3. `src/modules/okrs/pages/RitualHistoryPage.tsx`

Adicionar os tipos faltantes em `WIZARD_TYPE_OPTIONS`:
```typescript
{ value: 'mbr-pre', label: 'Pré-MBR' },
{ value: 'qbr-pre', label: 'Pré-QBR (Líder)' },
{ value: 'qbr-pre-clevel', label: 'Pré-QBR (C-Level)' },
{ value: 'qbr-meeting', label: 'Reunião QBR' },
{ value: 'qbr-post', label: 'Pós-QBR' },
```

### 4. `src/modules/okrs/hooks/__tests__/useGenericWizardDraft.test.ts`

Atualizar testes para refletir novo formato de chave com `teamId`:
- `okr-draft.team-checkin.team-123` (com team)
- `okr-draft.clevel-checkin` (sem team)

### 5. `src/lib/queryKeys/okrs.test.ts`

Atualizar teste de `wizardDraftGeneric` para incluir `teamId`.

---

## O que não muda

- Nenhum componente de wizard — todos já passam `teamId` como prop
- Nenhuma migração de banco — lógica puramente no hook
- Rascunhos antigos no localStorage (key antiga) serão ignorados; o líder recomeça o rascunho (aceitável pois não há `in_progress` ativos relevantes)

