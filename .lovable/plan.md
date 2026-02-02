
# Plano: Exportar Organograma em Formato de Texto

## 1. Objetivo
Adicionar funcionalidade para exportar o organograma em formato de texto ASCII indentado, permitindo que o usuário copie e cole para análise por GPT ou outros LLMs.

---

## 2. Análise do Pré-Checklist (TCR + Docs Canônicos)

### 2.1 Documentos Consultados
| Documento | Versão | Pontos Relevantes |
|-----------|--------|-------------------|
| TECHNICAL_CONTEXT_REGISTRY.md | v2.77.0 | Hooks canônicos, toast via sonner |
| UI_COMPONENTS_REGISTRY.md | v1.2.0 | Padrão de Button, Tooltip, navegação |
| DEVELOPMENT_STANDARDS.md | v1.17.0 | URL State, estrutura de módulos |

### 2.2 Padrões Aplicáveis
- **Toast**: Usar `sonner` (toast importado de `sonner`)
- **Tooltips**: Usar componente Radix com `disableHoverableContent`
- **Ícones**: Usar `lucide-react`
- **Button**: Usar variant `outline` + size `icon` para ações secundárias
- **Estrutura de Arquivos**: Módulos em `src/modules/{domain}/utils/` para utilitários

### 2.3 Estrutura de Dados (useOrganogramData)
```text
OrganogramData {
  ceo: OrganogramNode | null
  areas: OrganogramNode[]
}

OrganogramNode {
  id, type, name, email?, photoUrl?, color?, role?, path
  children: OrganogramNode[]
  leaderName?, leaderPhotoUrl?
}

type: 'ceo' | 'area' | 'team' | 'subteam' | 'squad' | 'person'
```

---

## 3. Formato de Saída Esperado

```text
ORGANOGRAMA - Jetimob
Gerado em: 02/02/2026, 15:30

CEO: Victorio Lassance

├── ÁREA: Revenue
│   ├── Líder: João Silva
│   │
│   ├── TIME: Comercial
│   │   ├── Líder: Maria Souza
│   │   ├── Pedro Santos (pedro@jetimob.com)
│   │   ├── Ana Costa
│   │   │
│   │   └── SUBTIME: Outbound
│   │       ├── Líder: Carlos Lima
│   │       └── Julia Martins
│   │
│   └── TIME: Sucesso do Cliente
│       └── Líder: Roberto Alves
│
├── ÁREA: Tecnologia
│   ├── TIME: Engenharia
│   │   ├── Líder: Felipe Costa
│   │   ├── Lucas Rodrigues
│   │   └── Mariana Oliveira
...

Total: 45 pessoas
```

---

## 4. Mudanças Técnicas

### 4.1 Criar Utilitário de Conversão
**Arquivo:** `src/modules/teams/utils/organogramToText.ts`

Função que converte `OrganogramData` para texto ASCII respeitando filtros:

```typescript
import { OrganogramData, OrganogramNode, OrganogramFilters } from "../types/organogram";

export function organogramToText(
  data: OrganogramData,
  filters: OrganogramFilters,
  buName: string
): string {
  // Implementação recursiva com contagem de pessoas
}
```

**Lógica:**
1. Header com nome da BU e data/hora
2. CEO no topo (se existir)
3. Áreas como children do CEO (ou raiz se não houver CEO)
4. Recursão para times, subtimes, squads e membros
5. Filtros `showMembers` e `showSquads` respeitados
6. Contador de pessoas no rodapé

### 4.2 Atualizar OrganogramControls
**Arquivo:** `src/modules/teams/components/organogram/OrganogramControls.tsx`

- Adicionar prop `onExportText?: () => void`
- Adicionar botão com ícone `Copy` ou `FileText`
- Tooltip: "Copiar como texto"
- Disponível em modo normal e compacto (fullscreen)

### 4.3 Implementar Handler na Página
**Arquivo:** `src/modules/teams/pages/OrganogramPage.tsx`

- Importar `organogramToText` do utilitário
- Importar `toast` de `sonner`
- Implementar `handleExportText`:
  1. Gerar texto via `organogramToText(data, filters, currentBu?.name)`
  2. Copiar para clipboard via `navigator.clipboard.writeText()`
  3. Toast de sucesso: "Organograma copiado!"

