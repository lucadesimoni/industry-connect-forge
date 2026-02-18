import { UNSNode, AAS, RDSDesignation, ISA95Level } from '@/types/industrial';

// Mock UNS Hierarchy
export const mockUNSNodes: UNSNode[] = [
  {
    id: 'uns-1',
    name: 'Manufacturing Corp',
    level: 'Enterprise' as ISA95Level,
    parentId: null,
    description: 'Enterprise root node',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'uns-2',
    name: 'Factory North',
    level: 'Site' as ISA95Level,
    parentId: 'uns-1',
    description: 'Northern manufacturing site',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: 'uns-3',
    name: 'Production Area A',
    level: 'Area' as ISA95Level,
    parentId: 'uns-2',
    description: 'Assembly production area',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
  {
    id: 'uns-4',
    name: 'Assembly Line 1',
    level: 'Line' as ISA95Level,
    parentId: 'uns-3',
    description: 'Main assembly line',
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-04'),
  },
  {
    id: 'uns-5',
    name: 'Workstation C1',
    level: 'Cell' as ISA95Level,
    parentId: 'uns-4',
    description: 'Component assembly cell',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
];

// Mock AAS instances (with Type/Instance pattern)
export const mockAAS: AAS[] = [
  {
    id: 'aas-type-1',
    assetId: 'TYPE-ROBOT-ARM',
    idShort: 'RobotArm_Type',
    description: 'Industrial Robot Arm Type - Template for assembly robots',
    manufacturer: 'RoboTech Industries',
    isType: true,
    submodels: [
      {
        id: 'sm-type-1',
        idShort: 'TechnicalData',
        semanticId: 'urn:iec:63278:submodel:technical',
        description: 'Technical specifications template',
        properties: [
          { id: 'prop-1', idShort: 'Weight', valueType: 'number', value: 850, unit: 'kg', description: 'Total weight' },
          { id: 'prop-2', idShort: 'Payload', valueType: 'number', value: 200, unit: 'kg', description: 'Maximum payload' },
        ],
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'aas-1',
    assetId: 'ASSET-001',
    idShort: 'RobotArm_R2000',
    description: 'Industrial Robot Arm R2000 (Instance of RobotArm_Type)',
    manufacturer: 'RoboTech Industries',
    serialNumber: 'SN-2024-001',
    linkedUNSNodeId: 'uns-5',
    linkedRDSId: 'rds-1',
    isType: false,
    typeAASId: 'aas-type-1',
    submodels: [
      {
        id: 'sm-1',
        idShort: 'OperationalData',
        semanticId: 'urn:iec:63278:submodel:operational',
        description: 'Live operational data',
        properties: [
          { id: 'prop-4', idShort: 'Status', valueType: 'string', value: 'Active', description: 'Current status' },
          { id: 'prop-5', idShort: 'Uptime', valueType: 'number', value: 98.5, unit: '%', description: 'Operational uptime' },
        ],
      },
    ],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'aas-2',
    assetId: 'ASSET-002',
    idShort: 'Conveyor_CV100',
    description: 'Belt Conveyor System CV100',
    manufacturer: 'ConveyTech',
    serialNumber: 'SN-2024-002',
    linkedUNSNodeId: 'uns-4',
    linkedRDSId: 'rds-2',
    isType: false,
    submodels: [
      {
        id: 'sm-3',
        idShort: 'TechnicalData',
        semanticId: 'urn:iec:63278:submodel:technical',
        description: 'Technical specifications',
        properties: [
          { id: 'prop-6', idShort: 'Length', valueType: 'number', value: 15, unit: 'm', description: 'Belt length' },
          { id: 'prop-7', idShort: 'Speed', valueType: 'number', value: 1.5, unit: 'm/s', description: 'Belt speed' },
        ],
      },
    ],
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-16'),
  },
];

// Mock RDS Designations (IEC 81346-2 compliant)
export const mockRDS: RDSDesignation[] = [
  {
    id: 'rds-1',
    designation: '=M1-H2+PIL.STANS.HALL5.LN01',
    aspectCode: '=',
    objectClass: 'M',
    description: '3-Axis CNC Lathe #1 at CNC Line 01',
    linkedUNSNodeId: 'uns-5',
    linkedAASId: 'aas-1',
    isInstance: true,
    functionAspect: 'M1',
    productAspect: 'H2',
    locationAspect: 'PIL.STANS.HALL5.LN01',
    metadata: {},
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'rds-2',
    designation: '=V1-V1+PIL.STANS.HALL3.LN01',
    aspectCode: '=',
    objectClass: 'V',
    description: 'Fuel Pump Assembly #1 at Assembly Line 01',
    linkedUNSNodeId: 'uns-4',
    linkedAASId: 'aas-2',
    isInstance: true,
    functionAspect: 'V1',
    productAspect: 'V1',
    locationAspect: 'PIL.STANS.HALL3.LN01',
    metadata: {},
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
  },
];
