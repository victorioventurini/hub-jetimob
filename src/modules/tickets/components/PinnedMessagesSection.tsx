/**
 * PinnedMessagesSection - Seção de mensagens fixadas no topo do ticket
 * 
 * Exibe mensagens fixadas com destaque visual, permitindo desafixar
 * se o usuário tiver permissão.
 */

import { Pin, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseMentionsForDisplay } from "@/components/mentions";
import type { TicketMessage } from "../types";

interface PinnedMessagesSectionProps {
  messages: TicketMessage[];
  canPin: boolean;
  onUnpin: (messageId: string) => void;
  isUnpinning?: boolean;
}

export function PinnedMessagesSection({
  messages,
  canPin,
  onUnpin,
  isUnpinning = false,
}: PinnedMessagesSectionProps) {
  const pinnedMessages = messages.filter((m) => m.is_pinned);

  if (pinnedMessages.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Pin className="h-4 w-4" />
          <span>Mensagens fixadas ({pinnedMessages.length})</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Somente o responsável e o criador podem fixar mensagens
        </span>
      </div>
      <div className="space-y-2">
        {pinnedMessages.map((message) => (
          <PinnedMessageCard
            key={message.id}
            message={message}
            canUnpin={canPin}
            onUnpin={() => onUnpin(message.id)}
            isUnpinning={isUnpinning}
          />
        ))}
      </div>
    </div>
  );
}

interface PinnedMessageCardProps {
  message: TicketMessage;
  canUnpin: boolean;
  onUnpin: () => void;
  isUnpinning?: boolean;
}

function PinnedMessageCard({
  message,
  canUnpin,
  onUnpin,
  isUnpinning = false,
}: PinnedMessageCardProps) {
  // Extract author info
  const authorName = message.author_user?.display_name || message.author_contact?.name || "Usuário";
  const authorInitials = authorName.slice(0, 2).toUpperCase();
  const authorPhoto = message.author_user?.photo_url;
  const isExternalAuthor = message.author_type === "partner_contact";

  // Parse message content
  const content = typeof message.body_richtext === "string"
    ? message.body_richtext
    : (message.body_richtext as any)?.content || "";
  const parsedContent = parseMentionsForDisplay(content);

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border",
      "bg-warning-muted border-warning/30"
    )}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        {authorPhoto && <AvatarImage src={authorPhoto} alt={authorName} />}
        <AvatarFallback className={cn(
          "text-xs",
          isExternalAuthor ? "bg-muted" : ""
        )}>
          {authorInitials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{authorName}</span>
          {isExternalAuthor && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              Externo
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        <p className="text-sm text-foreground/90 line-clamp-2">{parsedContent}</p>
        {message.pinned_by && (
          <p className="text-xs text-muted-foreground mt-1">
            Fixada por {message.pinned_by.display_name}
          </p>
        )}
      </div>

      {/* Unpin button */}
      {canUnpin && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={onUnpin}
          disabled={isUnpinning}
          title="Desafixar mensagem"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
