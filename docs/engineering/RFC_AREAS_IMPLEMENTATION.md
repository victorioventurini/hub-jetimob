# RFC: Implementação do Conceito de Área no Hub

**Versão:** 1.1.0  
**Data:** 2026-01-15  
**Status:** ✅ Implementado  
**Autor:** Lovable AI / Equipe de Engenharia  
**Referência:** TCR v2.33.0

---

## 1. Resumo Executivo

### 1.1 Problema Atual

O Hub atualmente usa "times fake" para representar responsabilidades estratégicas:
- **Revenue**, **Produto**, **Tecnologia**, **Operações**, **Pessoas**
- Esses times existem apenas para:
  - Agrupar times subordinados
  - Dar contexto hierárquico
  - Consolidar OKRs
- Problema: Times sem membros operacionais distorcem métricas e organograma

### 1.2 Solução Proposta

Introduzir **Área** como entidade de primeira classe:
- Representa responsabilidade estratégica ampla
- Agrupa times operacionais
- **NÃO possui OKRs próprias** (áreas são apenas agrupamentos)
- NÃO possui membros operacionais
- Possui apenas líder(es) responsável(eis)

### 1.3 Nova Hierarquia

```
BU (Business Unit)
└── Área (responsabilidade estratégica)
    └── Time (execução operacional)
        └── Subtime (opcional)
            └── Pessoas
```

---

## 2. Análise de Impacto

### 2.1 Entidades Afetadas

| Entidade | Impacto | Ação |
|----------|---------|------|
| `teams` | Médio | Adicionar `area_id` opcional |
| `okr_org_objectives` | Médio | Adicionar `area_id` opcional |
| `okr_org_key_results` | Baixo | Herda área via objetivo |
| Managers Check-in | Alto | Refatorar para usar áreas |
| Org View | Médio | Agrupar por área |
| Team Tree | Médio | Exibir áreas como raiz |

### 2.2 Times Fake a Migrar

| Time Fake Atual | Nova Área | Times Filhos |
|-----------------|-----------|--------------|
| Produto e Tecnologia | Produto | Dev, Design, QA |
| Revenue | Revenue | Marketing, Comercial, CS |
| Operações | Operações | Financeiro, RH, Jurídico |

---

## 3. Modelo de Dados

### 3.1 Nova Tabela: `areas`

```sql
CREATE TABLE public.areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES bu_units(id),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL, -- ex: 'revenue', 'produto', 'operacoes'
  color TEXT, -- cor para identificação visual
  icon TEXT, -- nome do ícone lucide
  leader_user_id UUID REFERENCES profiles(id), -- líder principal
  co_leaders UUID[] DEFAULT '{}', -- co-líderes (opcional)
  display_order INT DEFAULT 0, -- ordem de exibição
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT areas_name_bu_unique UNIQUE (bu_id, name),
  CONSTRAINT areas_slug_bu_unique UNIQUE (bu_id, slug)
);

-- Índices
CREATE INDEX idx_areas_bu_id ON areas(bu_id);
CREATE INDEX idx_areas_leader ON areas(leader_user_id);
CREATE INDEX idx_areas_status ON areas(status) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "areas_select_bu" ON areas
  FOR SELECT USING (is_current_bu(bu_id));

CREATE POLICY "areas_manage_admin" ON areas
  FOR ALL USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_areas_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 Alterações em Tabelas Existentes

#### teams - Adicionar `area_id`

```sql
-- Adicionar coluna
ALTER TABLE teams ADD COLUMN area_id UUID REFERENCES areas(id);

-- Índice
CREATE INDEX idx_teams_area_id ON teams(area_id) WHERE deleted_at IS NULL;

-- Migrar times raiz para área correspondente
-- (será feito via script de migração)
```

#### okr_org_objectives - Adicionar `area_id`

```sql
-- Adicionar coluna (opcional - objetivo pode ser cross-area)
ALTER TABLE okr_org_objectives ADD COLUMN area_id UUID REFERENCES areas(id);

-- Índice
CREATE INDEX idx_org_objectives_area ON okr_org_objectives(area_id) 
  WHERE deleted_at IS NULL AND cancelled_at IS NULL;
