import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UserLinkProps {
  userId: string;
  displayName: string;
  className?: string;
  /** Render as plain text without link */
  showAsText?: boolean;
  /** Open profile in new tab */
  openInNewTab?: boolean;
}

/**
 * UserLink - Link padronizado para perfil de usuário
 * 
 * Uso:
 * - <UserLink userId={user.id} displayName={user.name} />
 * - <UserLink userId={user.id} displayName={user.name} openInNewTab />
 * - <UserLink userId={user.id} displayName={user.name} showAsText />
 */
export function UserLink({ 
  userId, 
  displayName, 
  className, 
  showAsText = false,
  openInNewTab = false,
}: UserLinkProps) {
  if (showAsText) {
    return <span className={className}>{displayName}</span>;
  }

  return (
    <Link
      to={`/users/${userId}`}
      className={cn(
        "text-foreground hover:text-primary font-medium transition-colors cursor-pointer",
        className
      )}
      {...(openInNewTab && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {displayName}
    </Link>
  );
}
