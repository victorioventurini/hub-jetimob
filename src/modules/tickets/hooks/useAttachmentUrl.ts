import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to get a signed URL for a ticket attachment.
 * The bucket is private, so we need signed URLs for access.
 * 
 * @param storagePath - The storage path (not full URL)
 * @param enabled - Whether to fetch the URL
 */
export function useAttachmentUrl(storagePath: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tickets.attachmentUrl(storagePath),
    queryFn: async () => {
      if (!storagePath) return null;
      
      // If it's already a full URL (legacy data), return as-is
      if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
        return storagePath;
      }
      
      // Generate signed URL (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from("ticket-attachments")
        .createSignedUrl(storagePath, 3600); // 1 hour
      
      if (error) {
        console.error("Failed to create signed URL:", error);
        throw error;
      }
      
      return data.signedUrl;
    },
    enabled: enabled && !!storagePath,
    staleTime: 30 * 60 * 1000, // 30 minutes (refresh before expiry)
    gcTime: 45 * 60 * 1000, // 45 minutes
  });
}

/**
 * Utility to check if a path needs a signed URL or is already a full URL
 */
export function isStoragePath(fileUrl: string): boolean {
  return !fileUrl.startsWith("http://") && !fileUrl.startsWith("https://");
}

/**
 * Get signed URL synchronously if available, otherwise return original
 * For use in components that don't want to use the hook
 */
export async function getSignedAttachmentUrl(storagePath: string): Promise<string> {
  if (!storagePath) return "";
  
  // If it's already a full URL (legacy data), return as-is
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  
  const { data, error } = await supabase.storage
    .from("ticket-attachments")
    .createSignedUrl(storagePath, 3600);
  
  if (error) {
    console.error("Failed to create signed URL:", error);
    return storagePath; // Fallback to path
  }
  
  return data.signedUrl;
}
