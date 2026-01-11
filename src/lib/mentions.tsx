// ============================================================
// MENTIONS LIB - Hub da Jet
// ============================================================
// Global helpers for parsing and displaying mentions across modules.
// Supports internal users (profiles) and external contacts (partner_contacts).
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { UserHoverCard } from '@/components/user/UserHoverCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2 } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

/**
 * Mention context determines which users can be mentioned:
 * - 'internal': Only internal users (profiles) from the BU
 * - 'internal+external': Internal users + external contacts from a partner company
 */
export type MentionContext = 'internal' | 'internal+external';

/**
 * A parsed mention extracted from rich text.
 */
export interface ParsedMention {
  userId: string | null;      // profile_id for internal users
  contactId: string | null;   // partner_contact_id for external contacts
  displayName: string;
  type: 'internal' | 'external';
}

/**
 * A mentionable candidate returned from search.
 */
export interface MentionCandidate {
  id: string;
  entity_id: string;
  entity_type: 'internal_user' | 'partner_contact';
  display_name: string;
  email: string | null;
  photo_url: string | null;
  team_name: string | null;
  partner_company_name: string | null;
}

/**
 * Internal user candidate (for 'internal' context).
 */
export interface InternalUserCandidate {
  id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  photo_url: string | null;
  team_name: string | null;
}

// ============================================================
// MENTION FORMAT
// ============================================================

/**
 * Mention format in rich text:
 * - Internal: @[Name](internal:uuid)
 * - External: @[Name](external:uuid)
 */
const MENTION_REGEX = /@\[([^\]]+)\]\(([^:]+):([^)]+)\)/g;

/**
 * Legacy format (OKRs): @[Name](uuid) - internal only, no type prefix
 */
const LEGACY_MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

// ============================================================
// EXTRACTION HELPERS
// ============================================================

/**
 * Extract mentions from rich text in format @[Name](type:id)
 */
export function extractMentionsFromText(text: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  const regex = new RegExp(MENTION_REGEX.source, 'g');
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const displayName = match[1];
    const type = match[2] as 'internal' | 'external';
    const id = match[3];
    
    mentions.push({
      userId: type === 'internal' ? id : null,
      contactId: type === 'external' ? id : null,
      displayName,
      type,
    });
  }
  
  return mentions;
}

/**
 * Extract mentions from legacy format @[Name](id) - assumes internal
 */
export function extractLegacyMentions(text: string): string[] {
  const mentions: string[] = [];
  const regex = new RegExp(LEGACY_MENTION_REGEX.source, 'g');
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const id = match[2];
    // Skip if it looks like the new format (contains colon)
    if (!id.includes(':')) {
      mentions.push(id);
    }
  }
  
  return mentions;
}

/**
 * Get display text with mentions stripped of syntax.
 * @[John Doe](internal:123) → @John Doe
 */
export function getMentionDisplayText(text: string): string {
  // Handle new format first
  let result = text.replace(/@\[([^\]]+)\]\([^:]+:[^)]+\)/g, '@$1');
  // Handle legacy format
  result = result.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
  return result;
}

/**
 * Get plain text with mentions completely removed.
 */
export function getMentionPlainText(text: string): string {
  // Handle new format first
  let result = text.replace(/@\[([^\]]+)\]\([^:]+:[^)]+\)/g, '$1');
  // Handle legacy format
  result = result.replace(/@\[([^\]]+)\]\([^)]+\)/g, '$1');
  return result;
}

// ============================================================
// DISPLAY HELPERS
// ============================================================

/**
 * Parse mentions for display - converts mention syntax to styled React elements.
 * Supports both new format (@[Name](type:id)) and legacy format (@[Name](id)).
 */
export function parseMentionsForDisplay(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  
  // Combined regex to match both formats
  const combinedRegex = /@\[([^\]]+)\]\((?:([^:)]+):)?([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const displayName = match[1];
    const typeOrId = match[2]; // 'internal', 'external', or undefined (legacy)
    const id = match[3];
    
    // Determine if it's external or internal
    const isExternal = typeOrId === 'external';
    const userId = typeOrId === 'external' ? null : (typeOrId === 'internal' ? id : id);

    if (isExternal) {
      // External contact - show tooltip
      parts.push(
        <TooltipProvider key={`${id}-${match.index}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 text-sm font-medium cursor-default">
                <Building2 className="w-3 h-3" />
                @{displayName}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Contato externo (parceiro)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      // Internal user - use UserHoverCard with Link
      parts.push(
        <UserHoverCard key={`${userId}-${match.index}`} userId={userId || id}>
          <Link
            to={`/users/${userId || id}`}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            @{displayName}
          </Link>
        </UserHoverCard>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// ============================================================
// CREATION HELPERS
// ============================================================

/**
 * Create a mention string from a candidate.
 * @returns @[Name](type:id)
 */
export function createMentionString(
  displayName: string,
  id: string,
  type: 'internal' | 'external'
): string {
  return `@[${displayName}](${type}:${id})`;
}

/**
 * Create mention string from a MentionCandidate.
 */
export function createMentionFromCandidate(candidate: MentionCandidate): string {
  const type = candidate.entity_type === 'partner_contact' ? 'external' : 'internal';
  return createMentionString(candidate.display_name, candidate.entity_id, type);
}

/**
 * Create mention string from an InternalUserCandidate (legacy support).
 */
export function createMentionFromInternalUser(user: InternalUserCandidate): string {
  return createMentionString(user.display_name, user.user_id, 'internal');
}

// ============================================================
// EMAIL HELPERS
// ============================================================

/**
 * Extract email prefix (before @).
 * Useful for displaying shorter names based on email.
 */
export function getEmailPrefix(email: string | null): string | null {
  if (!email) return null;
  const atIndex = email.indexOf('@');
  return atIndex > 0 ? email.slice(0, atIndex) : null;
}

/**
 * Get display name for a mention candidate.
 * Prefers email prefix if available, falls back to display_name.
 */
export function getMentionDisplayName(candidate: MentionCandidate | InternalUserCandidate): string {
  return getEmailPrefix(candidate.email) || candidate.display_name;
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Check if text contains any mentions.
 */
export function hasMentions(text: string): boolean {
  const combinedRegex = /@\[([^\]]+)\]\((?:([^:)]+):)?([^)]+)\)/;
  return combinedRegex.test(text);
}

/**
 * Count mentions in text.
 */
export function countMentions(text: string): number {
  const combinedRegex = /@\[([^\]]+)\]\((?:([^:)]+):)?([^)]+)\)/g;
  return (text.match(combinedRegex) || []).length;
}

/**
 * Get initials from a name (for avatars).
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
