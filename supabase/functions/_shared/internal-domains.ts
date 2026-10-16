/** Domínios de colaboradores internos — login somente via Google. Sincronizar com src/lib/authPolicy.ts. */
export const INTERNAL_EMAIL_DOMAINS = ["jetimob.com", "victorio.com.br", "jetxp.com.br"];

export function isInternalEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1] ?? "";
  return INTERNAL_EMAIL_DOMAINS.includes(domain);
}
