// ============================================================
// PARTICIPANT BADGE COMPONENT - Hub da Jet
// ============================================================
// Composite component showing avatar + name + optional company info.
// ============================================================

import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type UnifiedParticipant, 
  type ParticipantDisplayInfo,
  isExternalParticipant 
} from '@/lib/participantTypes';
import { ParticipantAvatar } from './ParticipantAvatar';
import { ParticipantLink } from './ParticipantLink';
import { Badge } from '@/components/ui/badge';

const sizeClasses = {
  sm: {
    container: 'gap-1.5',
    name: 'text-xs',
    meta: 'text-[10px]',
    avatar: 'xs' as const,
  },
  md: {
    container: 'gap-2',
    name: 'text-sm',
    meta: 'text-xs',
    avatar: 'sm' as const,
  },
  lg: {
    container: 'gap-3',
    name: 'text-base',
    meta: 'text-sm',
    avatar: 'md' as const,
  },
};

export interface ParticipantBadgeProps {
  /** Participant data */
  participant: UnifiedParticipant | ParticipantDisplayInfo;
  
  /** Size variant */
  size?: keyof typeof sizeClasses;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Whether the name should be a link to the profile */
  linkToProfile?: boolean;
  
  /** Whether to show the external badge */
  showExternalBadge?: boolean;
  
  /** Whether to show company name for external users */
  showCompanyName?: boolean;
  
  /** Whether to show job title/team for internal users */
  showMeta?: boolean;
}

/**
 * Composite component showing participant avatar, name, and metadata.
 * 
 * Automatically handles:
 * - Internal: Shows avatar, name, optional team/job title
 * - External: Shows avatar, name, company name, "Externo" badge
 * 
 * @example
 * ```tsx
 * <ParticipantBadge 
 *   participant={participant} 
 *   linkToProfile 
 *   showCompanyName 
 * />
 * ```
 */
export function ParticipantBadge({
  participant,
  size = 'md',
  className,
  linkToProfile = false,
  showExternalBadge = true,
  showCompanyName = true,
  showMeta = false,
}: ParticipantBadgeProps) {
  const isExternal = isExternalParticipant(participant);
  const styles = sizeClasses[size];

  // Get meta info (company for external, team for internal)
  const metaInfo = isExternal 
    ? (showCompanyName ? participant.companyName : null)
    : (showMeta && 'teamName' in participant ? participant.teamName : null);

  return (
    <div className={cn('flex items-center', styles.container, className)}>
      <ParticipantAvatar 
        participant={participant} 
        size={styles.avatar}
        showExternalIndicator={isExternal}
      />
      
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          {linkToProfile ? (
            <ParticipantLink 
              participant={participant} 
              className={cn('font-medium truncate', styles.name)}
            />
          ) : (
            <span className={cn('font-medium truncate', styles.name)}>
              {participant.displayName}
            </span>
          )}
          
          {showExternalBadge && isExternal && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-1 py-0 h-4 bg-accent/50 text-accent-foreground border-border"
            >
              Externo
            </Badge>
          )}
        </div>
        
        {metaInfo && (
          <span className={cn('text-muted-foreground truncate flex items-center gap-1', styles.meta)}>
            {isExternal && <Building2 className="h-3 w-3 shrink-0" />}
            {metaInfo}
          </span>
        )}
      </div>
    </div>
  );
}
