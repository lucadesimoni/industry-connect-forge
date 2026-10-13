/**
 * IDTA Standard Submodel Templates per IEC 63278 / IDTA specifications.
 * These templates provide pre-configured submodel structures for common use cases.
 */

import { AASProperty, AASValueType } from '@/types/industrial';
import { StructureMap, structureProperty } from './aasElements';

export interface SubmodelTemplate {
  idShort: string;
  semanticId: string;
  description: string;
  standard: string;
  /**
   * Flat properties (dotted idShort paths for nested elements). For IDTA
   * templates this includes the hidden structure-map property that restores
   * collections, lists, MultiLanguageProperties and Files on export.
   */
  properties: Array<Omit<AASProperty, 'id'> & { id?: string }>;
}

/**
 * Map legacy valueType strings to XSD-compliant types.
 */
export const normalizeLegacyValueType = (vt: string): AASValueType => {
  switch (vt) {
    case 'string': return 'xs:string';
    case 'number': return 'xs:double';
    case 'boolean': return 'xs:boolean';
    case 'date': return 'xs:dateTime';
    default: return vt as AASValueType;
  }
};

/**
 * Human-readable labels for XSD value types.
 */
export const VALUE_TYPE_OPTIONS: { value: AASValueType; label: string; group: string }[] = [
  // Text
  { value: 'xs:string', label: 'String', group: 'Text' },
  { value: 'xs:anyURI', label: 'URI / IRI', group: 'Text' },
  { value: 'xs:base64Binary', label: 'Base64 Binary', group: 'Text' },
  // Numeric
  { value: 'xs:double', label: 'Double (64-bit)', group: 'Numeric' },
  { value: 'xs:float', label: 'Float (32-bit)', group: 'Numeric' },
  { value: 'xs:decimal', label: 'Decimal', group: 'Numeric' },
  { value: 'xs:integer', label: 'Integer', group: 'Numeric' },
  { value: 'xs:int', label: 'Int (32-bit)', group: 'Numeric' },
  { value: 'xs:long', label: 'Long (64-bit)', group: 'Numeric' },
  { value: 'xs:short', label: 'Short (16-bit)', group: 'Numeric' },
  { value: 'xs:byte', label: 'Byte (8-bit)', group: 'Numeric' },
  // Boolean
  { value: 'xs:boolean', label: 'Boolean', group: 'Boolean' },
  // Date/Time
  { value: 'xs:dateTime', label: 'DateTime (ISO 8601)', group: 'Date/Time' },
  { value: 'xs:date', label: 'Date', group: 'Date/Time' },
  { value: 'xs:duration', label: 'Duration', group: 'Date/Time' },
];

/**
 * Check if a valueType is numeric for input handling.
 */
export const isNumericType = (vt: AASValueType): boolean =>
  ['xs:double', 'xs:float', 'xs:decimal', 'xs:integer', 'xs:int', 'xs:long', 'xs:short', 'xs:byte', 'number'].includes(vt);

export const isBooleanType = (vt: AASValueType): boolean =>
  ['xs:boolean', 'boolean'].includes(vt);

export const isDateType = (vt: AASValueType): boolean =>
  ['xs:dateTime', 'xs:date', 'date'].includes(vt);

/**
 * Semantic IDs for submodels that have no published IDTA template.
 * They live in a project namespace instead of admin-shell.io, which is
 * reserved for IDTA-published semantics.
 */
export const CUSTOM_SEMANTIC_IDS = {
  OperationalData: 'urn:industry-connect-forge:submodel:OperationalData:1:0',
  Maintenance: 'urn:industry-connect-forge:submodel:Maintenance:1:0',
} as const;

/**
 * Helper to declare a template from element paths.
 * Containers and non-Property leaves are recorded in the structure map, so the
 * AAS v3 export reproduces the official element types and semanticIds.
 * Paths below a SubmodelElementList use a placeholder segment (e.g. `Document01`);
 * that segment is dropped on export because list items have no idShort (AASd-120).
 */
type TemplateContainer = {
  path: string;
  modelType: 'SubmodelElementCollection' | 'SubmodelElementList';
  semanticId?: string;
  typeValueListElement?: string;
  valueTypeListElement?: AASValueType;
};

type TemplateLeaf = {
  path: string;
  semanticId?: string;
  description: string;
  valueType?: AASValueType;
  modelType?: 'Property' | 'MultiLanguageProperty' | 'File';
  contentType?: string;
  unit?: string;
  value?: AASProperty['value'];
};

