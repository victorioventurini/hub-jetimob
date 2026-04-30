// ============================================================
// GENERIC MESSAGING SYSTEM - TYPES
// ============================================================
// Reusable types for messaging functionality across modules.
// Designed to be module-agnostic (tickets, projects, etc.)
// ============================================================

/**
 * Generic participant in a message thread.
 * Maps to either internal users (profiles) or external contacts.
 */
export interface MessageParticipant {
  id: string;
  name: string;
  photoUrl?: string | null;
  type: 'internal' | 'external';
}

/**
 * Generic attachment representation.
 */
export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  /** Storage path or URL for the file */
  storagePath: string;
}

/**
 * Lightweight attachment preview shown inside a quoted reply.
 * Does not include URL/storagePath — just enough for the citation badge.
 */
export interface MessageReplyAttachmentPreview {
  id: string;
  fileName: string;
  mimeType: string | null;
}

/**
 * Reply reference - the quoted message.
 *
 * Contract: a citation should render when EITHER `content` is non-empty
 * OR `attachments` has at least one item. Modules MUST populate both fields
 * (when applicable) so that messages composed only of attachments are still
 * shown as a meaningful citation (filename + paperclip icon).
 */
export interface MessageReplyTo {
  id: string;
  /** Truncated content preview (may be empty if original was attachment-only) */
  content: string;
  /** Author name for display */
  authorName: string;
  /** Attachments of the original message (preview-only, no URL) */
  attachments?: MessageReplyAttachmentPreview[];
}

/**
 * Generic message interface.
 * Base for all messaging implementations.
 */
export interface GenericMessage {
  id: string;
  /** Text content (plain text or extracted from richtext) */
  content: string;
  createdAt: string;
  editedAt?: string | null;
  author: MessageParticipant;
  isPinned?: boolean;
  attachments?: MessageAttachment[];
  /** Reply reference if this is a reply */
  replyTo?: MessageReplyTo | null;
}

/**
 * Configuration for message thread features.
 * Different modules may enable/disable features.
 */
export interface MessageThreadConfig {
  /** If module supports external participants (e.g., partner contacts) */
  allowExternalParticipants: boolean;
  /** If users can pin messages */
  allowPinning: boolean;
  /** If users can reply to specific messages */
  allowReply: boolean;
  /** If file attachments are allowed */
  allowAttachments: boolean;
  /** If mentions are allowed */
  allowMentions: boolean;
}

/**
 * Default thread config for internal-only modules.
 */
export const DEFAULT_INTERNAL_CONFIG: MessageThreadConfig = {
  allowExternalParticipants: false,
  allowPinning: true,
  allowReply: true,
  allowAttachments: true,
  allowMentions: true,
};

/**
 * Default thread config for modules with external participants.
 */
export const DEFAULT_EXTERNAL_CONFIG: MessageThreadConfig = {
  allowExternalParticipants: true,
  allowPinning: true,
  allowReply: true,
  allowAttachments: true,
  allowMentions: true,
};

/**
 * Props for the message composer component.
 */
export interface MessageComposerProps {
  onSend: (data: MessageComposerSendData) => Promise<void>;
  isSubmitting?: boolean;
  placeholder?: string;
  config?: MessageThreadConfig;
  /** Message being replied to (null = not replying) */
  replyingTo?: GenericMessage | null;
  /** Callback to cancel reply */
  onCancelReply?: () => void;
}

/**
 * Data emitted when sending a message.
 */
export interface MessageComposerSendData {
  content: string;
  mentions: Array<{ userId?: string; contactId?: string }>;
  files: File[];
  /** ID of the message being replied to */
  replyToMessageId?: string | null;
}

/**
 * Props for individual message bubble.
 */
export interface MessageBubbleProps {
  message: GenericMessage;
  isOwnMessage: boolean;
  config?: MessageThreadConfig;
  /** Callback when user clicks reply */
  onReply?: (message: GenericMessage) => void;
  /** Callback to pin/unpin */
  onTogglePin?: (messageId: string, pin: boolean) => void;
  isPinning?: boolean;
  /** Callback to scroll to a specific message */
  onScrollToMessage?: (messageId: string) => void;
  /** Custom content renderer for message body */
  renderContent?: (content: string) => React.ReactNode;
  /** Custom attachment renderer */
  renderAttachments?: (attachments: MessageAttachment[]) => React.ReactNode;
}

/**
 * Props for quoted message component.
 */
export interface QuotedMessageProps {
  replyTo: MessageReplyTo;
  /** Callback to scroll to original message */
  onScrollToMessage?: (messageId: string) => void;
  className?: string;
}

/**
 * Props for reply preview component.
 */
export interface ReplyPreviewProps {
  replyingTo: GenericMessage;
  onCancel: () => void;
  className?: string;
}
