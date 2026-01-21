import { InternalRoutingSection } from "./InternalRoutingSection";

/**
 * RoutingRulesTab - Configuração de roteamento de tickets
 * 
 * A seção de roteamento externo foi removida pois a seleção de contatos
 * agora é feita automaticamente baseada nas capacidades dos contatos
 * e nos contatos padrão (fallback) configurados na empresa.
 * 
 * Ver: useAvailableExternalContacts, FallbackContactsEditor
 */
export function RoutingRulesTab() {
  return (
    <div className="space-y-6">
      {/* Internal Routing Section - único roteamento restante */}
      <InternalRoutingSection />
    </div>
  );
}
