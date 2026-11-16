-- Preserve legacy writes while accepting the XSD value types used by current AAS templates.
ALTER TABLE public.aas_properties DROP CONSTRAINT aas_properties_value_type_check;
ALTER TABLE public.aas_properties ADD CONSTRAINT aas_properties_value_type_check
CHECK (value_type IN (
  'string', 'number', 'boolean', 'date',
  'xs:string', 'xs:boolean', 'xs:integer', 'xs:int', 'xs:long', 'xs:short', 'xs:byte',
  'xs:double', 'xs:float', 'xs:decimal', 'xs:dateTime', 'xs:date', 'xs:duration',
  'xs:anyURI', 'xs:base64Binary'
));