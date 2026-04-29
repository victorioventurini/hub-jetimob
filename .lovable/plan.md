# Replicação Tickets Externos: Jetimob → Jet Experience

## Objetivo
Migração one-shot, idempotente e somente de dados (sem schema/RLS/código) para que abrir um ticket externo na BU **Jet Experience** ofereça as mesmas opções da BU **Jetimob**.

- **Source BU:** Jetimob
- **Target BU:** Jet Experience (`f3d2d8a5-2143-42f0-8738-9b51fb74b49f`)

## Escopo (4 etapas em uma migração)

### 1. Empresas externas (`external_company_bu_associations`)
- Replicar para Jet Experience todas as associações ativas de empresas que existem em Jetimob e ainda não estão associadas na target.
- Foco confirmado inclui **Ferrigolo Advogados** e **Supervisão Contabilidade**, mas a operação cobre todas as empresas ativas da Jetimob.
- Reativa registros soft-deleted existentes na target (set `is_active=true`, `deleted_at=null`) em vez de duplicar.

### 2. Contatos externos (`partner_contact_bu_associations`)
- Para cada `partner_contact` ligado a empresas replicadas e ativo em Jetimob, criar associação em Jet Experience se não existir.
- Inclui os 5 contatos pendentes de Supervisão Contabilidade.
- Mesma regra de reativação para soft-deleted.

### 3. Categorias e subcategorias (`ticket_categories`, `ticket_subcategories`)
- Criar em Jet Experience as categorias `external` e `both` que existem em Jetimob e faltam na target (matching por `name + scope`), preservando `scope` original.
  - Inclui categoria **Contábil** (faltante).
- Para cada categoria correspondente (existente ou nova), inserir as subcategorias faltantes por nome.
  - Inclui sync das subcategorias de **Jurídico** e **Contábil**.
- `created_by` = NULL (nullable) ou Platform Admin se schema exigir.

### 4. Mapeamentos parceiro→categoria (`partner_service_mappings`)
- Para cada mapping ativo em Jetimob cuja empresa está associada à Jet Experience, criar mapping equivalente na target resolvendo os IDs locais (categoria/subcategoria recém-replicadas).
- Inclui mappings de Ferrigolo (Jurídico) e Supervisão (Contábil).

## Garantias técnicas
- **Idempotência:** todos os inserts usam `WHERE NOT EXISTS` com matching por nome/escopo/IDs lógicos.
- **Soft-delete aware:** filtra `deleted_at IS NULL` na origem; reativa em vez de duplicar na target.
- **BU isolation:** todas as inserções carimbam `bu_id = target` explicitamente; nenhuma leitura cruza BU além do passo de cópia.
- **Sem mudanças de schema, RLS, triggers ou código frontend.**
- **Reversível:** uma única migração; rollback documentado por `bu_id` da target + timestamps.

## Validação pós-migração
Queries de verificação retornarão zero diffs:
- Empresas ativas em Jetimob ∖ ativas em Jet Experience = ∅
- Contatos ativos (das empresas replicadas) em Jetimob ∖ ativos em Jet Experience = ∅
- Categorias `external/both` em Jetimob ∖ existentes (por nome+scope) em Jet Experience = ∅
- Subcategorias por categoria correspondente = ∅
- Partner mappings ativos (Ferrigolo, Supervisão) presentes em Jet Experience

## Detalhes técnicos
- Ferramenta: `supabase--migration` única, com 4 blocos `INSERT ... SELECT ... WHERE NOT EXISTS` + UPDATEs para reativação.
- Ordem obrigatória: empresas → contatos → categorias → subcategorias → mappings (dependências de FK).
- Sem uso de `auth.uid()` (operação administrativa).
