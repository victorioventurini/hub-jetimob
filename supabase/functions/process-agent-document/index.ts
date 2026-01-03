import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "documentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status to processing
    await supabase
      .from("ai_agent_documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    // Get document info
    const { data: doc, error: docError } = await supabase
      .from("ai_agent_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      console.error("Document not found:", docError);
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing document:", doc.name, "Type:", doc.file_type);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("agent-documents")
      .download(doc.file_url);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      await supabase
        .from("ai_agent_documents")
        .update({ 
          status: "error", 
          processing_error: "Erro ao baixar arquivo do storage" 
        })
        .eq("id", documentId);
      
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let extractedContent = "";

    try {
      const fileType = doc.file_type.toLowerCase();

      if (fileType === "txt" || fileType === "md") {
        // Plain text files
        extractedContent = await fileData.text();
      } else if (fileType === "pdf") {
        // For PDF, we'll extract basic text
        // Note: Full PDF parsing requires additional libraries
        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // Simple PDF text extraction (basic approach)
        // This extracts visible text strings from PDF
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const pdfText = decoder.decode(bytes);
        
        // Extract text between stream/endstream or BT/ET markers
        const textParts: string[] = [];
        
        // Try to find text in PDF streams
        const streamMatches = pdfText.matchAll(/stream\s*([\s\S]*?)endstream/gi);
        for (const match of streamMatches) {
          const content = match[1];
          // Look for text strings (Tj, TJ operators)
          const textMatches = content.matchAll(/\((.*?)\)\s*Tj/gi);
          for (const textMatch of textMatches) {
            textParts.push(textMatch[1]);
          }
        }
        
        // Also try direct text extraction for simple PDFs
        const directTextMatches = pdfText.matchAll(/\(((?:[^()\\]|\\[()\\])*)\)/g);
        for (const match of directTextMatches) {
          const text = match[1]
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "")
            .replace(/\\t/g, " ")
            .replace(/\\\(/g, "(")
            .replace(/\\\)/g, ")")
            .replace(/\\\\/g, "\\");
          
          if (text.length > 3 && /[a-zA-ZÀ-ÿ]/.test(text)) {
            textParts.push(text);
          }
        }
        
        extractedContent = textParts.join(" ").replace(/\s+/g, " ").trim();
        
        if (!extractedContent || extractedContent.length < 50) {
          // If extraction failed, mark for manual review
          extractedContent = `[PDF com extração limitada - ${doc.name}]\n\nO conteúdo deste PDF requer processamento avançado. Considere converter para TXT para melhor extração.`;
        }
      } else if (fileType === "docx" || fileType === "doc") {
        // For DOCX, extract from XML
        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const content = decoder.decode(bytes);
        
        // Try to extract text from DOCX XML
        const textMatches = content.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/gi);
        const textParts: string[] = [];
        for (const match of textMatches) {
          textParts.push(match[1]);
        }
        
        extractedContent = textParts.join(" ").replace(/\s+/g, " ").trim();
        
        if (!extractedContent || extractedContent.length < 20) {
          extractedContent = `[Documento Word - ${doc.name}]\n\nExtração automática limitada. Considere converter para TXT.`;
        }
      } else {
        extractedContent = `[Formato não suportado: ${fileType}]`;
      }
    } catch (extractError) {
      console.error("Extraction error:", extractError);
      extractedContent = `[Erro na extração do documento: ${doc.name}]`;
    }

    // Update document with extracted content
    const { error: updateError } = await supabase
      .from("ai_agent_documents")
      .update({
        status: extractedContent.startsWith("[") ? "error" : "ready",
        extracted_content: extractedContent.substring(0, 500000), // Limit to ~500KB
        processing_error: extractedContent.startsWith("[Erro") ? "Falha na extração de texto" : null,
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update document" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Document processed successfully:", doc.name, "Content length:", extractedContent.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        documentId,
        contentLength: extractedContent.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