---

## 5. Arquivos a Criar/Modificar

| Arquivo | Ação | Linhas Est. |
|---------|------|-------------|
| `src/modules/teams/utils/organogramToText.ts` | **CRIAR** | ~80 |
| `src/modules/teams/components/organogram/OrganogramControls.tsx` | Adicionar botão + prop | ~15 |
| `src/modules/teams/pages/OrganogramPage.tsx` | Handler + callback | ~10 |

---

## 6. Detalhes de Implementação

### 6.1 Utilitário organogramToText.ts

```typescript
const LABELS: Record<string, string> = {
  area: 'ÁREA',
  team: 'TIME',
  subteam: 'SUBTIME',
  squad: 'SQUAD',
};

function renderNode(
  node: OrganogramNode,
  prefix: string,
  isLast: boolean,
  lines: string[],
  filters: OrganogramFilters,
  stats: { count: number }
): void {
  // Filtrar por tipo
  if (node.type === 'person' && !filters.showMembers) return;
  if (node.type === 'squad' && !filters.showSquads) return;

  const connector = isLast ? '└── ' : '├── ';
  const childPrefix = prefix + (isLast ? '    ' : '│   ');

  // Renderizar nó baseado no tipo
  if (node.type === 'person') {
    const email = node.email ? ` (${node.email})` : '';
    lines.push(`${prefix}${connector}${node.name}${email}`);
    stats.count++;
  } else {
    const label = LABELS[node.type] || node.type.toUpperCase();
    lines.push(`${prefix}${connector}${label}: ${node.name}`);
    
    // Líder (se existir)
    if (node.leaderName) {
      lines.push(`${childPrefix}├── Líder: ${node.leaderName}`);
      stats.count++;
    }
  }

  // Filtrar children
  const filteredChildren = node.children.filter(child => {
    if (child.type === 'person' && !filters.showMembers) return false;
    if (child.type === 'squad' && !filters.showSquads) return false;
    return true;
  });

  // Renderizar children
  filteredChildren.forEach((child, i) => {
    renderNode(child, childPrefix, i === filteredChildren.length - 1, lines, filters, stats);
  });
}
```

### 6.2 Botão nos Controles (OrganogramControls.tsx)

**Modo Normal:**
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" size="icon" onClick={onExportText}>
      <Copy className="w-4 h-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Copiar como texto</TooltipContent>
</Tooltip>
```

**Modo Compacto (fullscreen):**
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExportText}>
      <Copy className="w-4 h-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Copiar como texto</TooltipContent>
</Tooltip>
```

### 6.3 Handler na OrganogramPage.tsx

```typescript
import { toast } from "sonner";
import { organogramToText } from "../utils/organogramToText";

const handleExportText = useCallback(() => {
  if (!data) return;
  
  const text = organogramToText(data, filters, currentBu?.name || 'BU');
  navigator.clipboard.writeText(text).then(() => {
    toast.success("Organograma copiado!", {
      description: "Cole em qualquer lugar para análise."
    });
  }).catch(() => {
    toast.error("Erro ao copiar", {
      description: "Não foi possível acessar a área de transferência."
    });
  });
}, [data, filters, currentBu?.name]);
```

---

## 7. UX

1. Usuário abre organograma (`/teams/org-chart`)
2. Ajusta filtros (mostrar/ocultar membros, squads)
3. Clica no botão "Copiar como texto"
4. Toast aparece: "Organograma copiado!"
5. Usuário cola no ChatGPT/Claude para análise

---

## 8. Validação Pós-Implementação

1. Abrir organograma normal e fullscreen
2. Ativar/desativar filtros de membros e squads
3. Clicar no botão de exportar
4. Verificar toast de confirmação
5. Colar em editor de texto e verificar formatação
6. Verificar contador de pessoas
7. Verificar que líderes aparecem corretamente
8. Verificar estrutura hierárquica (indentação)

---

## 9. Impacto em Documentação

Nenhuma atualização de documentação canônica necessária - esta é uma feature de UI sem novos padrões arquiteturais.
