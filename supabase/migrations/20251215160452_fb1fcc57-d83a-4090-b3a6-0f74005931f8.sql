-- Add Type/Instance AAS support (IEC 63278 compliant)
-- Type AAS: Template/class for asset types
-- Instance AAS: Specific physical assets that inherit from Type AAS

-- Add columns to distinguish Type vs Instance AAS
ALTER TABLE public.aas 
ADD COLUMN is_type BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN type_aas_id UUID REFERENCES public.aas(id) ON DELETE SET NULL;

-- Add index for efficient querying
CREATE INDEX idx_aas_is_type ON public.aas(is_type);
CREATE INDEX idx_aas_type_aas_id ON public.aas(type_aas_id);

-- Add constraint: Type AAS cannot reference another Type AAS
ALTER TABLE public.aas
ADD CONSTRAINT chk_type_aas_reference 
CHECK (is_type = false OR type_aas_id IS NULL);