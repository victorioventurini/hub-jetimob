// ============================================================
// MENTION INPUT - Hub da Jet
// ============================================================
// Unified mention input component that supports both contexts:
// - 'internal': Only internal users (for OKRs, internal comments)
// - 'internal+external': Internal + external contacts (for Tickets)
// ============================================================

import { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, AtSign, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMentionableUsers } from '@/hooks/useMentionableUsers';
import type { 
  MentionContext, 
  ParsedMention, 
  MentionCandidate 
} from '@/lib/mentions';
import {
  extractMentionsFromText,
  getEmailPrefix,
  getInitials,
  countMentions,
} from '@/lib/mentions';

// Re-export types and helpers for convenience
export type { MentionContext, ParsedMention, MentionCandidate };
export { extractMentionsFromText, getEmailPrefix };

// ============================================================
// COMPONENT PROPS
// ============================================================

export interface MentionInputProps {
  /** Current value of the input (with mention syntax) */
  value: string;
  
  /** 
   * Callback when value changes.
   * - For 'internal' context: mentions is string[] of user IDs
   * - For 'internal+external' context: mentions is ParsedMention[]
   */
  onChange: (value: string, mentions: ParsedMention[]) => void;
  
  /**
   * Context determines which users can be mentioned:
   * - 'internal': Only internal users (profiles) from the BU
   * - 'internal+external': Internal users + external contacts
   */
  context: MentionContext;
  
  /**
   * Partner company ID - required when context is 'internal+external'.
   * Used to filter external contacts to those belonging to this company.
   */
  partnerCompanyId?: string | null;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Number of rows for the textarea */
  rows?: number;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Whether the field is required */
  required?: boolean;
  
  /** HTML id attribute */
  id?: string;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function MentionInput({
  value,
  onChange,
  context,
  partnerCompanyId,
  placeholder = "Digite sua mensagem... Use @ para mencionar",
  rows = 3,
  className,
  required,
  id,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mentionStartOffset, setMentionStartOffset] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>(value);

  // Use the unified hook for fetching mentionable users
  const { candidates, isLoading: isLoadingCandidates } = useMentionableUsers({
    context,
    partnerCompanyId,
    searchTerm,
    enabled: showSuggestions,
  });

  // Count mentions in text
  const mentionCount = useMemo(() => countMentions(value), [value]);

  // Extract mentions from text
  const extractMentions = useCallback((text: string): ParsedMention[] => {
    return extractMentionsFromText(text);
  }, []);

  // Escape HTML special characters
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  };

