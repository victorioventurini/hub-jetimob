# Plano: Importador de Contatos Externos

## Objetivo
Implementar um importador de contatos externos (partner_contacts) a partir de arquivo CSV, reaproveitando a estrutura do `InventoryImportDialog`.

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

### Tabela Alvo: `partner_contacts`
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | uuid | auto | PK |
| `bu_id` | uuid | sim* | BU do contato |
| `external_company_id` | uuid | **sim** | FK → external_companies |
| `name` | text | **sim** | Nome do contato |
| `email` | text | **sim** | Email único |
| `phone` | text | não | Telefone |
| `status` | enum | default 'active' | active/inactive |
| `created_by` | uuid | não | Quem criou |

### Entidades Relacionadas
- **external_companies**: Precisa resolver nome da empresa → ID
- **Duplicidade**: Email deve ser único por empresa

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
- Email já existe para a empresa selecionada

### Warnings (importado com aviso)
- Status inválido (usa default 'active')
- Telefone com formato estranho
- Categoria não encontrada (ignora capacidade, mas importa contato)
- Subcategoria não encontrada (ignora capacidade específica)

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
- `created_by` populado com usuário autenticado
- Emails são convertidos para lowercase
