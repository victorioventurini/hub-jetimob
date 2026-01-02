import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BuLogoUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  description?: string;
  bucketFolder: "logos" | "symbols";
  aspectRatio?: "square" | "wide";
}

export function BuLogoUpload({
  value,
  onChange,
  label,
  description,
  bucketFolder,
  aspectRatio = "square",
}: BuLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG, SVG ou WebP.");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${bucketFolder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("bu-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("bu-assets")
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-colors",
          "hover:border-primary/50 hover:bg-muted/30",
          value ? "border-border" : "border-muted-foreground/30",
          aspectRatio === "square" ? "aspect-square w-32" : "aspect-video w-48"
        )}
      >
        {value ? (
          <>
            <img
              src={value}
              alt={label}
              className="w-full h-full object-contain rounded-lg p-2"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="w-full h-full flex flex-col items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-6 w-6 mb-1" />
                <span className="text-xs">Enviar</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