  // Convert internal value to HTML for contenteditable
  const valueToHtml = useCallback((val: string): string => {
    const mentionRegex = /@\[([^\]]+)\]\(([^:]+):([^)]+)\)/g;
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(val)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        result += escapeHtml(val.slice(lastIndex, match.index));
      }

      const displayName = match[1];
      const type = match[2];
      const entityId = match[3];
      const isExternal = type === 'external';
      
      // Add mention chip as non-editable span with zero-width space after for cursor positioning
      result += `<span contenteditable="false" data-mention-id="${entityId}" data-mention-type="${type}" class="mention-chip ${isExternal ? 'mention-chip-external' : 'mention-chip-internal'}">@${escapeHtml(displayName)}</span>\u200B`;

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < val.length) {
      result += escapeHtml(val.slice(lastIndex));
    }

    return result || '<br>';
  }, []);

  // Convert HTML from contenteditable back to internal value
  const htmlToValue = useCallback((html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    let result = '';
    
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        
        if (element.classList.contains('mention-chip')) {
          const entityId = element.getAttribute('data-mention-id');
          const mentionType = element.getAttribute('data-mention-type');
          const displayText = element.textContent?.replace('@', '') || '';
          if (entityId && mentionType) {
            result += `@[${displayText}](${mentionType}:${entityId})`;
          }
        } else if (element.tagName === 'BR') {
          result += '\n';
        } else if (element.tagName === 'DIV' || element.tagName === 'P') {
          if (result.length > 0 && !result.endsWith('\n')) {
            result += '\n';
          }
          element.childNodes.forEach(processNode);
        } else {
          element.childNodes.forEach(processNode);
        }
      }
    };

    tempDiv.childNodes.forEach(processNode);
    
    return result.trim();
  }, []);

  // Update editor HTML when value changes externally
  useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current) {
      const html = valueToHtml(value);
      editorRef.current.innerHTML = html;
      lastValueRef.current = value;
    }
  }, [value, valueToHtml]);

  // Initialize editor on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = valueToHtml(value);
    }
  }, []);

  // Get text before cursor for mention detection
  const getTextBeforeCursor = (): { text: string; offset: number } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.startContainer)) return null;

    // Clone range to start of editor
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);

    // Get text content before cursor
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(preCaretRange.cloneContents());
    
    let text = '';
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.classList.contains('mention-chip')) {
          text += `@${element.textContent?.replace('@', '') || ''}`;
        } else if (element.tagName === 'BR') {
          text += '\n';
        } else {
          element.childNodes.forEach(processNode);
        }
      }
    };
    tempDiv.childNodes.forEach(processNode);

    return { text, offset: text.length };
  };

  // Handle input in contenteditable
  const handleInput = () => {
    if (!editorRef.current) return;

    const html = editorRef.current.innerHTML;
    const newValue = htmlToValue(html);
    
    // Check for mention trigger
    const cursorInfo = getTextBeforeCursor();
    if (cursorInfo) {
      const { text } = cursorInfo;
      const lastAtIndex = text.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = text.slice(lastAtIndex + 1);
        // Check if there's no space/newline after @ and it's not too long
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n') && textAfterAt.length < 30) {
          setMentionStartOffset(lastAtIndex);
          setSearchTerm(textAfterAt);
          setShowSuggestions(true);
          setSelectedIndex(0);
        } else {
          setShowSuggestions(false);
          setMentionStartOffset(null);
        }
      } else {
        setShowSuggestions(false);
        setMentionStartOffset(null);
      }
    }

    lastValueRef.current = newValue;
    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);
  };

  // Handle user selection from suggestions using DOM-based insertion
  const selectCandidate = (candidate: MentionCandidate) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.startContainer)) return;

    // Find the @ trigger in current text node and delete it along with search term
    const cursorInfo = getTextBeforeCursor();
    if (!cursorInfo) return;

    const { text: textBeforeCursor } = cursorInfo;
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return;

    const searchLength = textBeforeCursor.length - lastAtIndex; // includes @ + typed chars

    // Delete the "@searchTerm" by moving range back and deleting
    const deleteRange = document.createRange();
    let charsToDelete = searchLength;
    const currentNode = range.startContainer;
    const currentOffset = range.startOffset;

    // Walk backwards to find where @ starts
    const deleteStart = { node: currentNode, offset: currentOffset };
    
    // Simple approach: work within current text node if possible
    if (currentNode.nodeType === Node.TEXT_NODE && currentOffset >= charsToDelete) {
      deleteStart.offset = currentOffset - charsToDelete;
    } else {
      // Fallback: just delete from current position (may not be perfect but safer)
      charsToDelete = Math.min(charsToDelete, currentOffset);
      deleteStart.offset = currentOffset - charsToDelete;
    }

    deleteRange.setStart(deleteStart.node, deleteStart.offset);
    deleteRange.setEnd(range.startContainer, range.startOffset);
    deleteRange.deleteContents();

    // Create mention chip element
    const mentionDisplayName = getEmailPrefix(candidate.email) || candidate.display_name;
    const isExternal = candidate.entity_type === 'partner_contact';
    const mentionType = isExternal ? 'external' : 'internal';
    
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.setAttribute('data-mention-id', candidate.entity_id);
    chip.setAttribute('data-mention-type', mentionType);
    chip.className = `mention-chip ${isExternal ? 'mention-chip-external' : 'mention-chip-internal'}`;
    chip.textContent = `@${mentionDisplayName}`;

    // Insert chip at cursor
    const insertRange = selection.getRangeAt(0);
    insertRange.insertNode(chip);

    // Add space after chip for continued typing
    const spaceNode = document.createTextNode('\u00A0'); // non-breaking space
    chip.after(spaceNode);

    // Move cursor after the space
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Sync internal value
    const newValue = htmlToValue(editorRef.current.innerHTML);
    lastValueRef.current = newValue;
    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);

    setShowSuggestions(false);
    setMentionStartOffset(null);
    setSearchTerm('');

    editorRef.current.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!showSuggestions || candidates.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % candidates.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + candidates.length) % candidates.length);
        break;
      case 'Enter':
        if (showSuggestions) {
          e.preventDefault();
          selectCandidate(candidates[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      case 'Tab':
        if (showSuggestions) {
          e.preventDefault();
          selectCandidate(candidates[selectedIndex]);
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
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const minHeight = rows * 24; // Approximate line height
  // Show external badges when context supports both internal and external users
  const showExternalBadges = context === 'internal+external';

  return (
    <div className="relative">
      <style>{`
        .mention-chip {
          display: inline;
          padding: 1px 4px;
          margin: 0 2px;
          border-radius: 4px;
          font-size: 0.875em;
          font-weight: 500;
          white-space: nowrap;
        }
        .mention-chip-internal {
          background-color: hsl(var(--primary) / 0.12);
          color: hsl(var(--primary));
        }
        .mention-chip-internal:hover {
          background-color: hsl(var(--primary) / 0.2);
        }
        .mention-chip-external {
          background-color: hsl(38 92% 50% / 0.15);
          color: hsl(38 92% 35%);
        }
        .mention-chip-external:hover {
          background-color: hsl(38 92% 50% / 0.25);
        }
        .dark .mention-chip-external {
          color: hsl(38 92% 65%);
        }
        .unified-mention-editor:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        .unified-mention-editor:focus:empty::before {
          content: attr(data-placeholder);
        }
      `}</style>
      
      <div className="relative">
        <div
          ref={editorRef}
          id={id}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
          className={cn(
            "unified-mention-editor block w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm leading-5 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-auto whitespace-pre-wrap",
            showSuggestions && "ring-2 ring-primary/50",
            className
          )}
          style={{ minHeight: `${minHeight}px` }}
          role="textbox"
          aria-required={required}
          aria-multiline="true"
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
          {isLoadingCandidates ? (
            <div className="px-3 py-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : candidates.length > 0 ? (
            <div className="max-h-64 overflow-y-auto py-1">
              {candidates.map((candidate, index) => {
                const isExternal = candidate.entity_type === 'partner_contact';
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => selectCandidate(candidate)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                      "hover:bg-primary/10",
                      index === selectedIndex && "bg-primary/10",
                      isExternal && showExternalBadges && "bg-amber-500/5"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={candidate.photo_url || undefined} />
                        <AvatarFallback className={cn(
                          "text-xs",
                          isExternal && showExternalBadges
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" 
                            : "bg-primary/10 text-primary"
                        )}>
                          {getInitials(candidate.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      {isExternal && showExternalBadges && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center">
                          <Building2 className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{candidate.display_name}</span>
                        {showExternalBadges && (
                          isExternal ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                              Externo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 bg-primary/10 text-primary border-primary/30">
                              Interno
                            </Badge>
                          )
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {isExternal && showExternalBadges
                          ? candidate.partner_company_name 
                          : candidate.team_name || candidate.email
                        }
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CONVENIENCE WRAPPERS
// ============================================================

/**
 * MentionInput pre-configured for internal-only context (OKRs, internal comments).
 * Simplified interface that returns just user IDs.
 */
export interface InternalMentionInputProps extends Omit<MentionInputProps, 'context' | 'partnerCompanyId' | 'onChange'> {
  onChange: (value: string, mentionedUserIds: string[]) => void;
}

export function InternalMentionInput({ onChange, ...props }: InternalMentionInputProps) {
  const handleChange = (value: string, mentions: ParsedMention[]) => {
    const userIds = mentions
      .filter(m => m.userId)
      .map(m => m.userId as string);
    onChange(value, userIds);
  };

  return (
    <MentionInput
      {...props}
      context="internal"
      onChange={handleChange}
    />
  );
}

/**
 * MentionInput pre-configured for ticket context (internal + external).
 */
export interface TicketMentionInputWrapperProps extends Omit<MentionInputProps, 'context'> {
  partnerCompanyId: string | null;
}

export function TicketMentionInputWrapper({ partnerCompanyId, ...props }: TicketMentionInputWrapperProps) {
  return (
    <MentionInput
      {...props}
      context="internal+external"
      partnerCompanyId={partnerCompanyId}
    />
  );
}
