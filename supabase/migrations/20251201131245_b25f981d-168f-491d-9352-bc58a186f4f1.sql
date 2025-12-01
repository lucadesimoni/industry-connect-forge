-- Add support for RDS instances (function/product aspects at specific locations)
-- This allows multiple instances of the same functional aspect at different locations

-- Add new columns to support instances
ALTER TABLE rds_designations
  ADD COLUMN is_instance boolean DEFAULT false NOT NULL,
  ADD COLUMN parent_definition_id uuid REFERENCES rds_designations(id) ON DELETE SET NULL,
  ADD COLUMN function_aspect text,
  ADD COLUMN product_aspect text,
  ADD COLUMN location_aspect text;

-- Add index for better query performance on instances
CREATE INDEX idx_rds_parent_definition ON rds_designations(parent_definition_id) WHERE parent_definition_id IS NOT NULL;
CREATE INDEX idx_rds_instances ON rds_designations(is_instance) WHERE is_instance = true;

-- Migrate existing data
-- 1. Location aspects remain as-is
UPDATE rds_designations
SET location_aspect = object_class,
    is_instance = false
WHERE aspect_code = '+';

-- 2. Function and product aspects linked to locations are instances
-- Extract aspect code and mark as instance
UPDATE rds_designations
SET is_instance = true,
    function_aspect = CASE WHEN aspect_code = '=' THEN object_class END,
    product_aspect = CASE WHEN aspect_code = '-' THEN object_class END
WHERE (aspect_code = '=' OR aspect_code = '-') 
  AND linked_uns_node_id IS NOT NULL;

-- 3. Function and product aspects without location links are abstract definitions
UPDATE rds_designations
SET is_instance = false,
    function_aspect = CASE WHEN aspect_code = '=' THEN object_class END,
    product_aspect = CASE WHEN aspect_code = '-' THEN object_class END
WHERE (aspect_code = '=' OR aspect_code = '-') 
  AND linked_uns_node_id IS NULL;

-- Add comment explaining the new structure
COMMENT ON COLUMN rds_designations.is_instance IS 'True if this is a physical instance of a function/product at a specific location. False for abstract definitions and location aspects.';
COMMENT ON COLUMN rds_designations.parent_definition_id IS 'Links an instance to its abstract definition (e.g., =F1+Location instance links to abstract =F1 definition)';
COMMENT ON COLUMN rds_designations.function_aspect IS 'Function aspect code (for = aspects), e.g., F1 for fuel system';
COMMENT ON COLUMN rds_designations.product_aspect IS 'Product aspect code (for - aspects), e.g., BRKT1 for bracket';
COMMENT ON COLUMN rds_designations.location_aspect IS 'Location aspect code (for + aspects), e.g., PIL.STANS.HALL3';