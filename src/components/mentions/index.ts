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

// Legacy export - TicketMentionInput (deprecated, use MentionInput with context='internal+external')
export { TicketMentionInput, parseMentionsForTicketDisplay } from './TicketMentionInput';
