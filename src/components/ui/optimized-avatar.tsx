import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import { getOptimizedAvatarUrl, type AvatarSize } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";

interface OptimizedAvatarProps {
  src: string | null | undefined;
  alt?: string;
  fallback: string;
  size?: AvatarSize;
  className?: string;
  fallbackClassName?: string;
}

/**
 * OptimizedAvatar - Avatar component with automatic image optimization
 * 
 * Uses Supabase Image Transformations to serve appropriately sized images,
 * reducing bandwidth and improving load times.
 * 
 * @example
 * // Small avatar for dropdowns/lists
 * <OptimizedAvatar 
 *   src={user.photo_url} 
 *   fallback={getInitials(user.display_name)} 
 *   size="sm"
 *   className="h-6 w-6"
 * />
 * 
 * // Large avatar for profile page
 * <OptimizedAvatar 
 *   src={user.photo_url} 
 *   fallback={getInitials(user.display_name)} 
 *   size="lg"
 *   className="h-24 w-24"
 * />
 */
export const OptimizedAvatar = React.forwardRef<
  HTMLDivElement,
  OptimizedAvatarProps
>(({ src, alt, fallback, size = 'md', className, fallbackClassName }, ref) => {
  const optimizedSrc = getOptimizedAvatarUrl(src, size);
  
  return (
    <Avatar ref={ref} className={className}>
      <AvatarImage src={optimizedSrc} alt={alt} />
      <AvatarFallback className={cn("bg-accent/10 text-accent", fallbackClassName)}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
});

OptimizedAvatar.displayName = "OptimizedAvatar";
