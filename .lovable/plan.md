

## Plano: Auto-preenchimento de Time Responsável em Linhas Telefônicas

### Contexto técnico (validado)

- `v_bu_active_profiles` já retorna `team_id` e `team_name` por perfil
- `BuUserSelect` já faz query separada para o perfil selecionado (`selectedProfileData`) que inclui `team_id` e `team_name` — porém NÃO expõe esses dados via callback (apenas `id` e `displayName` via `onUserSelected`)
- `TeamSelect` canônico existe em `src/components/selects/TeamSelect.tsx` com suporte a `disabled`, `value`, `onValueChange`
- `PhoneLineHistory` usa `FIELD_LABELS` para traduzir campos no histórico

### Alterações

#### 1. Migration: `responsible_team_id` em `asset_phone_lines`
```sql
ALTER TABLE asset_phone_lines
  ADD COLUMN responsible_team_id UUID REFERENCES teams(id);
CREATE INDEX idx_asset_phone_lines_responsible_team_id
  ON asset_phone_lines(responsible_team_id) WHERE responsible_team_id IS NOT NULL;
```

#### 2. Estender callback do `BuUserSelect`
- Ampliar `BuUserSelectedMeta` para incluir `teamId?: string | null` e `teamName?: string | null`
- No `handleValueChange`, propagar `team_id` e `team_name` do perfil encontrado
- Mudança retrocompatível (campos opcionais)

#### 3. Hook `usePhoneLines.ts`
- Adicionar `responsible_team_id` ao tipo `PhoneLine` e `CreatePhoneLineInput`
- Adicionar join: `responsible_team:teams!asset_phone_lines_responsible_team_id_fkey(id, name)`
- Incluir na mutation de create/update

#### 4. Dialog `PhoneLineDialog.tsx`
- Adicionar `responsible_team_id` ao schema zod (nullable, optional)
- Ao selecionar responsável via `onUserSelected`, auto-preencher `responsible_team_id` com o `teamId` recebido
- Ao limpar responsável, limpar o time
- Renderizar `TeamSelect` canônico (com `disabled` quando auto-preenchido, editável via botão se necessário) logo abaixo do campo responsável
- Incluir no payload de submit

#### 5. Tabela `PhoneLineTable.tsx`
- Adicionar coluna "Time responsável" exibindo `item.responsible_team?.name ?? "—"`

#### 6. Histórico `PhoneLineHistory.tsx`
- Adicionar `responsible_team_id: "Time responsável"` ao `FIELD_LABELS`

### Componentes reutilizados (sem duplicação)
- `BuUserSelect` — estendido (callback ampliado)
- `TeamSelect` — usado como display com auto-fill
- `v_bu_active_profiles` — fonte do `team_id` por perfil (já disponível)

### Arquivos modificados
| Arquivo | Tipo |
|---------|------|
| `migration .sql` | Criado |
| `src/components/selects/BuUserSelect.tsx` | Editado (callback meta) |
| `src/modules/assets/hooks/usePhoneLines.ts` | Editado |
| `src/modules/assets/components/phone-lines/PhoneLineDialog.tsx` | Editado |
| `src/modules/assets/components/phone-lines/PhoneLineTable.tsx` | Editado |
| `src/modules/assets/components/phone-lines/PhoneLineHistory.tsx` | Editado |