```

### 3.3 Funções de Hierarquia

```sql
-- Verificar se usuário é líder de área
CREATE OR REPLACE FUNCTION is_area_leader(p_user_id UUID, p_area_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM areas
    WHERE id = p_area_id
    AND deleted_at IS NULL
    AND (
      leader_user_id = p_user_id
      OR p_user_id = ANY(co_leaders)
    )
  );
END;
$$;

-- Obter área de um time
CREATE OR REPLACE FUNCTION get_team_area(p_team_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area_id UUID;
BEGIN
  SELECT area_id INTO v_area_id
  FROM teams
  WHERE id = p_team_id
  AND deleted_at IS NULL;
  
  RETURN v_area_id;
END;
$$;

-- Obter todos os times de uma área (incluindo subtimes)
CREATE OR REPLACE FUNCTION get_area_teams(p_area_id UUID)
RETURNS TABLE(team_id UUID, team_name TEXT, depth INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE team_tree AS (
    -- Times diretamente na área
    SELECT t.id, t.name, 0 as depth
    FROM teams t
    WHERE t.area_id = p_area_id
    AND t.deleted_at IS NULL
    AND t.status = 'active'
    
    UNION ALL
    
    -- Subtimes recursivamente
    SELECT t.id, t.name, tt.depth + 1
    FROM teams t
    JOIN team_tree tt ON t.parent_team_id = tt.id
    WHERE t.deleted_at IS NULL
    AND t.status = 'active'
  )
  SELECT * FROM team_tree;
END;
$$;
```

---

## 4. Frontend - Estrutura de Arquivos

### 4.1 Novo Módulo: `src/modules/areas/`

```
src/modules/areas/
├── components/
│   ├── AreaCard.tsx           # Card de área para listagem
│   ├── AreaSelect.tsx         # Dropdown de seleção de área
│   ├── AreaFormDialog.tsx     # Modal de criação/edição
│   ├── AreaTree.tsx           # Visualização hierárquica
│   └── AreaTeamsPanel.tsx     # Painel com times da área
├── hooks/
│   ├── index.ts               # Barrel export
│   ├── useAreas.ts            # Query de áreas
│   ├── useAreaMutations.ts    # Mutations CRUD
│   └── useAreaTeams.ts        # Times por área
├── pages/
│   ├── AreasPage.tsx          # Listagem de áreas
│   └── AreaDetailPage.tsx     # Detalhe com times e OKRs
├── types/
│   └── index.ts               # Types de área
└── index.ts                   # Barrel export do módulo
```

### 4.2 Alterações em Módulos Existentes

#### OKRs Module

```typescript
// src/modules/okrs/hooks/useManagersPanorama.ts
// ANTES: Busca times raiz como "áreas"
// DEPOIS: Busca áreas reais

// src/modules/okrs/components/org-view/
// Adicionar agrupamento por área
```

#### Teams Module

```typescript
// src/modules/teams/hooks/useTeams.ts
// Adicionar suporte a area_id

// src/modules/teams/components/TeamFormDialog.tsx
// Adicionar campo de área
```

---

## 5. Plano de Migração

### 5.1 Fase 1: Schema e Migração de Dados (1-2 dias)

1. **Criar tabela `areas`**
2. **Adicionar `area_id` em `teams` e `okr_org_objectives`**
3. **Script de migração:**
   - Identificar times raiz sem filhos → manter como time
   - Identificar times raiz com filhos → criar área, migrar filhos
   - Atualizar `area_id` nos times

```sql
-- Exemplo de migração
DO $$
DECLARE
  r RECORD;
  new_area_id UUID;
BEGIN
  -- Para cada BU
  FOR r IN SELECT DISTINCT bu_id FROM teams WHERE parent_team_id IS NULL LOOP
    -- Criar áreas baseadas em times raiz que têm filhos
    FOR r IN 
      SELECT t.* 
      FROM teams t
      WHERE t.bu_id = r.bu_id
      AND t.parent_team_id IS NULL
      AND EXISTS (SELECT 1 FROM teams c WHERE c.parent_team_id = t.id)
    LOOP
      -- Criar área
      INSERT INTO areas (bu_id, name, slug, leader_user_id)
      VALUES (r.bu_id, r.name, lower(replace(r.name, ' ', '-')), r.leader_user_id)
      RETURNING id INTO new_area_id;
      
      -- Atualizar times filhos
      UPDATE teams SET area_id = new_area_id
      WHERE parent_team_id = r.id;
      
      -- Soft delete o time fake
      UPDATE teams SET deleted_at = now()
      WHERE id = r.id;
    END LOOP;
  END LOOP;
END;
$$;
```

### 5.2 Fase 2: Frontend - Módulo Areas (2-3 dias)

1. Criar módulo `src/modules/areas/`
2. Implementar CRUD de áreas (admin only)
3. Adicionar rotas `/settings/areas`
4. Integrar com organograma

### 5.3 Fase 3: Integração com OKRs (2-3 dias)

1. Refatorar `useManagersPanorama` para usar áreas
2. Atualizar `ManagersCheckinPage`
3. Adicionar área em `OrgObjectiveFormDialog`
4. Atualizar Org View com agrupamento por área

### 5.4 Fase 4: Integração com Teams (1-2 dias)

1. Adicionar `AreaSelect` em `TeamFormDialog`
2. Atualizar `useTeamTree` para exibir áreas
3. Refatorar organograma visual

### 5.5 Fase 5: Cleanup e Documentação (1 dia)

1. Remover times fake
2. Atualizar TCR
3. Atualizar DEVELOPMENT_STANDARDS
4. Criar documentação de uso

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| RLS policies incorretas | Média | Alto | Code review + testes E2E |
| Migração quebra hierarquia | Baixa | Alto | Script de validação pré/pós |
| Performance em áreas grandes | Baixa | Médio | Índices + cache |
| UX confusa com 2 níveis | Média | Médio | Onboarding + tooltips |

---

## 7. Cronograma Estimado

| Fase | Duração | Dependências |
|------|---------|--------------|
| 1. Schema + Migração | 2 dias | Nenhuma |
| 2. Frontend Module | 3 dias | Fase 1 |
| 3. OKRs Integration | 3 dias | Fase 2 |
| 4. Teams Integration | 2 dias | Fase 2 |
| 5. Cleanup + Docs | 1 dia | Fases 3, 4 |

**Total estimado:** 11 dias úteis

---

## 8. Critérios de Aceitação

### 8.1 Funcional

- [ ] Áreas podem ser criadas/editadas/arquivadas (admin)
- [ ] Times podem ser vinculados a áreas
- [ ] OKRs organizacionais podem ser categorizados por área
- [ ] Managers Check-in usa áreas reais
- [ ] Organograma exibe hierarquia correta
- [ ] Times fake foram removidos ou migrados

### 8.2 Técnico

- [ ] RLS policies cobrindo 100% das operações
- [ ] Testes unitários para hooks de área
- [ ] Testes E2E para fluxos críticos
- [ ] Performance < 500ms para listagem
- [ ] Documentação atualizada (TCR, Standards)

---

## 9. Decisões Pendentes

1. **Área pode ter OKRs próprios?**
   - Opção A: Sim, área tem seus próprios OKRs (além dos times)
   - Opção B: Não, área apenas agrupa OKRs de times
   - **Recomendação:** Opção A (mais flexível)

2. **Área obrigatória para times?**
   - Opção A: Sim, todo time deve ter área
   - Opção B: Não, área é opcional
   - **Recomendação:** Opção B para migração suave

3. **Co-líderes de área?**
   - Opção A: Apenas 1 líder
   - Opção B: Líder + co-líderes (array)
   - **Recomendação:** Opção B (reflete realidade)

4. **Área pode ter subáreas?**
   - Opção A: Não, apenas 1 nível
   - Opção B: Sim, hierarquia de áreas
   - **Recomendação:** Opção A (simplicidade inicial)

---

## 10. Próximos Passos

1. **Revisar RFC** com stakeholders
2. **Validar decisões pendentes**
3. **Aprovar cronograma**
4. **Iniciar Fase 1** (Schema)

---

*RFC gerado em 2026-01-15. Aguardando aprovação.*
