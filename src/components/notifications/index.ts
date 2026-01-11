// Re-export from mentions for backwards compatibility
export { 
  InternalMentionInput as MentionInput, 
} from '@/components/mentions';
export { 
  parseMentionsForDisplay, 
  getMentionDisplayText 
} from '@/lib/mentions';
export { NotificationCenter } from './NotificationCenter';
