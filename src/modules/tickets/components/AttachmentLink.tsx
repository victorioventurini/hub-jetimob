import { useState, useEffect } from "react";
import { FileIcon, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSignedAttachmentUrl, isStoragePath } from "../hooks/useAttachmentUrl";
import type { TicketAttachment } from "../types";

interface AttachmentLinkProps {
  attachment: TicketAttachment;
  isOwnMessage?: boolean;
}

export function AttachmentLink({ attachment, isOwnMessage = false }: AttachmentLinkProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const needsSignedUrl = isStoragePath(attachment.file_url);

  useEffect(() => {
    if (!needsSignedUrl) {
      // Legacy full URL - use directly
      setSignedUrl(attachment.file_url);
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setError(false);

    getSignedAttachmentUrl(attachment.file_url)
      .then((url) => {
        if (mounted) {
          setSignedUrl(url);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError(true);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [attachment.file_url, needsSignedUrl]);

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = attachment.mime_type?.startsWith("image/");

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border",
          isOwnMessage
            ? "bg-primary/10 border-primary/20"
            : "bg-muted"
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border",
          "bg-destructive/10 border-destructive/20"
        )}
      >
        <FileIcon className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Erro ao carregar anexo
        </span>
      </div>
    );
  }

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
        isOwnMessage
          ? "bg-primary/10 border-primary/20 hover:bg-primary/20"
          : "bg-muted hover:bg-muted/80"
      )}
    >
      {isImage ? (
        <div className="relative">
          <img
            src={signedUrl}
            alt={attachment.file_name}
            className="w-16 h-16 object-cover rounded"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded flex items-center justify-center">
            <Download className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ) : (
        <>
          <FileIcon className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate max-w-[150px]">
              {attachment.file_name}
            </span>
            {attachment.file_size && (
              <span className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file_size)}
              </span>
            )}
          </div>
          <Download className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </>
      )}
    </a>
  );
}