const globalRef = (value: string) => ({ type: 'ExternalReference', keys: [{ type: 'GlobalReference', value }] });

function defineTemplate(def: {
  idShort: string;
  semanticId: string;
  description: string;
  standard: string;
  containers?: TemplateContainer[];
  leaves: TemplateLeaf[];
}): SubmodelTemplate {
  const structure: StructureMap = {};
  for (const c of def.containers ?? []) {
    const extra: Record<string, unknown> = {};
    if (c.semanticId) extra.semanticId = globalRef(c.semanticId);
    if (c.typeValueListElement) extra.typeValueListElement = c.typeValueListElement;
    if (c.valueTypeListElement) extra.valueTypeListElement = c.valueTypeListElement;
    structure[c.path] = { modelType: c.modelType, extra };
  }
  for (const l of def.leaves) {
    if (l.modelType === 'MultiLanguageProperty') structure[l.path] = { modelType: 'MultiLanguageProperty' };
    if (l.modelType === 'File') {
      structure[l.path] = { modelType: 'File', extra: { contentType: l.contentType ?? 'application/octet-stream' } };
    }
  }
  const properties: SubmodelTemplate['properties'] = def.leaves.map((l) => ({
    idShort: l.path,
    valueType: l.valueType ?? 'xs:string',
    value: l.value ?? '',
    unit: l.unit,
    description: l.description,
    semanticId: l.semanticId,
  }));
  const structProp = structureProperty(structure);
  return {
    idShort: def.idShort,
    semanticId: def.semanticId,
    description: def.description,
    standard: def.standard,
    properties: structProp ? [...properties, structProp as SubmodelTemplate['properties'][number]] : properties,
  };
}

const MLP = 'MultiLanguageProperty' as const;

/**
 * IDTA 02006-3-0-2: Digital Nameplate for Industrial Equipment (v3.0).
 * Mandatory elements plus the common optional identification fields.
 * Source: admin-shell-io/submodel-templates, published/Digital nameplate/3/0/2.
 */
const NAMEPLATE_TEMPLATE = defineTemplate({
  idShort: 'Nameplate',
  semanticId: 'https://admin-shell.io/idta/nameplate/3/0/Nameplate',
  description: 'Digital Nameplate per IDTA 02006-3-0. Manufacturer information and product identification.',
  standard: 'IDTA 02006-3-0',
  containers: [
    // mandatory; its content is defined by IDTA 02002 (Contact Information)
    { path: 'AddressInformation', modelType: 'SubmodelElementCollection', semanticId: 'https://admin-shell.io/zvei/nameplate/1/0/ContactInformations/AddressInformation' },
  ],
  leaves: [
    { path: 'URIOfTheProduct', valueType: 'xs:anyURI', semanticId: '0112/2///61987#ABN590#002', description: 'Unique global identification of the product (URI)' },
    { path: 'ManufacturerName', modelType: MLP, semanticId: '0112/2///61987#ABA565#009', description: 'Legally valid designation of the manufacturer' },
    { path: 'ManufacturerProductDesignation', modelType: MLP, semanticId: '0112/2///61987#ABA567#009', description: 'Short description of the product' },
    { path: 'ManufacturerProductFamily', modelType: MLP, semanticId: '0112/2///61987#ABP464#002', description: '2nd level of the product hierarchy' },
    { path: 'ManufacturerProductType', semanticId: '0112/2///61987#ABA300#008', description: 'Characteristic of the product type' },
    { path: 'OrderCodeOfManufacturer', semanticId: '0112/2///61987#ABA950#008', description: 'Order code of the manufacturer' },
    { path: 'ProductArticleNumberOfManufacturer', semanticId: '0112/2///61987#ABA581#007', description: 'Article number of the manufacturer' },
    { path: 'SerialNumber', semanticId: '0112/2///61987#ABA951#009', description: 'Unique serial number assigned by the manufacturer' },
    { path: 'YearOfConstruction', semanticId: '0112/2///61987#ABP000#002', description: 'Year of construction (YYYY)' },
    { path: 'DateOfManufacture', valueType: 'xs:date', semanticId: '0112/2///61987#ABB757#007', description: 'Date of manufacture' },
    { path: 'HardwareVersion', semanticId: '0112/2///61987#ABA926#008', description: 'Hardware version' },
    { path: 'FirmwareVersion', semanticId: '0112/2///61987#ABA302#006', description: 'Firmware version' },
    { path: 'SoftwareVersion', semanticId: '0112/2///61987#ABA601#008', description: 'Software version' },
    { path: 'CountryOfOrigin', semanticId: '0112/2///61987#ABP462#001', description: 'Country of origin (ISO 3166-1 alpha-2)' },
  ],
});

