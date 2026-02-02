/**
 * organogramToText - Converte dados do organograma para texto ASCII
 * 
 * Formato de saída legível para análise por LLMs (GPT, Claude, etc)
 */
import { OrganogramData, OrganogramNode, OrganogramFilters } from "../types/organogram";

const LABELS: Record<string, string> = {
  area: 'ÁREA',
  team: 'TIME',
  subteam: 'SUBTIME',
  squad: 'SQUAD',
};

interface RenderStats {
  count: number;
}

/**
 * Filtra children baseado nos filtros ativos
 */
function filterChildren(
  children: OrganogramNode[],
  filters: OrganogramFilters
): OrganogramNode[] {
  return children.filter(child => {
    if (child.type === 'person' && !filters.showMembers) return false;
    if (child.type === 'squad' && !filters.showSquads) return false;
    return true;
  });
}

/**
 * Renderiza um nó recursivamente em formato ASCII tree
 */
function renderNode(
  node: OrganogramNode,
  prefix: string,
  isLast: boolean,
  lines: string[],
  filters: OrganogramFilters,
  stats: RenderStats
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
    
    // Líder (se existir e não for pessoa)
    if (node.leaderName) {
      lines.push(`${childPrefix}├── Líder: ${node.leaderName}`);
      stats.count++;
    }
  }

  // Filtrar e renderizar children
  const filteredChildren = filterChildren(node.children, filters);

  filteredChildren.forEach((child, i) => {
    const isLastChild = i === filteredChildren.length - 1;
    renderNode(child, childPrefix, isLastChild, lines, filters, stats);
  });
}

/**
 * Converte OrganogramData para texto ASCII indentado
 * 
 * @param data - Dados do organograma
 * @param filters - Filtros ativos (showMembers, showSquads)
 * @param buName - Nome da BU para o header
 * @returns Texto formatado em ASCII tree
 */
export function organogramToText(
  data: OrganogramData,
  filters: OrganogramFilters,
  buName: string
): string {
  const lines: string[] = [];
  const stats: RenderStats = { count: 0 };
  
  // Header
  lines.push(`ORGANOGRAMA - ${buName}`);
  lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
  lines.push('');
  
  // CEO
  if (data.ceo) {
    lines.push(`CEO: ${data.ceo.name}`);
    stats.count++;
    lines.push('');
    
    // Áreas são children do CEO
    const filteredAreas = filterChildren(data.ceo.children, filters);
    filteredAreas.forEach((area, i) => {
      const isLast = i === filteredAreas.length - 1;
      renderNode(area, '', isLast, lines, filters, stats);
      
      // Linha em branco entre áreas (exceto última)
      if (!isLast) {
        lines.push('│');
      }
    });
  } else {
    // Áreas sem CEO
    const filteredAreas = filterChildren(data.areas, filters);
    filteredAreas.forEach((area, i) => {
      const isLast = i === filteredAreas.length - 1;
      renderNode(area, '', isLast, lines, filters, stats);
      
      // Linha em branco entre áreas (exceto última)
      if (!isLast) {
        lines.push('│');
      }
    });
  }
  
  // Footer
  lines.push('');
  lines.push(`Total: ${stats.count} pessoa${stats.count !== 1 ? 's' : ''}`);
  
  return lines.join('\n');
}
