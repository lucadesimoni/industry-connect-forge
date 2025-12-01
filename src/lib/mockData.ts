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

// Mock AAS instances
export const mockAAS: AAS[] = [
  {
    id: 'aas-1',
    assetId: 'ASSET-001',
    idShort: 'RobotArm_R2000',
    description: 'Industrial Robot Arm R2000',
    manufacturer: 'RoboTech Industries',
    serialNumber: 'SN-2024-001',
    linkedUNSNodeId: 'uns-5',
    linkedRDSId: 'rds-1',
    submodels: [
      {
        id: 'sm-1',
        idShort: 'TechnicalData',
        semanticId: 'urn:iec:63278:submodel:technical',
        description: 'Technical specifications',
        properties: [
          { idShort: 'Weight', valueType: 'number', value: 850, unit: 'kg', description: 'Total weight' },
          { idShort: 'Payload', valueType: 'number', value: 200, unit: 'kg', description: 'Maximum payload' },
          { idShort: 'Reach', valueType: 'number', value: 2000, unit: 'mm', description: 'Working reach' },
        ],
      },
      {
        id: 'sm-2',
        idShort: 'Operational',
        semanticId: 'urn:iec:63278:submodel:operational',
        description: 'Operational data',
        properties: [
          { idShort: 'Status', valueType: 'string', value: 'Active', description: 'Current status' },
          { idShort: 'Uptime', valueType: 'number', value: 98.5, unit: '%', description: 'Operational uptime' },
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
    submodels: [
      {
        id: 'sm-3',
        idShort: 'TechnicalData',
        semanticId: 'urn:iec:63278:submodel:technical',
        description: 'Technical specifications',
        properties: [
          { idShort: 'Length', valueType: 'number', value: 15, unit: 'm', description: 'Belt length' },
          { idShort: 'Speed', valueType: 'number', value: 1.5, unit: 'm/s', description: 'Belt speed' },
        ],
      },
    ],
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-16'),
  },
];

// Mock RDS Designations
export const mockRDS: RDSDesignation[] = [
  {
    id: 'rds-1',
    designation: '=M1-A1.1',
    aspectCode: '=',
    objectClass: 'M1',
    description: 'Robot Arm - Function: Assembly, Product: M1, Location: A1.1',
    linkedUNSNodeId: 'uns-5',
    linkedAASId: 'aas-1',
    isInstance: true,
    functionAspect: 'M1',
    metadata: {
      functionAspect: 'Assembly',
      productAspect: 'Robot Type M1',
      locationAspect: 'Area A, Position 1.1',
    },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'rds-2',
    designation: '=C1-L1.2',
    aspectCode: '=',
    objectClass: 'C1',
    description: 'Conveyor - Function: Transport, Product: C1, Location: L1.2',
    linkedUNSNodeId: 'uns-4',
    linkedAASId: 'aas-2',
    isInstance: true,
    functionAspect: 'C1',
    metadata: {
      functionAspect: 'Material Transport',
      productAspect: 'Conveyor Type C1',
      locationAspect: 'Line 1, Position 2',
    },
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
  },
];