/**
 * IDTA 02003-2-0-2: Technical Data (v2.0).
 * Technical properties live in TechnicalPropertyAreas (arbitrary elements per the template).
 */
const TECHNICAL_DATA_TEMPLATE = defineTemplate({
  idShort: 'TechnicalData',
  semanticId: '0173-1#01-AHX837#002',
  description: 'Technical Data per IDTA 02003-2-0. General information plus technical property areas.',
  standard: 'IDTA 02003-2-0',
  containers: [
    { path: 'GeneralInformation', modelType: 'SubmodelElementCollection', semanticId: '0173-1#02-ABK161#002/0173-1#01-AHX838#002' },
    { path: 'TechnicalPropertyAreas', modelType: 'SubmodelElementList', semanticId: '0173-1#02-ABK163#002', typeValueListElement: 'SubmodelElementCollection' },
    { path: 'TechnicalPropertyAreas.Area01', modelType: 'SubmodelElementCollection', semanticId: '0173-1#02-ABL358#002/0173-1#01-AHX773#002' },
  ],
  leaves: [
    { path: 'GeneralInformation.ManufacturerName', semanticId: '0173-1#02-AAO677#004', description: 'Legally valid designation of the manufacturer' },
    { path: 'GeneralInformation.ManufacturerProductDesignation', modelType: MLP, semanticId: '0173-1#02-AAW338#003', description: 'Short description of the product' },
    { path: 'GeneralInformation.ManufacturerArticleNumber', semanticId: '0173-1#02-AAO676#005', description: 'Article number of the manufacturer' },
    { path: 'GeneralInformation.ManufacturerOrderCode', semanticId: '0173-1#02-AAO227#004', description: 'Order code of the manufacturer' },
    // arbitrary technical properties (template allows any element here; add ECLASS semanticIds per property)
    { path: 'TechnicalPropertyAreas.Area01.MaxRotationalSpeed', valueType: 'xs:double', unit: '1/min', description: 'Maximum rotational speed' },
    { path: 'TechnicalPropertyAreas.Area01.NominalVoltage', valueType: 'xs:double', unit: 'V', description: 'Nominal voltage' },
    { path: 'TechnicalPropertyAreas.Area01.NominalPower', valueType: 'xs:double', unit: 'W', description: 'Nominal power consumption' },
    { path: 'TechnicalPropertyAreas.Area01.Weight', valueType: 'xs:double', unit: 'kg', description: 'Weight of the asset' },
    { path: 'TechnicalPropertyAreas.Area01.IPRating', description: 'Ingress Protection rating (e.g. IP65)' },
  ],
});

/**
 * IDTA 02004-2-0-2: Handover Documentation (v2.0, VDI 2770).
 * One document with one id, classification, version and file (all mandatory parts).
 */
