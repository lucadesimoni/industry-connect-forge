-- Create ISA-95 Unified Namespace table
CREATE TABLE public.uns_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('Enterprise', 'Site', 'Area', 'Line', 'Cell')),
  parent_id UUID REFERENCES public.uns_nodes(id) ON DELETE CASCADE,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Asset Administration Shell table
CREATE TABLE public.aas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL UNIQUE,
  id_short TEXT NOT NULL,
  description TEXT NOT NULL,
  manufacturer TEXT,
  serial_number TEXT,
  linked_uns_node_id UUID REFERENCES public.uns_nodes(id) ON DELETE SET NULL,
  linked_rds_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create AAS Submodels table
CREATE TABLE public.aas_submodels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aas_id UUID NOT NULL REFERENCES public.aas(id) ON DELETE CASCADE,
  id_short TEXT NOT NULL,
  semantic_id TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create AAS Properties table
CREATE TABLE public.aas_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submodel_id UUID NOT NULL REFERENCES public.aas_submodels(id) ON DELETE CASCADE,
  id_short TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'date')),
  value JSONB NOT NULL,
  unit TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Reference Designation System table
CREATE TABLE public.rds_designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designation TEXT NOT NULL UNIQUE,
  aspect_code TEXT NOT NULL CHECK (aspect_code IN ('=', '-', '+')),
  object_class TEXT NOT NULL,
  description TEXT NOT NULL,
  linked_uns_node_id UUID REFERENCES public.uns_nodes(id) ON DELETE SET NULL,
  linked_aas_id UUID REFERENCES public.aas(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Entity Links table
CREATE TABLE public.entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('UNS', 'AAS', 'RDS')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('UNS', 'AAS', 'RDS')),
  target_id UUID NOT NULL,
  link_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key constraint for aas.linked_rds_id
ALTER TABLE public.aas ADD CONSTRAINT fk_aas_linked_rds 
  FOREIGN KEY (linked_rds_id) REFERENCES public.rds_designations(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_uns_nodes_parent_id ON public.uns_nodes(parent_id);
CREATE INDEX idx_uns_nodes_level ON public.uns_nodes(level);
CREATE INDEX idx_aas_submodels_aas_id ON public.aas_submodels(aas_id);
CREATE INDEX idx_aas_properties_submodel_id ON public.aas_properties(submodel_id);
CREATE INDEX idx_rds_designations_aspect_code ON public.rds_designations(aspect_code);
CREATE INDEX idx_entity_links_source ON public.entity_links(source_type, source_id);
CREATE INDEX idx_entity_links_target ON public.entity_links(target_type, target_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_uns_nodes_updated_at
  BEFORE UPDATE ON public.uns_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aas_updated_at
  BEFORE UPDATE ON public.aas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rds_designations_updated_at
  BEFORE UPDATE ON public.rds_designations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (but allow all operations for now)
ALTER TABLE public.uns_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aas_submodels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aas_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rds_designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_links ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (public access)
CREATE POLICY "Allow all operations on uns_nodes" ON public.uns_nodes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on aas" ON public.aas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on aas_submodels" ON public.aas_submodels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on aas_properties" ON public.aas_properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on rds_designations" ON public.rds_designations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on entity_links" ON public.entity_links FOR ALL USING (true) WITH CHECK (true);