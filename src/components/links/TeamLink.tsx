import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TeamLinkProps {
  teamId: string;
  teamName: string;
  className?: string;
  showAsText?: boolean;
}

export function TeamLink({ teamId, teamName, className, showAsText = false }: TeamLinkProps) {
  if (showAsText) {
    return <span className={className}>{teamName}</span>;
  }

  return (
    <Link
      to={`/teams/${teamId}`}
      className={cn(
        "text-foreground hover:text-accent font-medium transition-colors cursor-pointer",
        className
      )}
    >
      {teamName}
    </Link>
  );
}
