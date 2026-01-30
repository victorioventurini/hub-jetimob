/**
 * Image Optimization Utilities
 * 
 * Uses Supabase Storage Image Transformations to generate optimized thumbnails.
 * https://supabase.com/docs/guides/storage/serving/image-transformations
 */

export type AvatarSize = 'sm' | 'md' | 'lg';

// Avatar size configurations
const AVATAR_SIZES: Record<AvatarSize, number> = {
  sm: 40,   // For dropdowns, lists, mentions (h-5 to h-8)
  md: 80,   // For cards, member lists (h-10 to h-12)
  lg: 192,  // For profile pages (h-24 and above)
};

/**
 * Generates an optimized avatar URL using Supabase Image Transformations.
 * 
 * @param url - Original photo URL from Supabase Storage
 * @param size - Desired avatar size ('sm' | 'md' | 'lg')
 * @returns Optimized URL with transformation parameters, or original URL if not from Supabase
 * 
 * @example
 * // For dropdown/list items
 * getOptimizedAvatarUrl(profile.photo_url, 'sm')
 * 
 * // For profile page
 * getOptimizedAvatarUrl(profile.photo_url, 'lg')
 */
export function getOptimizedAvatarUrl(
  url: string | null | undefined, 
  size: AvatarSize = 'md'
): string | undefined {
  if (!url) return undefined;
  
  // Only transform Supabase Storage URLs
  const isSupabaseStorage = url.includes('/storage/v1/object/public/');
  if (!isSupabaseStorage) return url;
  
  // Get the size in pixels
  const pixels = AVATAR_SIZES[size];
  
  // Transform the URL to use render endpoint with transformations
  // Original: /storage/v1/object/public/bucket/path
  // Transformed: /storage/v1/render/image/public/bucket/path?width=X&height=X&resize=cover
  const transformedUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );
  
  // Add transformation parameters
  const separator = transformedUrl.includes('?') ? '&' : '?';
  return `${transformedUrl}${separator}width=${pixels}&height=${pixels}&resize=cover&quality=80`;
}

/**
 * Preload avatar images for better UX
 * Useful when you know avatars will be displayed soon
 */
export function preloadAvatarImages(urls: (string | null | undefined)[], size: AvatarSize = 'sm'): void {
  urls.forEach(url => {
    const optimizedUrl = getOptimizedAvatarUrl(url, size);
    if (optimizedUrl) {
      const img = new Image();
      img.src = optimizedUrl;
    }
  });
}
