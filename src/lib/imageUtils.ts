/**
 * Image Optimization Utilities
 * 
 * Uses Supabase Storage Image Transformations to generate optimized thumbnails.
 * https://supabase.com/docs/guides/storage/serving/image-transformations
 */

// =============================================
// AVATAR SIZES
// =============================================

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

// =============================================
// ASSET PHOTO SIZES
// =============================================

export type AssetPhotoSize = 'thumbnail' | 'preview' | 'full';

const ASSET_PHOTO_SIZES: Record<AssetPhotoSize, { width: number; height: number }> = {
  thumbnail: { width: 100, height: 100 },   // Para listagens e cards
  preview: { width: 400, height: 400 },     // Para modal de preview
  full: { width: 1200, height: 1200 },      // Para download/visualização completa
};

/**
 * Generates an optimized asset photo URL using Supabase Image Transformations.
 * 
 * @param url - Original photo URL from Supabase Storage
 * @param size - Desired size ('thumbnail' | 'preview' | 'full')
 * @returns Optimized URL with transformation parameters, or original URL if not from Supabase
 * 
 * @example
 * // For grid thumbnails
 * getOptimizedAssetPhotoUrl(photoUrl, 'thumbnail')
 * 
 * // For lightbox preview
 * getOptimizedAssetPhotoUrl(photoUrl, 'preview')
 */
export function getOptimizedAssetPhotoUrl(
  url: string | null | undefined,
  size: AssetPhotoSize = 'preview'
): string | undefined {
  if (!url) return undefined;
  
  // Only transform Supabase Storage URLs
  const isSupabaseStorage = url.includes('/storage/v1/object/public/');
  if (!isSupabaseStorage) return url;
  
  const { width, height } = ASSET_PHOTO_SIZES[size];
  
  // Transform the URL to use render endpoint with transformations
  const transformedUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );
  
  // Add transformation parameters (contain to preserve aspect ratio)
  const separator = transformedUrl.includes('?') ? '&' : '?';
  return `${transformedUrl}${separator}width=${width}&height=${height}&resize=contain&quality=80`;
}

/**
 * Preload asset photo images for better UX
 */
export function preloadAssetPhotos(urls: (string | null | undefined)[], size: AssetPhotoSize = 'thumbnail'): void {
  urls.forEach(url => {
    const optimizedUrl = getOptimizedAssetPhotoUrl(url, size);
    if (optimizedUrl) {
      const img = new Image();
      img.src = optimizedUrl;
    }
  });
}
