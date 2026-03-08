/**
 * IDTA Standard Submodel Templates per IEC 63278 / IDTA specifications.
 * These templates provide pre-configured submodel structures for common use cases.
 */

import { AASProperty, AASValueType } from '@/types/industrial';

export interface SubmodelTemplate {
  idShort: string;
  semanticId: string;
  description: string;
  standard: string;
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
 * IDTA 02006-2-0: Digital Nameplate for Industrial Equipment
 */
const NAMEPLATE_TEMPLATE: SubmodelTemplate = {
  idShort: 'Nameplate',
  semanticId: 'https://admin-shell.io/zvei/nameplate/2/0/Nameplate',
  description: 'Digital Nameplate per IDTA 02006-2-0. Contains manufacturer information and product identification.',
  standard: 'IDTA 02006-2-0',
  properties: [
    { idShort: 'ManufacturerName', valueType: 'xs:string', value: '', description: 'Legally valid designation of the natural or judicial body', semanticId: '0173-1#02-AAO677#002' },
    { idShort: 'ManufacturerProductDesignation', valueType: 'xs:string', value: '', description: 'Product designation as given by the manufacturer', semanticId: '0173-1#02-AAW338#001' },
    { idShort: 'SerialNumber', valueType: 'xs:string', value: '', description: 'Unique serial number assigned by the manufacturer', semanticId: '0173-1#02-AAM556#002' },
    { idShort: 'YearOfConstruction', valueType: 'xs:string', value: '', description: 'Year of construction (YYYY)', semanticId: '0173-1#02-AAP906#001' },
    { idShort: 'CountryOfOrigin', valueType: 'xs:string', value: '', description: 'Country where the product was manufactured (ISO 3166-1)', semanticId: '0173-1#02-AAO259#004' },
  ],
};

/**
 * IDTA 02003-1-2: Technical Data (Generic)
 */
const TECHNICAL_DATA_TEMPLATE: SubmodelTemplate = {
  idShort: 'TechnicalData',
  semanticId: 'https://admin-shell.io/ZVEI/TechnicalData/Submodel/1/2',
  description: 'Technical Data per IDTA 02003-1-2. Contains general technical properties of the asset.',
  standard: 'IDTA 02003-1-2',
  properties: [
    { idShort: 'MaxRotationalSpeed', valueType: 'xs:double', value: 0, unit: '1/min', description: 'Maximum rotational speed' },
    { idShort: 'NominalVoltage', valueType: 'xs:double', value: 0, unit: 'V', description: 'Nominal voltage' },
    { idShort: 'NominalPower', valueType: 'xs:double', value: 0, unit: 'W', description: 'Nominal power consumption' },
    { idShort: 'Weight', valueType: 'xs:double', value: 0, unit: 'kg', description: 'Weight of the asset' },
    { idShort: 'IPRating', valueType: 'xs:string', value: '', description: 'Ingress Protection rating (e.g. IP65)' },
  ],
};

/**
 * IDTA 02004-1-2: Handover Documentation
 */
const DOCUMENTATION_TEMPLATE: SubmodelTemplate = {
  idShort: 'Documentation',
  semanticId: 'https://admin-shell.io/ZVEI/TechnicalData/Documentation/1/2',
  description: 'Handover Documentation per IDTA 02004-1-2. References to manuals, certificates, and drawings.',
  standard: 'IDTA 02004-1-2',
  properties: [
    { idShort: 'OperatingManualURI', valueType: 'xs:anyURI', value: '', description: 'URI to the operating manual' },
    { idShort: 'CertificateOfConformity', valueType: 'xs:anyURI', value: '', description: 'URI to certificate of conformity' },
    { idShort: 'SafetyDataSheet', valueType: 'xs:anyURI', value: '', description: 'URI to safety data sheet' },
  ],
};

/**
 * Operational Data (common pattern for real-time metrics)
 */
const OPERATIONAL_DATA_TEMPLATE: SubmodelTemplate = {
  idShort: 'OperationalData',
  semanticId: 'https://admin-shell.io/idta/OperationalData/1/0',
  description: 'Operational / runtime data. Maps to Sparkplug B DDATA metrics for live telemetry.',
  standard: 'Custom (IDTA-aligned)',
  properties: [
    { idShort: 'OperatingHours', valueType: 'xs:double', value: 0, unit: 'h', description: 'Total operating hours', semanticId: '0173-1#02-AAV209#001' },
    { idShort: 'CurrentTemperature', valueType: 'xs:double', value: 0, unit: '°C', description: 'Current operating temperature' },
    { idShort: 'CurrentState', valueType: 'xs:string', value: 'idle', description: 'Current operational state (idle, running, error, maintenance)' },
    { idShort: 'CycleCount', valueType: 'xs:long', value: 0, description: 'Number of completed production cycles' },
  ],
};

/**
 * Maintenance (common for predictive maintenance)
 */
const MAINTENANCE_TEMPLATE: SubmodelTemplate = {
  idShort: 'Maintenance',
  semanticId: 'https://admin-shell.io/idta/Maintenance/1/0',
  description: 'Maintenance information. Tracks service intervals, last maintenance, and upcoming schedules.',
  standard: 'Custom (IDTA-aligned)',
  properties: [
    { idShort: 'LastMaintenanceDate', valueType: 'xs:dateTime', value: '', description: 'Date of last maintenance' },
    { idShort: 'NextMaintenanceDue', valueType: 'xs:dateTime', value: '', description: 'Scheduled next maintenance' },
    { idShort: 'MaintenanceIntervalHours', valueType: 'xs:double', value: 0, unit: 'h', description: 'Maintenance interval in operating hours' },
    { idShort: 'MaintenanceStatus', valueType: 'xs:string', value: 'ok', description: 'Current maintenance status (ok, due, overdue)' },
  ],
};

/**
 * IDTA 02002-1-0: Contact Information
 * Commonly referenced in Nameplate (IDTA 02006) as a nested SMC.
 */
const CONTACT_INFORMATION_TEMPLATE: SubmodelTemplate = {
  idShort: 'ContactInformation',
  semanticId: 'https://admin-shell.io/zvei/nameplate/2/0/ContactInformation',
  description: 'Contact Information per IDTA 02002-1-0. Manufacturer or operator contact details.',
  standard: 'IDTA 02002-1-0',
  properties: [
    { idShort: 'CompanyName', valueType: 'xs:string', value: '', description: 'Name of the company', semanticId: '0173-1#02-AAW001#001' },
    { idShort: 'Street', valueType: 'xs:string', value: '', description: 'Street name and number', semanticId: '0173-1#02-AAO128#002' },
    { idShort: 'ZipCode', valueType: 'xs:string', value: '', description: 'ZIP / postal code', semanticId: '0173-1#02-AAO129#002' },
    { idShort: 'City', valueType: 'xs:string', value: '', description: 'City / town name', semanticId: '0173-1#02-AAO132#002' },
    { idShort: 'NationalCode', valueType: 'xs:string', value: '', description: 'Country code (ISO 3166-1 alpha-2)', semanticId: '0173-1#02-AAO134#002' },
    { idShort: 'Phone', valueType: 'xs:string', value: '', description: 'Phone number including country code', semanticId: '0173-1#02-AAO136#002' },
    { idShort: 'Email', valueType: 'xs:string', value: '', description: 'Email address', semanticId: '0173-1#02-AAO198#003' },
    { idShort: 'URL', valueType: 'xs:anyURI', value: '', description: 'Website URL', semanticId: '0173-1#02-AAQ326#002' },
    { idShort: 'Department', valueType: 'xs:string', value: '', description: 'Department or division within the company', semanticId: '0173-1#02-AAO127#003' },
    { idShort: 'RoleOfContactPerson', valueType: 'xs:string', value: '', description: 'Role of the contact person (e.g. sales, support)', semanticId: '0173-1#02-AAO204#003' },
  ],
};

export const SUBMODEL_TEMPLATES: SubmodelTemplate[] = [
  NAMEPLATE_TEMPLATE,
  TECHNICAL_DATA_TEMPLATE,
  DOCUMENTATION_TEMPLATE,
  CONTACT_INFORMATION_TEMPLATE,
  OPERATIONAL_DATA_TEMPLATE,
  MAINTENANCE_TEMPLATE,
];

/**
 * Common IDTA semantic IDs for reference.
 */
export const SEMANTIC_ID_SUGGESTIONS = [
  { label: 'Nameplate (IDTA 02006)', value: 'https://admin-shell.io/zvei/nameplate/2/0/Nameplate' },
  { label: 'Technical Data (IDTA 02003)', value: 'https://admin-shell.io/ZVEI/TechnicalData/Submodel/1/2' },
  { label: 'Documentation (IDTA 02004)', value: 'https://admin-shell.io/ZVEI/TechnicalData/Documentation/1/2' },
  { label: 'Contact Information (IDTA 02002)', value: 'https://admin-shell.io/zvei/nameplate/2/0/ContactInformation' },
  { label: 'Operational Data', value: 'https://admin-shell.io/idta/OperationalData/1/0' },
  { label: 'Maintenance', value: 'https://admin-shell.io/idta/Maintenance/1/0' },
];
