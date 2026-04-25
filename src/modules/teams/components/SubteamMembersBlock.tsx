import { memo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ChevronDown, ChevronRight, Users } from "lucide-react";
import { useBuUsersDirectory } from "@/hooks/useBuUsersDirectory";
import { TeamMemberRow } from "./TeamMemberRow";

export interface SubteamMembersBlockProps {
  id: string;
  name: string;
  status: string;
}

function SubteamMembersBlockImpl({ id, name, status }: SubteamMembersBlockProps) {
  const [open, setOpen] = useState(true);

  // Apenas membros diretos do subtime — netos ficam visíveis ao navegar para o subtime.
  const { data: profiles = [], isLoading } = useBuUsersDirectory({
    teamId: id,
    includeSubteams: false,
    pageSize: 200,
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg bg-card">
      <div className="flex items-center justify-between gap-2 p-3">
        <CollapsibleTrigger
          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:text-accent transition-colors"
          aria-label={open ? "Recolher subtime" : "Expandir subtime"}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-medium truncate">{name}</span>
          {status === "inactive" && (
            <Badge variant="secondary" className="text-xs">
              Inativo
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-1">
            ({isLoading ? "…" : profiles.length})
          </span>
        </CollapsibleTrigger>
        <Link
          to={`/teams/${id}`}
          className="text-xs text-muted-foreground hover:text-accent shrink-0"
        >
          Ver time
        </Link>
      </div>

      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : profiles.length > 0 ? (
            profiles.map((p) => (
              <TeamMemberRow
                key={p.id}
                id={p.id}
                display_name={p.display_name}
                photo_url={p.photo_url}
                job_title={p.job_title_name}
                work_email={p.work_email}
              />
            ))
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Users className="h-6 w-6" />
              Este sub-time não possui membros
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const SubteamMembersBlock = memo(SubteamMembersBlockImpl);