const D = 'Documents.Document01';
const V = `${D}.DocumentVersions.Version01`;
const DOCUMENTATION_TEMPLATE = defineTemplate({
  idShort: 'HandoverDocumentation',
  semanticId: '0173-1#01-AHF578#003',
  description: 'Handover Documentation per IDTA 02004-2-0 (VDI 2770). Documents with ids, classification, versions and files.',
  standard: 'IDTA 02004-2-0',
  containers: [
    { path: 'Documents', modelType: 'SubmodelElementList', semanticId: '0173-1#02-ABI500#003', typeValueListElement: 'SubmodelElementCollection' },
    { path: D, modelType: 'SubmodelElementCollection', semanticId: '0173-1#02-ABI500#003/0173-1#01-AHF579#003' },
    { path: `${D}.DocumentIds`, modelType: 'SubmodelElementList', semanticId: '0173-1#02-ABI501#003', typeValueListElement: 'SubmodelElementCollection' },
    { path: `${D}.DocumentIds.Id01`, modelType: 'SubmodelElementCollection', semanticId: '0173-1#02-ABI501#003/0173-1#01-AHF580#003' },
    { path: `${D}.DocumentClassifications`, modelType: 'SubmodelElementList', semanticId: '0173-1#02-ABI502#003', typeValueListElement: 'SubmodelElementCollection' },
    { path: `${D}.DocumentClassifications.Class01`, modelType: 'SubmodelElementCollection', semanticId: '0173-1#02-ABI502#003/0173-1#01-AHF581#003' },
    { path: `${D}.DocumentVersions`, modelType: 'SubmodelElementList', semanticId: '0173-1#02-ABI503#003', typeValueListElement: 'SubmodelElementCollection' },
    { path: V, modelType: 'SubmodelElementCollection', semanticId: '0173-1#02-ABI503#003/0173-1#01-AHF582#003' },
    { path: `${V}.Language`, modelType: 'SubmodelElementList', semanticId: '0173-1#02-AAN468#008', typeValueListElement: 'Property', valueTypeListElement: 'xs:string' },
    { path: `${V}.DigitalFiles`, modelType: 'SubmodelElementList', semanticId: '0173-1#02-ABK126#002', typeValueListElement: 'File' },
  ],
  leaves: [
    { path: `${D}.DocumentIds.Id01.DocumentDomainId`, semanticId: '0173-1#02-ABH994#003', description: 'Domain in which the document id is unique' },
    { path: `${D}.DocumentIds.Id01.DocumentIdentifier`, semanticId: '0173-1#02-AAO099#004', description: 'Document identifier within the domain' },
    { path: `${D}.DocumentIds.Id01.DocumentIsPrimary`, valueType: 'xs:boolean', semanticId: '0173-1#02-ABH995#003', description: 'Primary document id' },
    { path: `${D}.DocumentClassifications.Class01.ClassId`, semanticId: '0173-1#02-ABH996#003', description: 'Class id (e.g. VDI 2770 "03-01")' },
    { path: `${D}.DocumentClassifications.Class01.ClassName`, modelType: MLP, semanticId: '0173-1#02-ABJ219#002', description: 'Class name' },
    { path: `${D}.DocumentClassifications.Class01.ClassificationSystem`, semanticId: '0173-1#02-ABH997#003', description: 'Classification system (e.g. VDI2770:2020)' },
    { path: `${V}.Language.Lang01`, semanticId: '0173-1#02-AAN468#008', description: 'Language (ISO 639-1, e.g. en)' },
    { path: `${V}.Version`, semanticId: '0173-1#02-AAP003#005', description: 'Document version' },
    { path: `${V}.Title`, modelType: MLP, semanticId: '0173-1#02-ABG940#003', description: 'Document title' },
    { path: `${V}.Description`, modelType: MLP, semanticId: '0173-1#02-AAN466#004', description: 'Document description' },
    { path: `${V}.StatusSetDate`, valueType: 'xs:date', semanticId: '0173-1#02-ABI000#003', description: 'Date of the status' },
    { path: `${V}.StatusValue`, semanticId: '0173-1#02-ABI001#003', description: 'Status (e.g. Released, InReview)' },
    { path: `${V}.OrganizationShortName`, semanticId: 'https://api.eclass-cdp.com/0173-1-02-ABI002-003', description: 'Short name of the issuing organization' },
    { path: `${V}.OrganizationOfficialName`, semanticId: '0173-1#02-ABI004#003', description: 'Official name of the issuing organization' },
    { path: `${V}.DigitalFiles.File01`, modelType: 'File', contentType: 'application/pdf', semanticId: '0173-1#02-ABK126#002', description: 'Document file (path or URL)' },
  ],
});

/**
 * Operational Data (common pattern for real-time metrics)
 */
const OPERATIONAL_DATA_TEMPLATE: SubmodelTemplate = {
  idShort: 'OperationalData',
  semanticId: CUSTOM_SEMANTIC_IDS.OperationalData,
  description: 'Operational / runtime data. Maps to Sparkplug B DDATA metrics for live telemetry.',
  standard: 'Custom (not an IDTA template)',
  properties: [
    { idShort: 'OperatingHours', valueType: 'xs:double', value: '', unit: 'h', description: 'Total operating hours' },
    { idShort: 'CurrentTemperature', valueType: 'xs:double', value: '', unit: '°C', description: 'Current operating temperature' },
    { idShort: 'CurrentState', valueType: 'xs:string', value: 'idle', description: 'Current operational state (idle, running, error, maintenance)' },
    { idShort: 'CycleCount', valueType: 'xs:long', value: '', description: 'Number of completed production cycles' },
  ],
};

/**
 * Maintenance (common for predictive maintenance)
 */
