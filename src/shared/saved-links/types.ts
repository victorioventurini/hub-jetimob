/**
 * Types for Saved Links feature
 */

export interface SavedLink {
  id: string;
  user_id: string;
  bu_id: string;
  module_slug: string;
  label: string;
  path: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSavedLinkInput {
  label: string;
  path: string;
  is_favorite?: boolean;
}

export interface UpdateSavedLinkInput {
  label?: string;
  path?: string;
  is_favorite?: boolean;
}
