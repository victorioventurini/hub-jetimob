# Plano: Importador de Contatos Externos

## Objetivo
Implementar um importador de contatos externos (partner_contacts) a partir de arquivo CSV, reaproveitando a estrutura do `InventoryImportDialog`.

---

## Pré-Checklist Consultado ✅

| Documento | Status | Descobertas Relevantes |
|-----------|--------|------------------------|
| TCR v3.0.0 | ✅ | `partner_contacts` é **GLOBAL** por email (v2.46.0), usar `partner_contact_bu_associations` para BU |
| DATA_MODEL_REGISTRY.md | ✅ | Tabelas: `partner_contacts`, `partner_contact_capabilities`, `partner_contact_bu_associations` |
| IDENTITY_CONVENTION.md | ✅ | Usar `profile_id` para `created_by` (não auth.uid) |
| EXTERNAL_USER_IDENTITY_PATTERN.md | ✅ | Contatos externos seguem padrão diferente de usuários internos |

---

## Análise de Contexto

### Estrutura Existente (Referência)
- `src/modules/assets/components/settings/InventoryImportDialog.tsx` - Importador de inventário com:
  - Upload de CSV
  - Parsing com tratamento de campos entre aspas
  - Validação Zod
  - Resolução de entidades relacionadas (categorias, localizações, usuários)
  - Progresso visual
  - Resumo de resultados (criados, ignorados, warnings)
  - Download de template

### Tabela Alvo: `partner_contacts` (TCR v2.46.0+)
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | uuid | auto | PK |
| `bu_id` | uuid | **DEPRECATED** | Manter para backward compat, mas criar association |
| `external_company_id` | uuid | **sim** | FK → external_companies |
| `name` | text | **sim** | Nome do contato |
| `email` | text | **sim** | Email **ÚNICO GLOBAL** (lowercase) |
| `phone` | text | não | Telefone |
| `status` | enum | default 'active' | active/inactive |
| `profile_user_id` | uuid | não | FK profiles se usuário existir |

### Tabela: `partner_contact_bu_associations` (v2.46.0)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `partner_contact_id` | uuid | FK → partner_contacts |
| `bu_id` | uuid | FK → bu_units |
| `is_active` | bool | Se ativo na BU |
| `created_by` | uuid | FK → profiles (quem criou) |

### Tabela: `partner_contact_capabilities`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `contact_id` | uuid | FK → partner_contacts |
| `external_company_id` | uuid | FK → external_companies |
| `category_id` | uuid | FK → ticket_categories |
| `subcategory_id` | uuid | FK → ticket_subcategories (null = generalista) |

### Entidades Relacionadas
- **external_companies**: Empresa já selecionada no contexto do dialog
- **ticket_categories**: Resolver nome → ID para capacidades
- **ticket_subcategories**: Resolver nome → ID para capacidades específicas
- **Duplicidade**: Email é **ÚNICO GLOBAL** (não apenas por empresa)

---

## Decisões de Design

### 1. Escopo do Importador
O importador será específico para uma empresa parceira selecionada, pois:
- Simplifica a UI (empresa já pré-selecionada)
- Evita erros de mapeamento de empresa
- Segue o padrão de "adicionar contatos a uma empresa"

### 2. Colunas do CSV
| Coluna CSV | Mapeamento | Obrigatório |
|------------|------------|-------------|
| `name` | name | ✅ |
| `email` | email | ✅ |
| `phone` | phone | ❌ |
| `status` | status (active/inactive) | ❌ (default: active) |
| `categories` | partner_contact_capabilities | ❌ |

**Formato da coluna `categories`:**
- Lista de categorias separadas por ponto-e-vírgula (`;`)
- Cada item pode ser: `"NomeCategoria"` (generalista) ou `"NomeCategoria > NomeSubcategoria"` (específico)
- Exemplo: `"Suporte > Financeiro; Suporte > Técnico; Comercial"`

### 3. Validações
- Email único dentro da mesma empresa
- Email com formato válido
- Nome não vazio
- Phone normalizado (apenas dígitos)
- Categorias/subcategorias devem existir na BU atual (warnings se não encontradas)

### 4. Fluxo de Convite
- Opção de enviar convite automático para cada contato importado
- Default: **não enviar** (evitar spam em importações grandes)

---

## Componentes a Criar

### 1. `PartnerContactImportDialog.tsx`
Localização: `src/modules/tickets/components/settings/PartnerContactImportDialog.tsx`

Reutiliza de `InventoryImportDialog`:
- ✅ Estrutura do Dialog
- ✅ FileInputRef + drag-and-drop
- ✅ parseCSV (com tratamento de aspas)
- ✅ Progress bar
- ✅ Result summary (criados, ignorados, warnings)
- ✅ Download template button

