/**
 * Partners Module - Hooks Barrel Export
 */

// Global partners management
export {
  useGlobalPartners,
  usePartnerDetail,
  useSearchPartnerByDocument,
  useCreateGlobalPartner,
  useUpdateGlobalPartner,
  useDeleteGlobalPartner,
} from "./useGlobalPartners";

// BU associations (BU-scoped for regular users)
export {
  usePartnerBuAssociations,
  usePartnersByBu,
  useActivatePartnerInBu,
  useDeactivatePartnerInBu,
  useTogglePartnerBuAssociation,
} from "./usePartnerBuAssociations";

// Platform Admin hooks (cross-BU, global client)
export {
  useActivatePartnerInBuGlobal,
  useDeactivatePartnerInBuGlobal,
} from "./usePartnerBuAssociations";
