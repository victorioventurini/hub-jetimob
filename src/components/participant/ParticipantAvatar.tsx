// ============================================================
// PARTICIPANT AVATAR COMPONENT - Hub da Jet
// ============================================================
// Avatar component that handles both internal and external participants.
// ============================================================

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  type UnifiedParticipant, 
  type ParticipantDisplayInfo,
  isExternalParticipant, 
  getParticipantInitials 
} from '@/lib/participantTypes';

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
} as const;

export interface ParticipantAvatarProps {
  /** Participant data */
  participant: UnifiedParticipant | ParticipantDisplayInfo;
  
  /** Avatar size */
  size?: keyof typeof sizeClasses;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Whether to show a visual indicator for external users */
  showExternalIndicator?: boolean;
}

/**
 * Avatar component for unified participants.
 * 
 * Automatically handles:
 * - Internal users: Shows photo if available, initials fallback
 * - External users: Shows initials with distinct styling
 * 
 * @example
 * ```tsx
 * <ParticipantAvatar participant={participant} size="md" />
 * ```
 */
export function ParticipantAvatar({ 
  participant, 
  size = 'md',
  className,
  showExternalIndicator = false,
}: ParticipantAvatarProps) {
  const initials = getParticipantInitials(participant.displayName);
  const isExternal = isExternalParticipant(participant);

  return (
    <div className={cn('relative', className)}>
      <Avatar className={cn(sizeClasses[size])}>
        {participant.photoUrl && (
          <AvatarImage 
            src={participant.photoUrl} 
            alt={participant.displayName} 
          />
        )}
        <AvatarFallback 
          className={cn(
            isExternal 
              ? 'bg-accent text-accent-foreground' 
              : 'bg-muted text-muted-foreground'
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {showExternalIndicator && isExternal && (
        <span 
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-accent border-2 border-background"
          title="Usuário externo"
        />
      )}
    </div>
  );
}
