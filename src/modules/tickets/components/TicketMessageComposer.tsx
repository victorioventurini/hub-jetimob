import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, X, Loader2, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  TicketMentionInput, 
  extractMentionsFromText, 
  type ParsedMention 
} from "@/components/mentions/TicketMentionInput";
import { toast } from "sonner";

interface SelectedFile {
  file: File;
  id: string;
  previewUrl?: string;
}

interface TicketMessageComposerProps {
  onSend: (data: {
    content: string;
    mentions: ParsedMention[];
    files: File[];
  }) => Promise<void>;
  isSubmitting?: boolean;
  partnerCompanyId?: string | null;
  placeholder?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

export function TicketMessageComposer({
  onSend,
  isSubmitting = false,
  partnerCompanyId,
  placeholder = "Digite sua mensagem... Use @ para mencionar",
}: TicketMessageComposerProps) {
  const [content, setContent] = useState("");
  const [mentions, setMentions] = useState<ParsedMention[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContentChange = useCallback((value: string, parsedMentions: ParsedMention[]) => {
    setContent(value);
    setMentions(parsedMentions);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (selectedFiles.length + files.length > MAX_FILES) {
      toast.error(`Máximo de ${MAX_FILES} arquivos permitidos`);
      return;
    }

    const validFiles: SelectedFile[] = [];
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo "${file.name}" excede o limite de 10MB`);
        continue;
      }
      
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Tipo de arquivo não permitido: ${file.name}`);
        continue;
      }

      const selectedFile: SelectedFile = {
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      // Create preview for images
      if (file.type.startsWith("image/")) {
        selectedFile.previewUrl = URL.createObjectURL(file);
      }

      validFiles.push(selectedFile);
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedFiles.length]);

  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const handleSend = async () => {
    if (!content.trim() && selectedFiles.length === 0) return;

    try {
      await onSend({
        content: content.trim(),
        mentions,
        files: selectedFiles.map(sf => sf.file),
      });

      // Clear state after successful send
      setContent("");
      setMentions([]);
      
      // Cleanup previews
      selectedFiles.forEach(sf => {
        if (sf.previewUrl) {
          URL.revokeObjectURL(sf.previewUrl);
        }
      });
      setSelectedFiles([]);
    } catch (error) {
      // Error is handled by the parent
      console.error("Failed to send message:", error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canSend = (content.trim().length > 0 || selectedFiles.length > 0) && !isSubmitting;

  return (
    <div className="space-y-3">
      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((sf) => (
            <div
              key={sf.id}
              className="relative group flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border"
            >
              {sf.previewUrl ? (
                <img
                  src={sf.previewUrl}
                  alt={sf.file.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <FileIcon className="w-6 h-6 text-muted-foreground" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {sf.file.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(sf.file.size)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 absolute -top-2 -right-2 bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(sf.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Composer area */}
      <div className="flex gap-2 items-end">
        {/* File upload button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isSubmitting || selectedFiles.length >= MAX_FILES}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || selectedFiles.length >= MAX_FILES}
            className="shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>

        {/* Mention input */}
        <div className="flex-1">
          <TicketMentionInput
            value={content}
            onChange={handleContentChange}
            partnerCompanyId={partnerCompanyId}
            placeholder={placeholder}
            rows={2}
            className="min-h-[60px]"
          />
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          className="shrink-0"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Use <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">@</kbd> para mencionar • 
        <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] ml-1">⌘+Enter</kbd> para enviar
      </p>
    </div>
  );
}