Customizações específicas:
- Schema Zod para contatos
- Props: `companyId`, `companyName`
- Validação de email duplicado
- Checkbox para enviar convites

### 2. Template CSV
Localização: `public/templates/partner-contacts-import-template.csv`

Conteúdo:
```csv
name,email,phone,status,categories
"João Silva","joao.silva@empresa.com.br","+55 11 99999-9999","active","Suporte > Financeiro; Suporte > Técnico"
"Maria Santos","maria@empresa.com.br","","active","Comercial"
"Carlos Pereira","carlos@empresa.com.br","+55 21 88888-8888","active","Suporte"
```

**Formato da coluna `categories`:**
- `"Suporte > Financeiro; Suporte > Técnico"` = 2 subcategorias específicas
- `"Comercial"` = categoria generalista (atende todas subcategorias)
- `"Suporte"` = generalista na categoria Suporte

### 3. Atualização: `PartnerContactsTab.tsx`
- Adicionar botão "Importar" ao lado do "Novo Contato"
- Estado para controlar abertura do dialog

---

## Componente Centralizado (Opcional Futuro)

Identificamos padrões comuns entre os importadores:
- CSV parsing
- File upload UI
- Progress tracking
- Result display

**Decisão**: Para este sprint, criar o componente específico. Refatorar para componente genérico em sprint futuro quando tivermos 3+ importadores.

---

## Tarefas de Implementação

| # | Tarefa | Arquivo |
|---|--------|---------|
| 1 | Criar template CSV | `public/templates/partner-contacts-import-template.csv` |
| 2 | Criar PartnerContactImportDialog | `src/modules/tickets/components/settings/PartnerContactImportDialog.tsx` |
| 3 | Adicionar botão de importação na tab | `src/modules/tickets/components/settings/PartnerContactsTab.tsx` |

---

## Validações e Regras de Negócio

### Linhas Ignoradas (não importadas)
- Nome vazio
- Email vazio
- Email inválido (regex)

### Warnings (importado com aviso)
- Status inválido (usa default 'active')
- Telefone com formato estranho
- Categoria não encontrada (ignora capacidade, mas importa contato)
- Subcategoria não encontrada (ignora capacidade específica)
- **Email já existe global**: Contato não é criado novamente, mas é **associado à BU atual** e capacidades são adicionadas

---

## Fluxo de Importação (Regras v2.46.0)

Para cada linha do CSV:
1. Validar campos obrigatórios (name, email)
2. Normalizar email para lowercase
3. Verificar se email já existe em `partner_contacts`:
   - **SE EXISTE**: 
     - Verificar se já está associado à BU atual
     - Se não, criar `partner_contact_bu_association`
     - Warning: "Contato já existente, adicionado à BU"
   - **SE NÃO EXISTE**: Criar novo registro com `external_company_id` da empresa selecionada
4. Parsear coluna `categories` e criar `partner_contact_capabilities`
5. Invalidar queries afetadas

---

## Fluxo de Usuário

1. Usuário acessa `/tickets/settings?tab=contacts`
2. Seleciona uma empresa no filtro
3. Clica em "Importar Contatos"
4. Baixa template (opcional)
5. Seleciona arquivo CSV
6. Opcionalmente marca "Enviar convite para novos contatos"
7. Clica "Importar"
8. Vê progresso e resultado final
9. Lista de contatos é atualizada automaticamente

---

## QueryKeys Impactadas
- `queryKeys.tickets.partnerContacts(buId, companyId)` - invalidar após importação
- `queryKeys.tickets.contactCapabilitiesPrefix()` - invalidar após criação de capacidades
- `queryKeys.tickets.companyContactCapabilitiesPrefix()` - invalidar após criação de capacidades

---

## Considerações de Segurança
- Importação usa `useBuScopedSupabase` (respeita RLS)
- `created_by` populado com `profile_id` do usuário autenticado (via `useIdentity().realProfileId`)
- Emails são convertidos para lowercase para garantir unicidade
- Validação Zod no frontend + constraints no banco

---

## Hooks Canônicos Utilizados
| Hook | Uso |
|------|-----|
| `useBuScopedSupabase()` | Cliente BU-scoped para todas as operações |
| `useIdentity()` | Obter `realProfileId` para `created_by` |
| `useBu()` | Obter `buId` atual |
| `useTicketCategories('external')` | Resolver nomes de categorias → IDs |
| `usePartnerContacts(companyId)` | Verificar emails existentes |
