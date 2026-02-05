
# Plano: Unificação da Gestão de Usuários e Permissões

## Objetivo

Consolidar a gestão de usuários e permissões em uma única interface (`/users`), eliminando a necessidade de navegar para `/settings/permissions` para configurar acessos.

---

## Situação Atual

| Interface | Rota | Funcionalidade |
|-----------|------|----------------|
| Jetimobers | `/users` | CRUD de perfis (nome, cargo, time, etc.) |
| Permissões BU | `/settings/permissions` | Atribuição de templates de permissão |

**Problemas:**
1. Duas interfaces separadas para gerenciar o mesmo usuário
2. Processo em múltiplos passos: criar usuário → ir para settings → buscar usuário → configurar permissões
3. Informações de permissão não visíveis na listagem principal

---

## Solução Proposta

### Estratégia: Composição com Componentes Existentes

Reutilizar o `UserPermissionsV2Sheet` existente, integrando-o diretamente na página `/users` e no `JetimoberDialog`.

### Alterações Planejadas

#### 1. Adicionar Aba de Permissões no JetimoberDialog

Transformar o dialog de criação/edição em um componente com abas:

```
┌─────────────────────────────────────────────┐
│  Editar Jetimober                           │
├─────────────────────────────────────────────┤
│ [ Perfil ] [ Permissões ]                   │
├─────────────────────────────────────────────┤
│                                             │
│  (conteúdo da aba selecionada)              │
│                                             │
└─────────────────────────────────────────────┘
```

- **Aba Perfil:** Formulário existente (nome, cargo, time, etc.)
- **Aba Permissões:** Integrar `UserPermissionsV2Sheet` inline (não como sheet, mas como conteúdo)

#### 2. Mostrar Indicador de Permissões na Tabela

Adicionar coluna visual na `UsersTable` mostrando papel/permissões:

| Usuário | Cargo | Time | Permissões |
|---------|-------|------|------------|
| João Silva | Dev | Tech | Admin 🛡️ |
| Maria Costa | PM | Produto | 3 templates |
| Carlos... | QA | Tech | Base |

#### 3. Ação Rápida "Gerenciar Permissões"

No dropdown de ações de cada linha, adicionar opção para abrir diretamente o sheet de permissões:

```
[⋮] 
├── Editar
├── Gerenciar Permissões  ← NOVA AÇÃO
├── ─────────────────────
└── Excluir
```

#### 4. Fluxo de Criação Melhorado

Ao criar novo usuário, oferecer configuração de permissões no mesmo fluxo:

```
Passo 1: Email → Passo 2: Dados → Passo 3: Permissões (opcional)
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Users.tsx` | Adicionar estado e handler para abrir sheet de permissões |
| `src/components/users/UsersTable.tsx` | Adicionar coluna de permissões + ação no dropdown |
| `src/components/users/JetimoberDialog.tsx` | Adicionar aba de permissões (reutilizando lógica do UserPermissionsV2Sheet) |

## Componentes Reutilizados (Sem Duplicação)

| Componente | Uso |
|------------|-----|
| `UserPermissionsV2Sheet` | Aberto diretamente da tabela de usuários |
| `useUserTemplatesV2` | Hook para buscar/atribuir templates |
| `useBuUsers` | Já retorna dados de permissão (role_in_bu, has_admin_template) |

---

## Permissões Necessárias

| Ação | Permission Key |
|------|----------------|
| Ver coluna de permissões | `users.profile.manage:bu` (ou isWildcard) |
| Editar permissões | `users.profile.manage:bu` (ou isWildcard) |

---

## Detalhes Técnicos

### Modificação em UsersTable.tsx

```typescript
// Nova coluna na tabela
<TableHead>Permissões</TableHead>

// Célula com indicador
<TableCell>
  {profile.role_in_bu === 'admin' ? (
    <Badge variant="default"><Crown /> Admin</Badge>
  ) : (
    <span className="text-muted-foreground text-sm">
      {profile.template_count || 'Base'}
    </span>
  )}
</TableCell>

// Nova ação no dropdown
<DropdownMenuItem onClick={() => onManagePermissions(profile)}>
  <Shield className="h-4 w-4 mr-2" />
  Gerenciar Permissões
</DropdownMenuItem>
```

### Modificação em Users.tsx

```typescript
// Estado para sheet de permissões
const [permissionsUser, setPermissionsUser] = useState<BuUser | null>(null);

// Handler passado para tabela
const handleManagePermissions = (profile: ProfileWithTeam) => {
  // Converter ProfileWithTeam para BuUser format
  setPermissionsUser(mapToBuUser(profile));
};

// Renderizar sheet (reutilizado)
<UserPermissionsV2Sheet
  open={!!permissionsUser}
  onOpenChange={(open) => { if (!open) setPermissionsUser(null); }}
  user={permissionsUser}
/>
```

### Hook de Dados Atualizado

O `useBuUsers` já retorna `has_admin_template` e `role_in_bu`. Para a tabela principal, precisamos adicionar contagem de templates:

```typescript
// Adicionar ao retorno do RPC ou query
template_count: number
```

---

## Fluxo de UX Resultante

### Antes (2 interfaces)
```
/users → Criar usuário → Salvar
                ↓
/settings/permissions → Buscar usuário → Abrir sheet → Configurar
```

### Depois (interface unificada)
```
/users → Criar usuário → [Aba Permissões] → Salvar
   ou
/users → Tabela → [⋮] Gerenciar Permissões → Configurar
```

---

## Critérios de Sucesso

| Critério | Métrica |
|----------|---------|
| Zero navegação para /settings/permissions | Toda gestão em /users |
| Componentes reutilizados | UserPermissionsV2Sheet intacto |
| Permissões respeitadas | Só quem pode gerenciar vê as opções |
| Coluna de permissões visível | Feedback visual na tabela |

---

## Estimativa

| Fase | Tempo |
|------|-------|
| Adicionar coluna + ação na tabela | 30min |
| Integrar sheet na página Users | 30min |
| Adicionar aba no JetimoberDialog | 1h |
| Testes e ajustes | 30min |
| **Total** | **~2.5h** |

---

## Nota sobre /settings/permissions

A rota `/settings/permissions` pode ser mantida como atalho para administradores que preferem uma visão focada em permissões, ou pode ser deprecada gradualmente. A decisão pode ser tomada após a implementação.
