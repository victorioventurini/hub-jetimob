import { useRef, useState } from "react";
import { toast } from "sonner";
import { MAX_FILE_SIZE, MAX_FILES } from "./schema";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";

export function useTicketAttachments() {
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useBuScopedSupabase();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo "${file.name}" excede o limite de 20MB`);
        return false;
      }
      return true;
    });
    const newTotal = attachments.length + validFiles.length;
    if (newTotal > MAX_FILES) {
      toast.error(`Máximo de ${MAX_FILES} arquivos permitidos`);
      const allowed = validFiles.slice(0, MAX_FILES - attachments.length);
      setAttachments((prev) => [...prev, ...allowed]);
    } else {
      setAttachments((prev) => [...prev, ...validFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (
    ticketId: string,
    messageId: string,
    buId: string,
    uploaderProfileId: string,
  ): Promise<void> => {
    if (attachments.length === 0) return;
    for (const file of attachments) {
      const fileExt = file.name.split(".").pop();
      const filePath = `${buId}/${ticketId}/${messageId}/${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("ticket-attachments")
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }
      await supabase.from("ticket_attachments").insert({
        bu_id: buId,
        ticket_id: ticketId,
        message_id: messageId,
        file_url: uploadData.path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by_user_id: uploaderProfileId,
      });
    }
  };

  return { attachments, fileInputRef, handleFileSelect, removeAttachment, uploadAttachments };
}
