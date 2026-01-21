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

// BU associations
export {
  usePartnerBuAssociations,
  usePartnersByBu,
  useActivatePartnerInBu,
  useDeactivatePartnerInBu,
  useTogglePartnerBuAssociation,
} from "./usePartnerBuAssociations";
