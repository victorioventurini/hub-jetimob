/**
 * OrganogramNode - Card individual do organograma
 */
import { memo } from "react";
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
    bgClass: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20",
    borderClass: "border-amber-400 dark:border-amber-600",
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

export const OrganogramNodeCard = memo(function OrganogramNodeCard({
  node,
  isExpanded,
  onToggle,
  hasChildren,
  parentColor,
}: OrganogramNodeCardProps) {
  const config = TYPE_CONFIG[node.type];
  const Icon = config.icon;
  
  // Use parent color for border if available
  const borderStyle = parentColor && (node.type === 'area' || node.type === 'team' || node.type === 'subteam')
    ? { borderLeftColor: parentColor }
    : undefined;

  // For area, use own color
  const areaColor = node.type === 'area' ? node.color : parentColor;

  return (
    <div className="flex flex-col items-center">
      <Link
        to={node.path}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-sm transition-all",
          "hover:shadow-md hover:border-accent focus:outline-none focus:ring-2 focus:ring-ring",
          "min-w-[180px] max-w-[280px]",
          config.bgClass,
          config.borderClass
        )}
        style={borderStyle || (node.color ? { borderLeftColor: node.color } : undefined)}
        onClick={(e) => {
          // Allow navigation but prevent toggle
          e.stopPropagation();
        }}
      >
        {/* Avatar or Icon */}
        {node.photoUrl || node.type === 'person' || node.type === 'ceo' ? (
          <OptimizedAvatar
            src={node.photoUrl}
            alt={node.name}
            fallback={node.name.slice(0, 2).toUpperCase()}
            size="sm"
          />
        ) : (
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            "bg-muted"
          )}>
            <Icon className={cn("w-4 h-4", config.iconClass)} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{node.name}</p>
          {node.role && (
            <p className="text-xs text-muted-foreground truncate">{node.role}</p>
          )}
          {node.email && node.type !== 'person' && (
            <p className="text-xs text-muted-foreground truncate">{node.email}</p>
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
        <div className="flex flex-col items-center mt-4">
          {/* Connector line down */}
          <div className="w-px h-4 bg-border" />
          
          {/* Children container */}
          <div className="flex flex-wrap justify-center gap-4 relative">
            {/* Horizontal line connecting children */}
            {node.children.length > 1 && (
              <div 
                className="absolute top-0 h-px bg-border"
                style={{
                  left: '25%',
                  right: '25%',
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
import { useState } from "react";

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
