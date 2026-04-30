// ============================================================
// GENERIC MESSAGING - RICHTEXT TO PLAIN HELPER
// ============================================================
// Robust extraction of plain text from heterogeneous body_richtext
// payloads stored across modules (tickets, projects, analysis).
//
// Supported shapes:
//  - string (legacy)
//  - { type: "text" | "system", content: string }
//  - Tiptap doc:
//      { type: "doc", content: [
//        { type: "paragraph", content: [{ type: "text", text: "..." }] },
//        { type: "hard_break" } | { type: "hardBreak" },
//        ...
//      ] }
//  - Any nested { content: [...] } / { text: "..." } combo
//
// Returns "" for unrecognized inputs (never throws).
// ============================================================

const BREAK_TYPES = new Set(["hard_break", "hardBreak", "linebreak", "br"]);
const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bullet_list",
  "bulletList",
  "ordered_list",
  "orderedList",
  "list_item",
  "listItem",
  "code_block",
  "codeBlock",
]);

function walk(node: unknown, out: string[]): void {
  if (node == null) return;

  if (typeof node === "string") {
    out.push(node);
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) walk(child, out);
    return;
  }

  if (typeof node !== "object") return;

  const obj = node as Record<string, unknown>;
  const type = typeof obj.type === "string" ? (obj.type as string) : null;

  // Direct text leaf (Tiptap text node)
  if (typeof obj.text === "string") {
    out.push(obj.text);
  }

  // Simple text container ({ type: "text"|"system", content: "..." })
  if (
    type &&
    (type === "text" || type === "system") &&
    typeof obj.content === "string"
  ) {
    out.push(obj.content);
    return;
  }

  // Hard breaks
  if (type && BREAK_TYPES.has(type)) {
    out.push("\n");
    return;
  }

  // Recurse into content (array or object)
  if (obj.content !== undefined) {
    walk(obj.content, out);
  }

  // Block-level: append newline at the end
  if (type && BLOCK_TYPES.has(type)) {
    out.push("\n");
  }
}

/**
 * Extract plain text from any body_richtext value.
 * Never throws; returns "" for unsupported inputs.
 */
export function richtextToPlain(value: unknown): string {
  if (value == null) return "";
  const out: string[] = [];
  walk(value, out);
  // Collapse 3+ newlines into 2; trim outer whitespace.
  return out.join("").replace(/\n{3,}/g, "\n\n").trim();
}
