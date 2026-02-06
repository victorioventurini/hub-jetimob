

# Plano: Correção de Links para KRs Vinculadas a KPIs

## Problema
Ao clicar em uma KR vinculada a uma KPI (em `/kpis`), o link gerado (`/okrs?kr=uuid`) não funciona corretamente - redireciona para a lista geral de OKRs sem abrir a KR específica.

## Causa Raiz
Múltiplos pontos do código geram links incorretos ou apontam para rotas inexistentes:

| Arquivo | Problema Identificado |
|---------|----------------------|
| `LinkedKrsSection.tsx` | Gera `/okrs?kr={id}` (não tratado) ou `/okrs/org-view/{obj_id}` (objetivo, não KR) |
| `ResolveContextPage.tsx` | Define rotas `/okrs/org/kr/{id}` e `/okrs/team/kr/{id}` que não existem |
| `OkrContributionLink.tsx` | `getTargetUrl()` não trata `org_kr`/`team_kr`, retorna `/okrs` |
| `CheckinDialog.tsx` | Usa `/okrs?kr=${kr.id}` para mentions |
| `OkrDashboardPage.tsx` | Não lê o parâmetro `?kr=` da URL |

---

## Solução

Usar o padrão canônico `/go/{entity}/{id}` conforme documentado em `shareableLinks.ts`, e implementar deep-linking nas páginas de destino.

### Fluxo Corrigido

```text
Usuário em /kpis
      │
      ▼ clica na KR vinculada
      │
      ▼ Link: /go/okr_team_kr/{kr_id}
      │
      ▼ ResolveContextPage
      │   ├── Resolve BU da KR
      │   ├── Troca BU se necessário
      │   └── Redireciona para /okrs?kr={kr_id}
      │
      ▼ OkrDashboardPage
      │   ├── Lê ?kr= da URL
      │   ├── Busca dados da KR
      │   └── Abre KrHistoryDialog automaticamente
      │
      ▼ Usuário vê detalhes da KR específica ✓
```

---

## Arquivos a Modificar

### 1. `src/modules/kpis/components/LinkedKrsSection.tsx`

Usar `getShareableUrl()` para links de KR:

```typescript
// Adicionar import
import { getShareableUrl } from '@/lib/shareableLinks';

// Linha 40-43: ANTES
const krRoute = kr.kr_type === 'org' 
  ? `/okrs/org-view/${kr.objective?.id}`
  : `/okrs?kr=${kr.kr_id}`;

// DEPOIS
const krRoute = kr.kr_type === 'org'
  ? getShareableUrl('okr_org_kr', kr.kr_id)
  : getShareableUrl('okr_team_kr', kr.kr_id);
```

---

### 2. `src/pages/ResolveContextPage.tsx`

Corrigir `targetPath` para rotas que existem:

```typescript
// Linhas 57-64: ANTES
okr_org_kr: {
  targetPath: (id) => `/okrs/org/kr/${id}`,  // Rota inexistente!
  label: "KR organizacional",
},
okr_team_kr: {
  targetPath: (id) => `/okrs/team/kr/${id}`, // Rota inexistente!
  label: "KR de time",
},

// DEPOIS
okr_org_kr: {
  targetPath: (id) => `/okrs/org-view?kr=${id}`,
  label: "KR organizacional",
},
okr_team_kr: {
  targetPath: (id) => `/okrs?kr=${id}`,
  label: "KR de time",
},
```

---

### 3. `src/modules/okrs/pages/OkrDashboardPage.tsx`

Implementar deep-linking para abrir `KrHistoryDialog` automaticamente:

```typescript
// Adicionar imports
import { useSearchParams } from 'react-router-dom';
import { KrHistoryDialog } from '../components/KrHistoryDialog';
import { useTeamKeyResult } from '../hooks'; // hook para buscar KR individual

// Dentro do componente, adicionar:
const [searchParams, setSearchParams] = useSearchParams();
const krIdFromUrl = searchParams.get('kr');

// Estado para controlar o dialog
const [deepLinkKrId, setDeepLinkKrId] = useState<string | null>(null);

// Buscar KR se houver ID na URL
const { data: deepLinkedKr } = useTeamKeyResult(krIdFromUrl || deepLinkKrId);

// Efeito para abrir dialog quando KR for carregada
useEffect(() => {
  if (krIdFromUrl && deepLinkedKr) {
    setDeepLinkKrId(krIdFromUrl);
  }
}, [krIdFromUrl, deepLinkedKr]);

// Limpar parâmetro da URL ao fechar dialog
const handleCloseDeepLinkDialog = (open: boolean) => {
  if (!open) {
    setDeepLinkKrId(null);
    searchParams.delete('kr');
    setSearchParams(searchParams, { replace: true });
  }
};

// Renderizar dialog
<KrHistoryDialog
  open={!!deepLinkKrId && !!deepLinkedKr}
  onOpenChange={handleCloseDeepLinkDialog}
  kr={deepLinkedKr ? {
    id: deepLinkedKr.id,
    title: deepLinkedKr.title,
    baseline: deepLinkedKr.baseline,
    current_value: deepLinkedKr.current_value,
    target: deepLinkedKr.target,
    unit: deepLinkedKr.unit,
    direction: deepLinkedKr.direction,
    status: deepLinkedKr.status,
    type: deepLinkedKr.type,
    owner_name: deepLinkedKr.owner?.display_name,
    owner_photo: deepLinkedKr.owner?.photo_url,
    team_name: deepLinkedKr.team?.name,
    objective_title: deepLinkedKr.objective?.title,
  } : null}
/>
```

