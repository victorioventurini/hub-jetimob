import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ContactLinkProps {
  /** Partner contact ID (partner_contacts.id) */
  contactId: string;
  displayName: string;
  className?: string;
  /** Render as plain text without link */
  showAsText?: boolean;
  /** Open profile in new tab */
  openInNewTab?: boolean;
}

/**
 * ContactLink - Link padronizado para perfil de contato externo
 * 
 * Uso:
 * - <ContactLink contactId={contact.id} displayName={contact.name} />
 * - <ContactLink contactId={contact.id} displayName={contact.name} openInNewTab />
 */
export function ContactLink({ 
  contactId,
  displayName, 
  className, 
  showAsText = false,
  openInNewTab = false,
}: ContactLinkProps) {
  if (showAsText || !contactId) {
    return <span className={className}>{displayName}</span>;
  }

  return (
    <Link
      to={`/contacts/${contactId}`}
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
