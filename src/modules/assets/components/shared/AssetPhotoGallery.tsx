/**
 * AssetPhotoGallery - Componente para visualização de fotos de assets
 * 
 * Features:
 * - Grid responsivo de thumbnails
 * - Lightbox ao clicar (modal fullscreen)
 * - Navegação entre fotos
 * - Keyboard navigation
 */

import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getOptimizedAssetPhotoUrl } from "@/lib/imageUtils";

interface AssetPhotoGalleryProps {
  /** Array de URLs das fotos */
  photos: string[];
  /** Alt text para acessibilidade */
  alt?: string;
  /** Classe CSS adicional */
  className?: string;
}

export function AssetPhotoGallery({
  photos,
  alt = "Foto do item",
  className,
}: AssetPhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleOpen = useCallback((index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  const handleDownload = useCallback(() => {
    const url = photos[currentIndex];
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = `foto-${currentIndex + 1}.jpg`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [photos, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "Escape":
          setLightboxOpen(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, handlePrevious, handleNext]);

  if (photos.length === 0) {
    return null;
  }

  return (
    <>
      {/* Thumbnail Grid */}
      <div className={cn("grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2", className)}>
        {photos.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => handleOpen(index)}
            className="relative aspect-square rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-primary/50 transition-all group"
          >
            <img
              src={getOptimizedAssetPhotoUrl(url, "thumbnail")}
              alt={`${alt} ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-black/95 border-none">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Download button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-16 z-50 text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
          </Button>

          {/* Navigation - Previous */}
          {photos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {/* Navigation - Next */}
          {photos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
              onClick={handleNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Image */}
          <div className="w-full h-full flex items-center justify-center p-8">
            <img
              src={getOptimizedAssetPhotoUrl(photos[currentIndex], "full")}
              alt={`${alt} ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
              {currentIndex + 1} / {photos.length}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}