---

### 4. `src/modules/okrs/pages/OrgObjectiveViewPage.tsx`

Implementar deep-linking similar para KRs organizacionais:

```typescript
// Ler parâmetro ?kr= e fazer scroll/highlight para KR específica
const krIdFromUrl = searchParams.get('kr');

// Encontrar a KR org correspondente e expandir o card
useEffect(() => {
  if (krIdFromUrl && objective) {
    const targetKr = objective.orgKrs.find(kr => kr.id === krIdFromUrl);
    if (targetKr) {
      // Scroll para o card e abrir dialog de histórico
    }
  }
}, [krIdFromUrl, objective]);
```

---

### 5. `src/modules/okrs/components/ui/OkrContributionLink.tsx`

Tratar tipos `org_kr` e `team_kr` em `getTargetUrl()`:

```typescript
// Adicionar import
import { getShareableUrl, ShareableEntity } from '@/lib/shareableLinks';

// Linhas 105-114: ANTES
function getTargetUrl(targetType: string, targetId: string): string {
  switch (targetType) {
    case 'org_objective':
      return `/okrs/org-view/${targetId}`;
    case 'team_objective':
      return `/okrs/teams/${targetId}`;
    default:
      return `/okrs`;
  }
}

// DEPOIS
function getTargetUrl(targetType: string, targetId: string): string {
  const entityMap: Record<string, ShareableEntity> = {
    'org_objective': 'okr_org_objective',
    'team_objective': 'okr_team_objective',
    'org_kr': 'okr_org_kr',
    'team_kr': 'okr_team_kr',
  };
  
  const entity = entityMap[targetType];
  if (entity) {
    return getShareableUrl(entity, targetId);
  }
  return '/okrs';
}
```

---

### 6. `src/modules/okrs/components/CheckinDialog.tsx`

Usar padrão `/go/` para mentions:

```typescript
// Adicionar import
import { getShareableUrl } from '@/lib/shareableLinks';

// Linha 125: ANTES
await processMentions(reflection, 'checkin', checkinData.id, 'kr', kr.id, `/okrs?kr=${kr.id}`);

// DEPOIS
await processMentions(reflection, 'checkin', checkinData.id, 'kr', kr.id, getShareableUrl('okr_team_kr', kr.id));
```

---

### 7. Hook: `src/modules/okrs/hooks/useTeamKeyResult.ts` (NOVO)

Criar hook para buscar uma KR individual pelo ID:

```typescript
export function useTeamKeyResult(krId: string | null) {
  const { client: supabase, buId, isReady } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.teamKeyResult(krId),
    queryFn: async () => {
      if (!supabase || !krId) return null;
      
      const { data, error } = await supabase
        .from('okr_team_key_results')
        .select(`
          id, title, baseline, current_value, target, unit, direction, status, type,
          owner:profiles!owner_id(id, display_name, photo_url),
          team:teams!team_id(id, name),
          objective:okr_team_objectives!team_objective_id(id, title)
        `)
        .eq('id', krId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!krId && !!supabase,
  });
}
```

---

## Resumo de Alterações

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `LinkedKrsSection.tsx` | Correção | Usar `getShareableUrl()` |
| `ResolveContextPage.tsx` | Correção | Rotas válidas para KRs |
| `OkrDashboardPage.tsx` | Feature | Ler `?kr=` e abrir dialog |
| `OrgObjectiveViewPage.tsx` | Feature | Ler `?kr=` e highlight |
| `OkrContributionLink.tsx` | Correção | Tratar `org_kr`/`team_kr` |
| `CheckinDialog.tsx` | Correção | Usar `getShareableUrl()` |
| `useTeamKeyResult.ts` | Novo | Hook para buscar KR individual |

---

## Benefícios

1. **Consistência**: Todos os links de KR usam o padrão `/go/` documentado
2. **Multi-BU**: Troca automática de BU via ResolveContextPage funciona
3. **Deep-linking**: URLs compartilháveis abrem diretamente a KR
4. **Padrão centralizado**: Futuras entidades seguem o mesmo modelo

