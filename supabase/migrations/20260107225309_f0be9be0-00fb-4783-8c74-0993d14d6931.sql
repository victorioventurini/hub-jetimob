-- Add parent_location_id column to bu_locations for hierarchical structure
ALTER TABLE bu_locations 
ADD COLUMN parent_location_id UUID REFERENCES bu_locations(id);

-- Index for performance on hierarchical queries
CREATE INDEX idx_bu_locations_parent ON bu_locations(parent_location_id);

-- Documentation comment
COMMENT ON COLUMN bu_locations.parent_location_id IS 
  'Reference to parent location. NULL = root location (headquarters). With value = sub-location (room, cabinet, etc)';