// IEC 81346 Standard Designations for Industrial Production
// Based on IEC 81346-2:2019 Reference designation system

export interface RDSStandard {
  code: string;
  name: string;
  description: string;
  aspectType: 'function' | 'product' | 'location';
  category: string;
  examples?: string[];
}

export const RDS_STANDARDS: RDSStandard[] = [
  // Function Aspect Standards (=)
  {
    code: '=A',
    name: 'Actuator',
    description: 'Devices that convert energy into motion',
    aspectType: 'function',
    category: 'Actuation',
    examples: ['=A1 (Pneumatic Actuator)', '=A2 (Electric Actuator)']
  },
  {
    code: '=C',
    name: 'Controller',
    description: 'Control and regulation devices',
    aspectType: 'function',
    category: 'Control',
    examples: ['=C1 (PLC)', '=C2 (HMI)', '=C3 (DCS)']
  },
  {
    code: '=D',
    name: 'Drive',
    description: 'Variable speed drives and motor controllers',
    aspectType: 'function',
    category: 'Drive Systems',
    examples: ['=D1 (VFD)', '=D2 (Servo Drive)']
  },
  {
    code: '=E',
    name: 'Energy Storage',
    description: 'Energy storage and battery systems',
    aspectType: 'function',
    category: 'Energy',
    examples: ['=E1 (Battery)', '=E2 (Capacitor Bank)']
  },
  {
    code: '=F',
    name: 'Protection',
    description: 'Safety and protection devices',
    aspectType: 'function',
    category: 'Safety',
    examples: ['=F1 (Fuse)', '=F2 (Circuit Breaker)', '=F3 (Emergency Stop)']
  },
  {
    code: '=G',
    name: 'Generator',
    description: 'Power generation equipment',
    aspectType: 'function',
    category: 'Power Generation',
    examples: ['=G1 (Generator)', '=G2 (UPS)']
  },
  {
    code: '=H',
    name: 'Heating',
    description: 'Heating and thermal control',
    aspectType: 'function',
    category: 'Thermal',
    examples: ['=H1 (Heater)', '=H2 (Heat Exchanger)']
  },
  {
    code: '=K',
    name: 'Cooling',
    description: 'Cooling and refrigeration systems',
    aspectType: 'function',
    category: 'Thermal',
    examples: ['=K1 (Chiller)', '=K2 (Cooling Tower)']
  },
  {
    code: '=M',
    name: 'Motor',
    description: 'Electric motors and motion systems',
    aspectType: 'function',
    category: 'Drive Systems',
    examples: ['=M1 (AC Motor)', '=M2 (DC Motor)', '=M3 (Servo Motor)']
  },
  {
    code: '=P',
    name: 'Pump',
    description: 'Fluid pumping and transfer',
    aspectType: 'function',
    category: 'Fluid Handling',
    examples: ['=P1 (Centrifugal Pump)', '=P2 (Positive Displacement)']
  },
  {
    code: '=Q',
    name: 'Switching Device',
    description: 'Switches, contactors, and relays',
    aspectType: 'function',
    category: 'Control',
    examples: ['=Q1 (Contactor)', '=Q2 (Relay)', '=Q3 (Switch)']
  },
  {
    code: '=S',
    name: 'Sensor',
    description: 'Measurement and sensing devices',
    aspectType: 'function',
    category: 'Measurement',
    examples: ['=S1 (Temperature)', '=S2 (Pressure)', '=S3 (Flow)', '=S4 (Position)']
  },
  {
    code: '=T',
    name: 'Transformer',
    description: 'Voltage transformation equipment',
    aspectType: 'function',
    category: 'Power Distribution',
    examples: ['=T1 (Power Transformer)', '=T2 (Control Transformer)']
  },
  {
    code: '=V',
    name: 'Valve',
    description: 'Flow control and isolation valves',
    aspectType: 'function',
    category: 'Fluid Handling',
    examples: ['=V1 (Ball Valve)', '=V2 (Control Valve)', '=V3 (Solenoid Valve)']
  },
  {
    code: '=W',
    name: 'Transmission',
    description: 'Mechanical power transmission',
    aspectType: 'function',
    category: 'Mechanical',
    examples: ['=W1 (Gearbox)', '=W2 (Belt Drive)', '=W3 (Chain Drive)']
  },
  {
    code: '=X',
    name: 'Connection',
    description: 'Terminals and connection points',
    aspectType: 'function',
    category: 'Connectivity',
    examples: ['=X1 (Terminal Block)', '=X2 (Connector)', '=X3 (Junction Box)']
  },
  {
    code: '=Y',
    name: 'Operator Interface',
    description: 'Human-machine interface devices',
    aspectType: 'function',
    category: 'Interface',
    examples: ['=Y1 (Pushbutton)', '=Y2 (Selector Switch)', '=Y3 (Indicator Light)']
  },

  // Product Aspect Standards (-)
  {
    code: '-A',
    name: 'Assembly Line',
    description: 'Complete assembly line systems',
    aspectType: 'product',
    category: 'Production Lines',
    examples: ['-A1 (Manual Assembly)', '-A2 (Automated Assembly)']
  },
  {
    code: '-C',
    name: 'Conveyor',
    description: 'Material transport systems',
    aspectType: 'product',
    category: 'Material Handling',
    examples: ['-C1 (Belt Conveyor)', '-C2 (Roller Conveyor)', '-C3 (Chain Conveyor)']
  },
  {
    code: '-E',
    name: 'Electrical Cabinet',
    description: 'Electrical enclosures and panels',
    aspectType: 'product',
    category: 'Infrastructure',
    examples: ['-E1 (Main Panel)', '-E2 (Control Cabinet)', '-E3 (Distribution Panel)']
  },
  {
    code: '-F',
    name: 'Fixture',
    description: 'Work holding and positioning fixtures',
    aspectType: 'product',
    category: 'Tooling',
    examples: ['-F1 (Welding Fixture)', '-F2 (Assembly Fixture)']
  },
  {
    code: '-L',
    name: 'Production Line',
    description: 'Complete manufacturing line',
    aspectType: 'product',
    category: 'Production Lines',
    examples: ['-L1 (Machining Line)', '-L2 (Coating Line)', '-L3 (Packaging Line)']
  },
  {
    code: '-M',
    name: 'Machine',
    description: 'Manufacturing machines and equipment',
    aspectType: 'product',
    category: 'Production Equipment',
    examples: ['-M1 (CNC Machine)', '-M2 (Press)', '-M3 (Lathe)', '-M4 (Mill)']
  },
  {
    code: '-P',
    name: 'Processing Unit',
    description: 'Material processing equipment',
    aspectType: 'product',
    category: 'Processing',
    examples: ['-P1 (Furnace)', '-P2 (Dryer)', '-P3 (Mixer)']
  },
  {
    code: '-R',
    name: 'Robot',
    description: 'Industrial robots and automation',
    aspectType: 'product',
    category: 'Automation',
    examples: ['-R1 (Articulated Robot)', '-R2 (SCARA Robot)', '-R3 (Collaborative Robot)']
  },
  {
    code: '-S',
    name: 'Storage System',
    description: 'Material storage and retrieval',
    aspectType: 'product',
    category: 'Material Handling',
    examples: ['-S1 (AS/RS)', '-S2 (Warehouse Racking)', '-S3 (Buffer Storage)']
  },
  {
    code: '-T',
    name: 'Tank',
    description: 'Storage tanks and vessels',
    aspectType: 'product',
    category: 'Storage',
    examples: ['-T1 (Process Tank)', '-T2 (Storage Tank)', '-T3 (Pressure Vessel)']
  },
  {
    code: '-W',
    name: 'Workstation',
    description: 'Manual or semi-automated workstations',
    aspectType: 'product',
    category: 'Work Areas',
    examples: ['-W1 (Assembly Station)', '-W2 (Inspection Station)', '-W3 (Test Station)']
  },

  // Location Aspect Standards (+)
  {
    code: '+B',
    name: 'Building',
    description: 'Manufacturing buildings and structures',
    aspectType: 'location',
    category: 'Facilities',
    examples: ['+B1 (Production Hall)', '+B2 (Warehouse)', '+B3 (Office Building)']
  },
  {
    code: '+F',
    name: 'Floor',
    description: 'Floor levels within buildings',
    aspectType: 'location',
    category: 'Facilities',
    examples: ['+F1 (Ground Floor)', '+F2 (First Floor)']
  },
  {
    code: '+R',
    name: 'Room',
    description: 'Rooms and enclosed spaces',
    aspectType: 'location',
    category: 'Facilities',
    examples: ['+R1 (Control Room)', '+R2 (Clean Room)', '+R3 (Storage Room)']
  },
  {
    code: '+Z',
    name: 'Zone',
    description: 'Production zones and areas',
    aspectType: 'location',
    category: 'Facilities',
    examples: ['+Z1 (Assembly Zone)', '+Z2 (Machining Zone)', '+Z3 (Quality Zone)']
  }
];

export const getStandardsByAspect = (aspectType: 'function' | 'product' | 'location') => {
  return RDS_STANDARDS.filter(std => std.aspectType === aspectType);
};

export const getStandardsByCategory = (category: string) => {
  return RDS_STANDARDS.filter(std => std.category === category);
};

export const searchStandards = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return RDS_STANDARDS.filter(std => 
    std.code.toLowerCase().includes(lowerQuery) ||
    std.name.toLowerCase().includes(lowerQuery) ||
    std.description.toLowerCase().includes(lowerQuery) ||
    std.category.toLowerCase().includes(lowerQuery)
  );
};
