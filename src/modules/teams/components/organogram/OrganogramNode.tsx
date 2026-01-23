/**
 * OrganogramNode - Card individual do organograma
 */
import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Building2, Users, Layers, Crown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { OrganogramNode as OrganogramNodeType } from "../../types/organogram";

interface OrganogramNodeCardProps {
  node: OrganogramNodeType;
  isExpanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
  parentColor?: string | null;
  depth?: number;
  expansionMode?: 'default' | 'all' | 'none';
}

const TYPE_CONFIG = {
  ceo: {
    icon: Crown,
    bgClass: "bg-card",
    borderClass: "border-2",
    iconClass: "text-warning",
  },
  area: {
    icon: Layers,
    bgClass: "bg-card",
    borderClass: "border-l-4",
    iconClass: "text-muted-foreground",
  },
  team: {
    icon: Building2,
    bgClass: "bg-card",
    borderClass: "border-l-4",
    iconClass: "text-muted-foreground",
  },
  subteam: {
    icon: Building2,
    bgClass: "bg-muted/50",
    borderClass: "border-l-2 border-dashed",
    iconClass: "text-muted-foreground",
  },
  squad: {
    icon: Users,
    bgClass: "bg-secondary/50",
    borderClass: "border-l-2 border-secondary-foreground/30",
    iconClass: "text-secondary-foreground",
  },
  person: {
    icon: User,
    bgClass: "bg-card",
    borderClass: "",
    iconClass: "text-muted-foreground",
  },
};

