import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Building2 } from "lucide-react";
import { 
  SquadWithRelations, 
  SQUAD_PRODUCT_LABELS, 
  SQUAD_PRODUCT_COLORS,
  SQUAD_ROLE_ABBREVIATIONS 
} from "../types/squad";

interface SquadCardProps {
  squad: SquadWithRelations;
  onClick?: () => void;
}

export function SquadCard({ squad, onClick }: SquadCardProps) {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Get leaders (PO, Tech Lead, UX Lead)
  const leaders = squad.members?.filter(
    (m) => m.role !== "member"
  ) || [];

  return (
    <Card 
      className="hover:border-accent/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">{squad.name}</h3>
            {squad.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {squad.description}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {squad.products.map((product) => (
              <Badge 
                key={product} 
                variant="outline" 
                className={SQUAD_PRODUCT_COLORS[product]}
              >
                {SQUAD_PRODUCT_LABELS[product]}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Leaders */}
        {leaders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {leaders.map((member) => (
              <div 
                key={member.id}
                className="flex items-center gap-1.5 text-sm"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.user.photo_url || undefined} />
                  <AvatarFallback className="text-xs bg-accent/10 text-accent">
                    {getInitials(member.user.display_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground">
                  {member.user.display_name.split(" ")[0]}
                </span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {SQUAD_ROLE_ABBREVIATIONS[member.role]}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{squad.member_count || 0} membros</span>
          </div>
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            <span>{squad.teams?.length || 0} times</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
