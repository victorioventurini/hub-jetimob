// ============================================================
// USE UNIFIED PARTICIPANT HOOK - Hub da Jet
// ============================================================
// Hook that provides unified identity for the current user,
// abstracting whether they are internal (profile) or external (partner_contact).
// ============================================================

import { useMemo } from 'react';
import { useIdentity } from '@/hooks/useIdentity';
import { useExternalUser } from '@/modules/external/hooks/useExternalUser';
import { useBu } from '@/contexts/BuContext';
import type { UnifiedParticipant, ParticipantType } from '@/lib/participantTypes';

export interface UseUnifiedParticipantResult {
  /** Current user as UnifiedParticipant (null while loading) */
  participant: UnifiedParticipant | null;
  
  /** Whether the current user is internal */
  isInternal: boolean;
  
  /** Whether the current user is external */
  isExternal: boolean;
  
  /** Whether identity is still loading */
  isLoading: boolean;
  
  /** Whether identity has been resolved */
  isReady: boolean;
  
  /** The participant ID to use for assignments/operations */
  participantId: string | null;
  
  /** The user type */
  userType: ParticipantType | null;
}

/**
 * Hook that provides unified identity for the current user.
 * 
 * Abstracts whether the user is internal (profile) or external (partner_contact),
 * providing a consistent interface for components that need to work with both.
 * 
 * @example
 * ```tsx
 * const { participant, isInternal, isExternal, participantId } = useUnifiedParticipant();
 * 
 * // Use participantId for assignments
 * await assignTicket({ ownerId: participantId });
 * 
 * // Render based on type
 * if (isExternal) {
 *   return <ExternalUserView />;
 * }
 * ```
 */
export function useUnifiedParticipant(): UseUnifiedParticipantResult {
  const { profileId, isReady: identityReady, isLoading: identityLoading } = useIdentity();
  const { externalData, isExternal, isLoading: externalLoading } = useExternalUser();
  const { currentBu } = useBu();

  const participant = useMemo((): UnifiedParticipant | null => {
    // Still loading
    if (!identityReady) return null;

    // External user
    if (isExternal && externalData?.primaryContact) {
      // Find contact for current BU if available
      const buContact = externalData.contacts.find(c => c.buId === currentBu?.id);
      const contact = buContact || externalData.primaryContact;

      return {
        userType: 'external',
        participantId: contact.contactId,
        authUserId: null, // ExternalContactRecord doesn't expose userId
        displayName: contact.name,
        email: contact.email,
        photoUrl: null,
        buId: contact.buId || currentBu?.id || null,
        companyId: contact.companyId ?? null,
        companyName: contact.companyName ?? null,
        teamName: null,
        jobTitle: null,
      };
    }

    // Internal user (profile)
    if (profileId) {
      return {
        userType: 'internal',
        participantId: profileId,
        authUserId: null, // Will be populated by query if needed
        displayName: '', // Will be populated by query if needed
        email: '',
        photoUrl: null,
        buId: currentBu?.id ?? null,
        companyId: null,
        companyName: null,
        teamName: null,
        jobTitle: null,
      };
    }

    return null;
  }, [profileId, isExternal, externalData, currentBu, identityReady]);

  const isLoading = identityLoading || externalLoading;
  const isReady = identityReady && !externalLoading;

  return {
    participant,
    isInternal: !isExternal,
    isExternal,
    isLoading,
    isReady,
    participantId: participant?.participantId ?? null,
    userType: participant?.userType ?? null,
  };
}
