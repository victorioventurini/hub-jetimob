import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UserLinkProps {
  userId: string;
  displayName: string;
  className?: string;
  showAsText?: boolean;
}

export function UserLink({ userId, displayName, className, showAsText = false }: UserLinkProps) {
  if (showAsText) {
    return <span className={className}>{displayName}</span>;
  }

  return (
    <Link
      to={`/users/${userId}`}
      className={cn(
        "text-foreground hover:text-accent font-medium transition-colors cursor-pointer",
        className
      )}
    >
      {displayName}
    </Link>
  );
}
