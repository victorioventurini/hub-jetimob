# Módulo de Cargos (Job Titles)

## Objetivo

O módulo de Cargos permite gerenciar uma lista padronizada de títulos de cargo por Business Unit (BU), substituindo o campo de texto livre anteriormente utilizado no cadastro de usuários.

### Benefícios

- **Padronização**: Elimina variações como "Head Marketing", "Líder Marketing", "Coord. MKT"
- **Consistência**: Única fonte de verdade para nomes de cargos
- **Relatórios**: Facilita análises e people analytics
- **Escalabilidade**: Preparado para extensões futuras (nível, senioridade, trilha)

## Arquitetura

### Modelo de Dados

```sql
CREATE TABLE public.job_titles (
  id UUID PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES bu_units(id),  -- Cargos são por BU
  name TEXT NOT NULL,                            -- Nome único por BU
  description TEXT,                              -- Descrição opcional
  is_active BOOLEAN DEFAULT true,                -- Soft status
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ                         -- Soft delete
);

-- Unicidade case-insensitive por BU
CREATE UNIQUE INDEX job_titles_bu_name_unique 
ON job_titles (bu_id, lower(name)) 
WHERE deleted_at IS NULL;
```

### Relacionamento com Profiles

```sql
-- Coluna adicionada em profiles
ALTER TABLE profiles ADD COLUMN job_title_id UUID REFERENCES job_titles(id);
```

A coluna `job_title` (texto livre) é mantida temporariamente para compatibilidade, mas deve ser descontinuada.

## Decisões de Design

### Por que por BU?

1. **Autonomia**: Cada BU pode ter sua própria estrutura organizacional
2. **Flexibilidade**: Cargos de Marketing na BU1 podem diferir da BU2
3. **Isolamento**: Mudanças em uma BU não afetam outras
4. **Segurança**: RLS garante que usuários só vejam cargos de suas BUs

### Por que não texto livre?

1. **Inconsistência**: Múltiplas variações do mesmo cargo
2. **Dificuldade de relatórios**: Agrupamento impossível
3. **Manutenção**: Correções precisam ser feitas registro a registro
4. **Integração**: Sistemas externos precisam de IDs, não strings

### Por que não global?

1. **Escalabilidade**: Milhares de cargos centralizados seriam ingerenciáveis
2. **Contexto**: "Analista" em TI é diferente de "Analista" em RH
3. **Governança**: Cada BU deve controlar sua hierarquia

## RLS (Row Level Security)

### Regras de Acesso

| Operação | Quem pode |
|----------|-----------|
| SELECT | Membros da BU (`is_bu_member`) |
| INSERT | Admin da BU, super_admin, admin global |
| UPDATE | Admin da BU, super_admin, admin global |
| DELETE | Admin da BU, super_admin, admin global |

### Cross-BU

**Estritamente proibido**. Todas as queries incluem `bu_id` como filtro obrigatório via RLS.

## Frontend

### Rota

```
/settings/job-titles
```

### Componentes

- `JobTitlesPage`: Lista e gerenciamento de cargos
- `JobTitleDialog`: Criação/edição de cargo
- `JobTitleSelect`: Componente de seleção para formulários

### Hooks

```typescript
// Lista todos os cargos da BU (com contagem de uso)
useJobTitles()

// Lista apenas cargos ativos (para selects)
useActiveJobTitles()

// Mutações
useCreateJobTitle()
useUpdateJobTitle()
useDeleteJobTitle()
```

### Uso em Formulários

```tsx
import { JobTitleSelect } from "@/modules/settings";

<JobTitleSelect 
  value={form.job_title_id}
  onValueChange={(id) => form.setJobTitleId(id)}
/>
```

## Fluxo de Cadastro de Usuário

1. Usuário abre formulário de cadastro
2. Campo "Cargo" exibe `JobTitleSelect` (não mais input texto)
3. Se não houver cargos cadastrados, exibe mensagem orientando criação
4. Seleção salva `job_title_id` no profile

## Permissões

### Keys

| Key | Descrição |
|-----|-----------|
| `settings.job_titles.view` | Visualizar lista de cargos |
| `settings.job_titles.manage` | Criar, editar, desativar cargos |

### Mapeamento

- **bu_admin**: view + manage
- **collaborator**: nenhuma (usa apenas no cadastro próprio)

## Migração de Dados Existentes

Para migrar usuários com cargo em texto livre:

```sql
-- 1. Criar cargos a partir dos textos existentes
INSERT INTO job_titles (bu_id, name)
SELECT DISTINCT bu_id, job_title
FROM profiles
WHERE job_title IS NOT NULL 
  AND job_title != ''
  AND deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- 2. Vincular profiles aos cargos criados
UPDATE profiles p
SET job_title_id = jt.id
FROM job_titles jt
WHERE p.bu_id = jt.bu_id
  AND lower(p.job_title) = lower(jt.name)
  AND p.deleted_at IS NULL;
```

## Checklist de Conformidade

- [x] RLS bloqueia acesso cross-BU
- [x] Nenhuma query sem bu_id
- [x] Nenhum select('*') no módulo
- [x] Hooks usam useBuScopedSupabase()
- [x] Soft delete preserva histórico
- [x] Unicidade case-insensitive por BU
- [x] Permissões definidas no catálogo
