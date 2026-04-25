import { memo } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail } from "lucide-react";

export interface TeamMemberRowProps {
  id: string;
  display_name: string;
  photo_url: string | null;
  job_title: string | null;
  work_email: string | null;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

function TeamMemberRowImpl({ id, display_name, photo_url, job_title, work_email }: TeamMemberRowProps) {
  return (
    <Link
      to={`/users/${id}`}
      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={photo_url || undefined} />
          <AvatarFallback className="bg-accent/10 text-accent">
            {getInitials(display_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium group-hover:text-accent transition-colors truncate">
            {display_name}
          </p>
          {job_title && (
            <p className="text-sm text-muted-foreground truncate">{job_title}</p>
          )}
        </div>
      </div>
      {work_email && (
        <a
          href={`mailto:${work_email}`}
          className="text-muted-foreground hover:text-accent shrink-0 ml-2"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Enviar e-mail para ${display_name}`}
        >
          <Mail className="h-4 w-4" />
        </a>
      )}
    </Link>
  );
}

export const TeamMemberRow = memo(TeamMemberRowImpl);
