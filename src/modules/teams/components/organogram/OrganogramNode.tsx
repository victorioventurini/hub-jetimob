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
}

const TYPE_CONFIG = {
  ceo: {
    icon: Crown,
    bgClass: "bg-card",
    borderClass: "border-2",
    iconClass: "text-amber-600 dark:text-amber-400",
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
  isExpanded,
  onToggle,
  hasChildren,
}: Omit<OrganogramNodeCardProps, 'parentColor'>) {
  return (
    <div className="flex flex-col items-center">
      {/* CEO circular avatar with colored ring */}
      <Link
        to={node.path}
        className="flex flex-col items-center group"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Avatar with ring */}
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full border-4 border-amber-400 p-1 bg-card shadow-lg">
            <OptimizedAvatar
              src={node.photoUrl}
              alt={node.name}
              fallback={node.name.slice(0, 2).toUpperCase()}
              className="w-full h-full text-lg"
            />
          </div>
        </div>

        {/* Name card below avatar */}
        <div className={cn(
          "flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-amber-400 bg-card shadow-sm transition-all",
          "group-hover:shadow-md group-hover:border-amber-500"
        )}>
          <div className="text-center">
            <p className="font-semibold text-sm">{node.name}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">CEO</p>
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
                "p-1 rounded-md hover:bg-accent transition-colors ml-1",
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
        </div>
      </Link>

      {/* Children (Areas) */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center mt-4">
          {/* Connector line down */}
          <div className="w-px h-4 bg-border" />
          
          {/* Children container - horizontal row for areas */}
          <div className="flex flex-nowrap justify-center gap-4 relative">
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
}: OrganogramNodeCardProps) {
  // CEO tem card especial
  if (node.type === 'ceo') {
    return (
      <CeoCard
        node={node}
        isExpanded={isExpanded}
        onToggle={onToggle}
        hasChildren={hasChildren}
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

  // Check if this is a team/subteam (always show leader section for consistent height)
  const isTeamOrSubteam = node.type === 'team' || node.type === 'subteam';
  const hasLeader = isTeamOrSubteam && node.leaderName;

  return (
    <div className="flex flex-col items-center">
      <Link
        to={node.path}
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
          {/* Leader info for teams - always show section for consistent height */}
          {isTeamOrSubteam && (
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
}

export function OrganogramNodeWrapper({ 
  node, 
  parentColor,
  defaultExpanded 
}: OrganogramNodeWrapperProps) {
  // Default expand state based on type
  const getDefaultExpanded = () => {
    if (defaultExpanded !== undefined) return defaultExpanded;
    switch (node.type) {
      case 'ceo':
      case 'area':
        return true;
      default:
        return false;
    }
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
    />
  );
}
