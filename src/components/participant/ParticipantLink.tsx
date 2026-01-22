// ============================================================
// PARTICIPANT LINK COMPONENT - Hub da Jet
// ============================================================
// Link component that navigates to the appropriate profile page
// based on participant type.
// ============================================================

import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  type UnifiedParticipant, 
  type ParticipantDisplayInfo,
  getParticipantProfilePath 
} from '@/lib/participantTypes';

export interface ParticipantLinkProps {
  /** Participant data */
  participant: UnifiedParticipant | ParticipantDisplayInfo;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Whether to open in a new tab */
  openInNewTab?: boolean;
  
  /** Children to render (defaults to display name) */
  children?: React.ReactNode;
}

/**
 * Link component that navigates to the appropriate profile page
 * based on whether the participant is internal or external.
 * 
 * - Internal: Links to /users/{participantId}
 * - External: Links to /contacts/{participantId}
 * 
 * @example
 * ```tsx
 * <ParticipantLink participant={participant}>
 *   View Profile
 * </ParticipantLink>
 * ```
 */
export function ParticipantLink({ 
  participant, 
  className, 
  openInNewTab = false,
  children,
}: ParticipantLinkProps) {
  const path = getParticipantProfilePath(participant);

  return (
    <Link
      to={path}
      className={cn(
        'hover:text-primary hover:underline transition-colors',
        className
      )}
      {...(openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
    >
      {children ?? participant.displayName}
    </Link>
  );
}
