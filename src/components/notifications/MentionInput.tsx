import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserHoverCard } from '@/components/user/UserHoverCard';

// Helper function to extract display text (without mention syntax)
export function getMentionDisplayText(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

// Helper to parse mentions for display (convert @[Name](id) to styled chips with hover)
export function parseMentionsForDisplay(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const displayName = match[1];
    const userId = match[2];
    parts.push(
      <UserHoverCard key={`${userId}-${match.index}`} userId={userId}>
        <Link
          to={`/users/${userId}`}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          @{displayName}
        </Link>
      </UserHoverCard>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

interface MentionUser {
  id: string;
  user_id: string;
  display_name: string;
  photo_url: string | null;
  team_name: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  required?: boolean;
  id?: string;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  required,
  id,
}: MentionInputProps) {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch users for mention suggestions
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['mention-users', currentBu?.id, searchTerm],
    queryFn: async () => {
      if (!currentBu?.id) return [];

      let query = supabase
        .from('v_bu_active_profiles')
        .select(`
          id,
          user_id,
          display_name,
          photo_url,
          team_name
        `)
        .eq('bu_id', currentBu.id)
        .order('display_name');

      if (searchTerm) {
        query = query.ilike('display_name', `%${searchTerm}%`);
      }

      query = query.limit(8);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(u => ({
        id: u.id,
        user_id: u.user_id,
        display_name: u.display_name,
        photo_url: u.photo_url,
        team_name: u.team_name || null,
      })) as MentionUser[];
    },
    enabled: !!currentBu?.id && showSuggestions,
  });

  // Count mentions in text
  const mentionCount = useMemo(() => {
    const regex = /@\[([^\]]+)\]\([^)]+\)/g;
    return (value.match(regex) || []).length;
  }, [value]);

  // Extract mentions from text
  const extractMentions = useCallback((text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]);
    }
    return mentions;
  }, []);

  // Get display value for textarea (convert internal format to display format)
  const displayValue = useMemo(() => {
    return getMentionDisplayText(value);
  }, [value]);

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplayValue = e.target.value;
    const newPosition = e.target.selectionStart;
    setCursorPosition(newPosition);

    // Check if user is typing a mention
    const textBeforeCursor = newDisplayValue.slice(0, newPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's no space/newline after @ and it's not too long
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n') && textAfterAt.length < 30) {
        setMentionStart(lastAtIndex);
        setSearchTerm(textAfterAt);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
        setMentionStart(null);
      }
    } else {
      setShowSuggestions(false);
      setMentionStart(null);
    }

    // Rebuild value preserving existing mentions
    // We need to track which mentions were in the old value and map them back
    const oldMentions: Array<{ displayName: string; userId: string; position: number }> = [];
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    let displayOffset = 0;
    let rawOffset = 0;
    
    // First pass: find all mentions and their display positions
    let tempValue = value;
    while ((match = mentionRegex.exec(value)) !== null) {
      const displayName = match[1];
      const userId = match[2];
      const rawStart = match.index;
      const displayLength = `@${displayName}`.length;
      const rawLength = match[0].length;
      
      // Calculate display position
      const displayStart = rawStart - (rawOffset - displayOffset);
      oldMentions.push({ displayName, userId, position: displayStart });
      
      displayOffset += displayLength;
      rawOffset += rawLength;
    }

    // Reconstruct value: for each mention that still exists in the new display value at roughly the same position, keep it
    let newValue = newDisplayValue;
    
    // Sort mentions by position descending so we can replace from end to start
    const sortedMentions = [...oldMentions].sort((a, b) => b.position - a.position);
    
    for (const mention of sortedMentions) {
      const displayText = `@${mention.displayName}`;
      // Look for the mention in the new display value near its old position
      const searchStart = Math.max(0, mention.position - 5);
      const searchEnd = Math.min(newDisplayValue.length, mention.position + displayText.length + 5);
      const searchArea = newDisplayValue.slice(searchStart, searchEnd);
      const foundIndex = searchArea.indexOf(displayText);
      
      if (foundIndex !== -1) {
        const actualPosition = searchStart + foundIndex;
        // Replace display text with internal format
        newValue = newValue.slice(0, actualPosition) + 
                   `@[${mention.displayName}](${mention.userId})` + 
                   newValue.slice(actualPosition + displayText.length);
      }
    }

    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);
  };

  // Handle user selection from suggestions
  const selectUser = (user: MentionUser) => {
    if (mentionStart === null || !textareaRef.current) return;

    const beforeMention = displayValue.slice(0, mentionStart);
    const afterMention = displayValue.slice(cursorPosition);

    // Create the mention in internal format
    const mentionText = `@[${user.display_name}](${user.user_id})`;
    
    // Rebuild the full value
    let newValue = beforeMention + mentionText + ' ' + afterMention;
    
    // Reconstruct other mentions from the value
    const oldMentions: Array<{ displayName: string; userId: string }> = [];
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = mentionRegex.exec(value)) !== null) {
      oldMentions.push({ displayName: match[1], userId: match[2] });
    }

    // Restore other mentions that might be in beforeMention or afterMention
    for (const mention of oldMentions) {
      const displayText = `@${mention.displayName}`;
      const internalFormat = `@[${mention.displayName}](${mention.userId})`;
      // Replace any display format with internal format (except for the one we just added)
      if (mention.userId !== user.user_id) {
        newValue = newValue.replace(displayText, internalFormat);
      }
    }

    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);

    setShowSuggestions(false);
    setMentionStart(null);
    setSearchTerm('');

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + `@${user.display_name}`.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || users.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % users.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
        break;
      case 'Enter':
        if (showSuggestions) {
          e.preventDefault();
          selectUser(users[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      case 'Tab':
        if (showSuggestions) {
          e.preventDefault();
          selectUser(users[selectedIndex]);
        }
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={id}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          required={required}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
            showSuggestions && "ring-2 ring-primary/50",
            className
          )}
        />

        {/* Mention indicator */}
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {mentionCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs gap-1">
              <AtSign className="w-3 h-3" />
              {mentionCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Mention Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className={cn(
            "absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          )}
        >
          {users.length > 0 ? (
            <div className="max-h-48 overflow-y-auto py-1">
              {users.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectUser(user)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                    "hover:bg-primary/10",
                    index === selectedIndex && "bg-primary/10"
                  )}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.photo_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(user.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate flex-1">{user.display_name}</span>
                </button>
              ))}
            </div>
          ) : !isLoadingUsers && searchTerm ? (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : isLoadingUsers ? (
            <div className="px-3 py-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
