import { useState } from "react";
import { ChevronRight, ChevronDown, Users, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TeamTreeNode } from "../types";

interface TeamTreeViewProps {
  nodes: TeamTreeNode[];
  onSelectTeam?: (teamId: string) => void;
  selectedTeamId?: string;
}

export function TeamTreeView({
  nodes,
  onSelectTeam,
  selectedTeamId,
}: TeamTreeViewProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          onSelectTeam={onSelectTeam}
          selectedTeamId={selectedTeamId}
        />
      ))}
    </div>
  );
}

interface TreeNodeProps {
  node: TeamTreeNode;
  level: number;
  onSelectTeam?: (teamId: string) => void;
  selectedTeamId?: string;
}

function TreeNode({ node, level, onSelectTeam, selectedTeamId }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedTeamId === node.id;
  const isInactive = node.status === "inactive";

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
          isSelected
            ? "bg-accent/10 border border-accent/30"
            : "hover:bg-muted/50",
          isInactive && "opacity-60"
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelectTeam?.(node.id)}
      >
        {/* Expand/Collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded(!expanded);
          }}
          className={cn(
            "h-5 w-5 flex items-center justify-center rounded hover:bg-muted",
            !hasChildren && "invisible"
          )}
        >
          {hasChildren &&
            (expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ))}
        </button>

        {/* Team Info */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-medium truncate",
                  isSelected && "text-accent"
                )}
              >
                {node.name}
              </span>
              {isInactive && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Inativo
                </Badge>
              )}
            </div>
          </div>

          {/* Leader Avatar */}
          {node.leader && (
            <div className="flex items-center gap-1.5" title={node.leader.display_name}>
              <Avatar className="h-5 w-5">
                <AvatarImage src={node.leader.photo_url || undefined} />
                <AvatarFallback className="text-[8px] bg-accent/10 text-accent">
                  {getInitials(node.leader.display_name)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Member Count */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{node.member_count}</span>
          </div>

          {/* Child Count */}
          {hasChildren && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {node.children.length} sub
            </Badge>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelectTeam={onSelectTeam}
              selectedTeamId={selectedTeamId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
