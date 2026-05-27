/**
 * Technical Context Registry (TCR) — Section Registry
 *
 * Cada seção vive em seu próprio arquivo dentro de `_shared/tcr/`.
 * Esta agregação preserva a ordem oficial do documento.
 *
 * Version: 3.15.1
 * Updated: 2026-03-25
 */

import type { TcrSection } from "./types.ts";
import { architectureSection } from "./architecture.ts";
import { entitiesSection } from "./entities.ts";
import { modulesSection } from "./modules.ts";
import { conventionsSection } from "./conventions.ts";
import { identitySection } from "./identity.ts";
import { agentsSection } from "./agents.ts";
import { permissionsSection } from "./permissions.ts";
import { notificationsSection } from "./notifications.ts";

export type { TcrSection };

export const TCR_VERSION = "3.30.0";
export const TCR_UPDATED_AT = "2026-04-27";

export const TCR_SECTIONS: Record<string, TcrSection> = {
  architecture: architectureSection,
  entities: entitiesSection,
  modules: modulesSection,
  conventions: conventionsSection,
  identity: identitySection,
  agents: agentsSection,
  permissions: permissionsSection,
  notifications: notificationsSection,
};

/**
 * Build the full TCR document from all sections
 */
export function buildFullTcr(): string {
  const header = `# Technical Context Registry (TCR) — Next da Jet

**Versão:** ${TCR_VERSION}  
**Última atualização:** ${TCR_UPDATED_AT}

---

> Este documento é a **fonte única de verdade** para desenvolvimento no Next.
> Sempre consulte-o antes de tomar decisões de arquitetura ou implementação.

---

## Índice

${Object.entries(TCR_SECTIONS).map(([key, section]) => `- [${section.title}](#${key})`).join('\n')}

---

`;

  const sections = Object.entries(TCR_SECTIONS)
    .map(([, section]) => `## ${section.title}\n${section.content}\n---\n`)
    .join('\n');

  const footer = `
## Metadados

| Campo | Valor |
|-------|-------|
| **Versão do TCR** | ${TCR_VERSION} |
| **Data da última atualização** | ${TCR_UPDATED_AT} |
| **Endpoint** | \`GET /functions/v1/get-tcr\` |

---

## Uso com ChatGPT

Para usar este documento como contexto no ChatGPT:

1. Configure um Custom GPT com a action \`getTcr\`
2. Instrua: "Sempre consulte o TCR antes de gerar código"

**Prompt sugerido:**
\`\`\`
Você é um desenvolvedor sênior trabalhando no Next da Jet.
Todas as decisões devem respeitar o TCR (Technical Context Registry) fornecido.
Se houver conflito ou ambiguidade, pergunte antes de prosseguir.
Priorize: segurança, consistência com padrões existentes, simplicidade.
\`\`\`
`;

  return header + sections + footer;
}
