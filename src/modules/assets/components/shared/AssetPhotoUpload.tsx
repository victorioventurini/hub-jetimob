/**
 * AssetPhotoUpload - Componente reutilizável para upload de fotos de assets
 * 
 * Features:
 * - Upload múltiplo (drag & drop)
 * - Preview com thumbnails otimizados
 * - Remoção individual
 * - Validação de tipo e tamanho
 */

import { useState, useRef, useCallback } from "react";
import { X, Upload, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedAssetPhotoUrl } from "@/lib/imageUtils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_MAX_PHOTOS = 5;

interface AssetPhotoUploadProps {
  /** Array de URLs das fotos */
  value: string[];
  /** Callback quando array muda */
  onChange: (urls: string[]) => void;
  /** Máximo de fotos permitidas */
  maxPhotos?: number;
  /** Pasta no bucket (inventory, gifts, keys) */
  folder: "inventory" | "gifts" | "keys";
  /** ID do item (para organização no storage) */
  itemId: string;
  /** Desabilitar upload */
  disabled?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

export function AssetPhotoUpload({
  value = [],
  onChange,
  maxPhotos = DEFAULT_MAX_PHOTOS,
  folder,
  itemId,
  disabled = false,
  className,
}: AssetPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = !disabled && value.length < maxPhotos;

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Formato inválido. Use JPG, PNG ou WebP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Arquivo muito grande. Máximo 5MB.";
    }
    return null;
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${itemId}/${fileName}`;

    const { error } = await supabase.storage
      .from("asset-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("asset-photos")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxPhotos - value.length;
    const filesToUpload = fileArray.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      toast.error(`Limite de ${maxPhotos} fotos atingido`);
      return;
    }

    // Validate all files first
    for (const file of filesToUpload) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
    }

    setIsUploading(true);
    const newUrls: string[] = [];

    for (const file of filesToUpload) {
      const url = await uploadFile(file);
      if (url) {
        newUrls.push(url);
      } else {
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }

    if (newUrls.length > 0) {
      onChange([...value, ...newUrls]);
      toast.success(`${newUrls.length} foto(s) adicionada(s)`);
    }

    setIsUploading(false);
  }, [disabled, maxPhotos, value, onChange, folder, itemId]);

  const handleRemove = useCallback(async (urlToRemove: string) => {
    if (disabled) return;

    // Extract file path from URL
    const match = urlToRemove.match(/asset-photos\/(.+)$/);
    if (match) {
      const filePath = match[1];
      await supabase.storage.from("asset-photos").remove([filePath]);
    }

    onChange(value.filter((url) => url !== urlToRemove));
    toast.success("Foto removida");
  }, [disabled, value, onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [handleFiles]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Photo Grid */}
      <div className="flex flex-wrap gap-2">
        {value.map((url, index) => (
          <div
            key={url}
            className="relative group w-20 h-20 rounded-lg overflow-hidden border bg-muted"
          >
            <img
              src={getOptimizedAssetPhotoUrl(url, "thumbnail")}
              alt={`Foto ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remover foto"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {/* Upload Area */}
        {canUpload && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
              isUploading && "pointer-events-none opacity-50"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1">Adicionar</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground">
        {value.length}/{maxPhotos} fotos • JPG, PNG ou WebP • Máx. 5MB
      </p>
    </div>
  );
}