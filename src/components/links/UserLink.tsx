import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UserLinkProps {
  /**
   * Profile ID (profiles.id) - DOMAIN IDENTITY
   */
  profileId?: string;
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
 * IMPORTANTE: Sempre passe profileId (profiles.id), não auth.users.id!
 *
 * Uso:
 * - <UserLink profileId={profile.id} displayName={user.name} />
 * - <UserLink profileId={profile.id} displayName={user.name} openInNewTab />
 * - <UserLink profileId={profile.id} displayName={user.name} showAsText />
 */
export function UserLink({
  profileId,
  displayName,
  className,
  showAsText = false,
  openInNewTab = false,
}: UserLinkProps) {
  const id = profileId;
  if (showAsText) {
    return <span className={className}>{displayName}</span>;
  }

  if (!id) {
    return <span className={className}>{displayName}</span>;
  }

  return (
    <Link
      to={`/users/${id}`}
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