// CEO Card com avatar circular grande no estilo do organograma de referência
const CeoCard = memo(function CeoCard({
  node,
  hasChildren,
  depth = 0,
  expansionMode = 'default',
}: Pick<OrganogramNodeCardProps, 'node' | 'hasChildren' | 'depth' | 'expansionMode'>) {
  return (
    <div className="flex flex-col items-center">
      {/* CEO card with same proportions as other cards */}
      <Link
        to={node.path}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-amber-400 bg-card shadow-sm transition-all",
          "hover:shadow-md hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-ring",
          "min-w-[140px] max-w-[200px]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Avatar */}
        <OptimizedAvatar
          src={node.photoUrl}
          alt={node.name}
          fallback={node.name.slice(0, 2).toUpperCase()}
          size="sm"
          className="w-7 h-7"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{node.name}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">CEO</p>
        </div>
      </Link>

      {/* Children (Areas) - always visible */}
      {hasChildren && (
        <div className="flex flex-col items-center mt-3">
          {/* Connector line down */}
          <div className="w-px h-4 bg-border" />
          
          {/* Children container - horizontal row for areas */}
          <div className="flex flex-nowrap justify-center gap-3 relative">
            {/* Horizontal line connecting children */}
            {node.children.length > 1 && (
              <div 
                className="absolute top-0 h-px bg-border"
                style={{
                  left: 'calc(50% - ' + ((node.children.length - 1) * 50) + '%)',
                  right: 'calc(50% - ' + ((node.children.length - 1) * 50) + '%)',
                  minWidth: '50%',
                }}
              />
            )}
            
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Connector line up */}
                <div className="w-px h-4 bg-border" />
                <OrganogramNodeWrapper 
                  node={child} 
                  parentColor={child.color}
                  depth={depth + 1}
                  expansionMode={expansionMode}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Card padrão para área, time, etc.
export const OrganogramNodeCard = memo(function OrganogramNodeCard({
  node,
  isExpanded,
  onToggle,
  hasChildren,
  parentColor,
  depth = 0,
  expansionMode = 'default',
}: OrganogramNodeCardProps) {
  // CEO tem card especial
  if (node.type === 'ceo') {
    return (
      <CeoCard
        node={node}
        hasChildren={hasChildren}
        depth={depth}
        expansionMode={expansionMode}
      />
    );
  }

  const config = TYPE_CONFIG[node.type];
  const Icon = config.icon;
  
  // Use parent color for border if available
  const borderStyle = parentColor && (node.type === 'area' || node.type === 'team' || node.type === 'subteam')
    ? { borderLeftColor: parentColor }
    : undefined;

  // For area, use own color
  const areaColor = node.type === 'area' ? node.color : parentColor;

  // Check if this is an area/team/subteam (always show leader section for consistent height)
  const showsLeaderSection = node.type === 'area' || node.type === 'team' || node.type === 'subteam';
  const hasLeader = showsLeaderSection && node.leaderName;

  return (
    <div className="flex flex-col items-center">
      <Link
        to={node.path}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-all",
          "hover:shadow-md hover:border-accent focus:outline-none focus:ring-2 focus:ring-ring",
          "min-w-[140px] max-w-[200px]",
          config.bgClass,
          config.borderClass
        )}
        style={borderStyle || (node.color ? { borderLeftColor: node.color } : undefined)}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Avatar or Icon */}
        {node.photoUrl || node.type === 'person' ? (
          <OptimizedAvatar
            src={node.photoUrl}
            alt={node.name}
            fallback={node.name.slice(0, 2).toUpperCase()}
            size="sm"
            className="w-7 h-7"
          />
        ) : (
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            "bg-muted"
          )}
          style={node.color ? { backgroundColor: `${node.color}20` } : undefined}
          >
            <Icon className={cn("w-3.5 h-3.5", config.iconClass)} 
                  style={node.color ? { color: node.color } : undefined} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{node.name}</p>
          {node.role && (
            <p className="text-xs text-muted-foreground truncate">{node.role}</p>
          )}
          {/* Leader info for areas/teams - always show section for consistent height */}
          {showsLeaderSection && (
            <div className="flex items-center gap-1.5 mt-1 min-h-[20px]">
              {hasLeader ? (
                <>
                  <OptimizedAvatar
                    src={node.leaderPhotoUrl}
                    alt={node.leaderName || ''}
                    fallback={node.leaderName?.slice(0, 2).toUpperCase() || ''}
                    size="sm"
                    className="w-5 h-5 text-[10px]"
                  />
                  <p className="text-xs text-muted-foreground truncate">{node.leaderName}</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">Sem líder definido</p>
              )}
            </div>
          )}
        </div>

        {/* Expand/Collapse */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle();
            }}
            className={cn(
              "p-1 rounded-md hover:bg-accent transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring"
            )}
            aria-label={isExpanded ? "Recolher" : "Expandir"}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
      </Link>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center mt-3">
          {/* Connector line down */}
          <div className="w-px h-4 bg-border" />
          
          {/* Children container */}
          <div className="flex flex-nowrap justify-center gap-3 relative">
            {/* Horizontal line connecting children */}
            {node.children.length > 1 && (
              <div 
                className="absolute top-0 h-px bg-border"
                style={{
                  left: 'calc(50% - ' + ((node.children.length - 1) * 50) + '%)',
                  right: 'calc(50% - ' + ((node.children.length - 1) * 50) + '%)',
                  minWidth: '50%',
                }}
              />
            )}
            
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Connector line up */}
                <div className="w-px h-4 bg-border" />
                <OrganogramNodeWrapper 
                  node={child} 
                  parentColor={areaColor}
                  depth={depth + 1}
                  expansionMode={expansionMode}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Wrapper component to handle expand state
interface OrganogramNodeWrapperProps {
  node: OrganogramNodeType;
  parentColor?: string | null;
  defaultExpanded?: boolean;
  /** Current depth in the tree (0 = root) */
  depth?: number;
  /** Global expansion mode from controls */
  expansionMode?: 'default' | 'all' | 'none';
}

export function OrganogramNodeWrapper({ 
  node, 
  parentColor,
  defaultExpanded,
  depth = 0,
  expansionMode = 'default',
}: OrganogramNodeWrapperProps) {
  // Default expand state based on node type and depth
  const getDefaultExpanded = () => {
    if (defaultExpanded !== undefined) return defaultExpanded;
    
    // Apply global expansion mode
    if (expansionMode === 'all') return true;
    if (expansionMode === 'none') return false;
    
    // Default mode: expand CEO, areas, and first-level teams
    // Subtimes (depth > 1 for teams) stay collapsed
    if (node.type === 'ceo' || node.type === 'area') return true;
    if (node.type === 'team' && depth === 0) return true;
    
    // Subteams and deeper teams stay collapsed
    return false;
  };

  const [isExpanded, setIsExpanded] = useState(getDefaultExpanded);
  const hasChildren = node.children.length > 0;

  return (
    <OrganogramNodeCard
      node={node}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      hasChildren={hasChildren}
      parentColor={parentColor}
      depth={depth}
      expansionMode={expansionMode}
    />
  );
}