const MAINTENANCE_TEMPLATE: SubmodelTemplate = {
  idShort: 'Maintenance',
  semanticId: CUSTOM_SEMANTIC_IDS.Maintenance,
  description: 'Maintenance information. Tracks service intervals, last maintenance, and upcoming schedules.',
  standard: 'Custom (not an IDTA template)',
  properties: [
    { idShort: 'LastMaintenanceDate', valueType: 'xs:dateTime', value: '', description: 'Date of last maintenance' },
    { idShort: 'NextMaintenanceDue', valueType: 'xs:dateTime', value: '', description: 'Scheduled next maintenance' },
    { idShort: 'MaintenanceIntervalHours', valueType: 'xs:double', value: '', unit: 'h', description: 'Maintenance interval in operating hours' },
    { idShort: 'MaintenanceStatus', valueType: 'xs:string', value: 'ok', description: 'Current maintenance status (ok, due, overdue)' },
  ],
};

/**
 * IDTA 02002-1-0-2: Contact Information.
 * Source: admin-shell-io/submodel-templates, published/Contact Information/1/0/2.
 */
const CI = 'ContactInformation';
const CONTACT_INFORMATION_TEMPLATE = defineTemplate({
  idShort: 'ContactInformations',
  semanticId: 'https://admin-shell.io/zvei/nameplate/1/0/ContactInformations',
  description: 'Contact Information per IDTA 02002-1-0. Manufacturer or operator contact details.',
  standard: 'IDTA 02002-1-0',
  containers: [
    { path: CI, modelType: 'SubmodelElementCollection', semanticId: 'https://admin-shell.io/zvei/nameplate/1/0/ContactInformations/ContactInformation' },
    { path: `${CI}.Phone`, modelType: 'SubmodelElementCollection', semanticId: 'https://admin-shell.io/zvei/nameplate/1/0/ContactInformations/ContactInformation/Phone' },
    { path: `${CI}.Email`, modelType: 'SubmodelElementCollection', semanticId: '0173-1#02-AAQ836#005' },
  ],
  leaves: [
    { path: `${CI}.RoleOfContactPerson`, semanticId: '0173-1#02-AAO204#003', description: 'Role of the contact person (e.g. sales, support)' },
    { path: `${CI}.Company`, modelType: MLP, semanticId: '0173-1#02-AAW001#001', description: 'Name of the company' },
    { path: `${CI}.Department`, modelType: MLP, semanticId: '0173-1#02-AAO127#003', description: 'Department or division within the company' },
    { path: `${CI}.Street`, modelType: MLP, semanticId: '0173-1#02-AAO128#002', description: 'Street name and number' },
    { path: `${CI}.Zipcode`, modelType: MLP, semanticId: '0173-1#02-AAO129#002', description: 'ZIP / postal code' },
    { path: `${CI}.CityTown`, modelType: MLP, semanticId: '0173-1#02-AAO132#002', description: 'City / town name' },
    { path: `${CI}.NationalCode`, modelType: MLP, semanticId: '0173-1#02-AAO134#002', description: 'Country code (ISO 3166-1 alpha-2)' },
    { path: `${CI}.Phone.TelephoneNumber`, modelType: MLP, semanticId: '0173-1#02-AAO136#002', description: 'Phone number including country code' },
    { path: `${CI}.Email.EmailAddress`, semanticId: '0173-1#02-AAO198#002', description: 'Email address' },
    { path: `${CI}.AddressOfAdditionalLink`, semanticId: '0173-1#02-AAQ326#002', description: 'Website URL' },
  ],
});

export const SUBMODEL_TEMPLATES: SubmodelTemplate[] = [
  NAMEPLATE_TEMPLATE,
  TECHNICAL_DATA_TEMPLATE,
  DOCUMENTATION_TEMPLATE,
  CONTACT_INFORMATION_TEMPLATE,
  OPERATIONAL_DATA_TEMPLATE,
  MAINTENANCE_TEMPLATE,
];

/**
 * Common IDTA semantic IDs for reference (current published template versions).
 */
export const SEMANTIC_ID_SUGGESTIONS = [
  { label: 'Nameplate (IDTA 02006-3-0)', value: 'https://admin-shell.io/idta/nameplate/3/0/Nameplate' },
  { label: 'Technical Data (IDTA 02003-2-0)', value: '0173-1#01-AHX837#002' },
  { label: 'Handover Documentation (IDTA 02004-2-0)', value: '0173-1#01-AHF578#003' },
  { label: 'Contact Information (IDTA 02002-1-0)', value: 'https://admin-shell.io/zvei/nameplate/1/0/ContactInformations' },
  { label: 'Operational Data (custom)', value: CUSTOM_SEMANTIC_IDS.OperationalData },
  { label: 'Maintenance (custom)', value: CUSTOM_SEMANTIC_IDS.Maintenance },
];
