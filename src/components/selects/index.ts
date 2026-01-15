// ============================================================
// CANONICAL SELECT COMPONENTS - Hub da Jet
// ============================================================
// Componentes de seleção padronizados para uso em todo o sistema.
// NUNCA reimplemente selects inline - use estes componentes.
// ============================================================

// Teams
export { TeamSelect } from "./TeamSelect";
export { MultiTeamSelect } from "./MultiTeamSelect";

// Users
export { BuUserSelect } from "./BuUserSelect";
export { BuUserMultiSelect } from "./BuUserMultiSelect";
export type { BuUserMultiSelectProps } from "./BuUserMultiSelect";

// Locations
export { BuLocationSelect } from "./BuLocationSelect";

// Status (OKRs)
export { StatusSelect, OKR_STATUS_OPTIONS, RAG_STATUS_OPTIONS } from "./StatusSelect";
export type { StatusOption, OkrStatusValue } from "./StatusSelect";

// Status (Assets)
export { AssetStatusSelect, ASSET_STATUS_OPTIONS } from "./AssetStatusSelect";
export type { AssetInventoryStatus } from "./AssetStatusSelect";

// Assets - Categories, Clavicularies
export { AssetCategorySelect } from "./AssetCategorySelect";
export { ClavicularySelect } from "./ClavicularySelect";

// Status (Tickets)
export { TicketStatusSelect, TICKET_STATUS_OPTIONS } from "./TicketStatusSelect";
export type { TicketStatus } from "./TicketStatusSelect";

// Tickets - Type, Category, Partner
export { TicketTypeSelect, TICKET_TYPE_OPTIONS } from "./TicketTypeSelect";
export type { TicketType } from "./TicketTypeSelect";
export { TicketCategorySelect } from "./TicketCategorySelect";
export { PartnerCompanySelect } from "./PartnerCompanySelect";

// Generic
export { YearSelect } from "./YearSelect";
export { CategorySelect } from "./CategorySelect";
export type { CategoryOption } from "./CategorySelect";
export { SimpleSelect } from "./SimpleSelect";
export type { SelectOption } from "./SimpleSelect";

// OKR Cycles
export { CycleSelect, CycleBadge, CyclePeriodInfo } from "./CycleSelect";
export type { Cycle } from "./CycleSelect";

// Areas
export { AreaSelect } from "./AreaSelect";
