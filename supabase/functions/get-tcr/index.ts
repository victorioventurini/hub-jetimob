import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  TCR_VERSION, 
  TCR_SECTIONS, 
  buildFullTcr 
} from "../_shared/tcr-content.ts";
import { corsHeaders } from "../_shared/middleware.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate API Key
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("TCR_API_KEY");

  if (!expectedKey) {
    console.error("TCR_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    console.warn("Unauthorized TCR access attempt");
    return new Response(
      JSON.stringify({ error: "Unauthorized - Invalid or missing API key" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const section = url.searchParams.get("section");

    console.log(`TCR v${TCR_VERSION} request - Section: ${section || "full"}`);

    let content: string;
    let title: string;

    if (section && TCR_SECTIONS[section]) {
      // Return specific section
      const sectionData = TCR_SECTIONS[section];
      title = sectionData.title;
      content = `# Technical Context Registry (TCR) — Hub da Jet

**Versão:** ${TCR_VERSION}  
**Seção:** ${title}

---

## ${title}
${sectionData.content}

---

_Para o TCR completo, omita o parâmetro \`section\`._
`;
    } else if (section) {
      // Invalid section
      const validSections = Object.keys(TCR_SECTIONS).join(", ");
      return new Response(
        JSON.stringify({
          error: `Invalid section: ${section}`,
          valid_sections: validSections,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Return full TCR
      content = buildFullTcr();
      title = "Full TCR";
    }

    console.log(`Returning TCR: ${title}`);

    return new Response(content, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/markdown; charset=utf-8",
        "X-TCR-Version": TCR_VERSION,
      },
    });
  } catch (error) {
    console.error("Error processing TCR request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
