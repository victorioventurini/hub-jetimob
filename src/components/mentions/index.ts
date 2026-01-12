// ============================================================
// MENTIONS COMPONENTS - Hub da Jet
// ============================================================
// Centralized exports for mention-related components and helpers.
// ============================================================

// Main unified component
export { 
  MentionInput,
  InternalMentionInput,
  TicketMentionInputWrapper,
  type MentionInputProps,
  type InternalMentionInputProps,
  type TicketMentionInputWrapperProps,
} from './MentionInput';

// Re-export types and helpers from lib/mentions for convenience
export {
  type MentionContext,
  type ParsedMention,
  type MentionCandidate,
  extractMentionsFromText,
  getMentionDisplayText,
  getMentionPlainText,
  parseMentionsForDisplay,
  getEmailPrefix,
  getInitials,
  countMentions,
  hasMentions,
  createMentionString,
  createMentionFromCandidate,
} from '@/lib/mentions';
// Note: TicketMentionInput was removed in P2 cleanup (2026-01-12)
// Use MentionInput with context='internal+external' instead
// parseMentionsForDisplay from lib/mentions handles display rendering
