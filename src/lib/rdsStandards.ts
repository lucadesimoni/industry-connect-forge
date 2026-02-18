// IEC 81346-2:2019 Reference designation system — Classes of objects
// The SAME letter classes apply to both function (=) and product (-) aspects.
// The aspect prefix determines the viewpoint:
//   = (function): what the object DOES in the system
//   - (product): what the object IS physically

export interface RDSStandard {
  code: string;
  name: string;
  description: string;
  aspectType: 'function' | 'product' | 'location';
  category: string;
  examples?: string[];
}

// IEC 81346-2:2019 object classes
const IEC_CLASSES: Array<{
  letter: string;
  name: string;
  functionDescription: string;
  productDescription: string;
  category: string;
  functionExamples: string[];
  productExamples: string[];
}> = [
  {
    letter: 'A',
    name: 'Assembly / Multi-purpose',
    functionDescription: 'Performing two or more purposes or tasks simultaneously',
    productDescription: 'Assembly of objects for combined purposes',
    category: 'Assemblies',
    functionExamples: ['=A1 (Combined system)', '=A2 (Multi-function unit)'],
    productExamples: ['-A1 (Equipment assembly)', '-A2 (Modular unit)'],
  },
  {
    letter: 'B',
    name: 'Transducer / Sensor',
    functionDescription: 'Converting a physical variable into a signal for further processing',
    productDescription: 'Transducer or sensor device',
    category: 'Sensing & Measurement',
    functionExamples: ['=B1 (Temperature sensing)', '=B2 (Pressure sensing)', '=B3 (Flow measurement)'],
    productExamples: ['-B1 (Thermocouple)', '-B2 (Pressure transmitter)', '-B3 (Flowmeter)'],
  },
  {
    letter: 'C',
    name: 'Storing',
    functionDescription: 'Storing energy, information, or material',
    productDescription: 'Storage device or container',
    category: 'Storage',
    functionExamples: ['=C1 (Energy storage)', '=C2 (Material storage)', '=C3 (Data storage)'],
    productExamples: ['-C1 (Capacitor)', '-C2 (Tank)', '-C3 (Accumulator)', '-C4 (Buffer)'],
  },
  {
    letter: 'E',
    name: 'Radiant / Thermal Energy',
    functionDescription: 'Providing radiant or thermal energy (heating, lighting, radiation)',
    productDescription: 'Heating or lighting device',
    category: 'Thermal & Lighting',
    functionExamples: ['=E1 (Heating)', '=E2 (Lighting)', '=E3 (Laser processing)'],
    productExamples: ['-E1 (Heater)', '-E2 (Lamp)', '-E3 (Laser)', '-E4 (Heat exchanger)'],
  },
  {
    letter: 'F',
    name: 'Protection',
    functionDescription: 'Protecting directly against hazardous or unwanted conditions',
    productDescription: 'Protective device',
    category: 'Safety & Protection',
    functionExamples: ['=F1 (Overcurrent protection)', '=F2 (Overvoltage protection)', '=F3 (Emergency stop)'],
    productExamples: ['-F1 (Fuse)', '-F2 (Circuit breaker)', '-F3 (Safety relay)', '-F4 (Light curtain)'],
  },
  {
    letter: 'G',
    name: 'Generating / Initiating',
    functionDescription: 'Initiating a flow of energy or material',
    productDescription: 'Generator or power supply device',
    category: 'Power Generation',
    functionExamples: ['=G1 (Power generation)', '=G2 (Signal generation)', '=G3 (Backup power)'],
    productExamples: ['-G1 (Generator)', '-G2 (Battery)', '-G3 (UPS)', '-G4 (Power supply)'],
  },
  {
    letter: 'H',
    name: 'Producing / Manufacturing',
    functionDescription: 'Producing a new kind of material or product',
    productDescription: 'Manufacturing or chemical processing equipment',
    category: 'Manufacturing',
    functionExamples: ['=H1 (Material processing)', '=H2 (Chemical reaction)', '=H3 (Forming)'],
    productExamples: ['-H1 (Furnace)', '-H2 (Reactor)', '-H3 (Press)', '-H4 (Moulding machine)'],
  },
  {
    letter: 'K',
    name: 'Processing Signals / Data',
    functionDescription: 'Processing, controlling, or regulating signals or data',
    productDescription: 'Signal processing or control device',
    category: 'Control & Processing',
    functionExamples: ['=K1 (Process control)', '=K2 (Signal processing)', '=K3 (Data processing)'],
    productExamples: ['-K1 (PLC)', '-K2 (Relay)', '-K3 (Controller)', '-K4 (DCS)'],
  },
  {
    letter: 'M',
    name: 'Mechanical Energy',
    functionDescription: 'Providing mechanical energy (rotational or linear motion)',
    productDescription: 'Motor or mechanical drive',
    category: 'Drive & Motion',
    functionExamples: ['=M1 (Rotational drive)', '=M2 (Linear drive)', '=M3 (Servo positioning)'],
    productExamples: ['-M1 (AC motor)', '-M2 (DC motor)', '-M3 (Servo motor)', '-M4 (Stepper motor)'],
  },
  {
    letter: 'N',
    name: 'Analogue Processing',
    functionDescription: 'Processing analogue signals',
    productDescription: 'Analogue signal processing device',
    category: 'Control & Processing',
    functionExamples: ['=N1 (Analogue control)', '=N2 (Signal conditioning)'],
    productExamples: ['-N1 (Amplifier)', '-N2 (Converter)', '-N3 (Regulator)'],
  },
  {
    letter: 'P',
    name: 'Presenting Information',
    functionDescription: 'Presenting information to humans',
    productDescription: 'Display or indicator device',
    category: 'HMI & Displays',
    functionExamples: ['=P1 (Process visualization)', '=P2 (Alarm indication)', '=P3 (Monitoring)'],
    productExamples: ['-P1 (HMI panel)', '-P2 (Indicator light)', '-P3 (Display)', '-P4 (Alarm horn)'],
  },
  {
    letter: 'Q',
    name: 'Controlled Switching',
    functionDescription: 'Controlled switching or varying of energy, signal, or material flow',
    productDescription: 'Switching or control device',
    category: 'Switching',
    functionExamples: ['=Q1 (Power switching)', '=Q2 (Flow control)', '=Q3 (Signal routing)'],
    productExamples: ['-Q1 (Contactor)', '-Q2 (Control valve)', '-Q3 (Frequency converter)', '-Q4 (Servo drive)'],
  },
  {
    letter: 'R',
    name: 'Restricting / Stabilizing',
    functionDescription: 'Restricting or stabilizing motion, flow of energy, or material',
    productDescription: 'Restricting or damping device',
    category: 'Flow Control',
    functionExamples: ['=R1 (Flow restriction)', '=R2 (Damping)', '=R3 (Filtering)'],
    productExamples: ['-R1 (Resistor)', '-R2 (Brake)', '-R3 (Filter)', '-R4 (Damper)'],
  },
  {
    letter: 'S',
    name: 'Manual Input',
    functionDescription: 'Converting a manual operation into a signal',
    productDescription: 'Manual input device',
    category: 'HMI & Displays',
    functionExamples: ['=S1 (Start command)', '=S2 (Mode selection)', '=S3 (Speed setting)'],
    productExamples: ['-S1 (Pushbutton)', '-S2 (Selector switch)', '-S3 (Potentiometer)', '-S4 (Joystick)'],
  },
  {
    letter: 'T',
    name: 'Transforming',
    functionDescription: 'Transforming energy while maintaining its form',
    productDescription: 'Transformer or converter',
    category: 'Power Distribution',
    functionExamples: ['=T1 (Voltage transformation)', '=T2 (Power conversion)'],
    productExamples: ['-T1 (Power transformer)', '-T2 (Control transformer)', '-T3 (Inverter)'],
  },
  {
    letter: 'U',
    name: 'Holding / Positioning',
    functionDescription: 'Keeping objects in a defined position',
    productDescription: 'Support, fixture, or enclosure',
    category: 'Structural',
    functionExamples: ['=U1 (Workholding)', '=U2 (Positioning)', '=U3 (Enclosing)'],
    productExamples: ['-U1 (Rack/cabinet)', '-U2 (Fixture)', '-U3 (Frame)', '-U4 (Enclosure)'],
  },
  {
    letter: 'V',
    name: 'Processing / Treating Material',
    functionDescription: 'Processing, treating, or transporting material',
    productDescription: 'Material processing or transport equipment',
    category: 'Material Handling',
    functionExamples: ['=V1 (Material transport)', '=V2 (Mixing)', '=V3 (Pumping)', '=V4 (Compressing)'],
    productExamples: ['-V1 (Conveyor)', '-V2 (Pump)', '-V3 (Compressor)', '-V4 (Mixer)', '-V5 (Fan)'],
  },
  {
    letter: 'W',
    name: 'Guiding / Conducting',
    functionDescription: 'Guiding or conducting energy, signals, or material',
    productDescription: 'Conducting or guiding element',
    category: 'Routing & Distribution',
    functionExamples: ['=W1 (Power distribution)', '=W2 (Signal routing)', '=W3 (Material flow)'],
    productExamples: ['-W1 (Cable)', '-W2 (Pipe)', '-W3 (Duct)', '-W4 (Busbar)', '-W5 (Waveguide)'],
  },
  {
    letter: 'X',
    name: 'Connecting',
    functionDescription: 'Connecting objects together',
    productDescription: 'Connector or terminal',
    category: 'Connectivity',
    functionExamples: ['=X1 (Power connection)', '=X2 (Signal connection)', '=X3 (Pipe connection)'],
    productExamples: ['-X1 (Terminal block)', '-X2 (Plug connector)', '-X3 (Junction box)', '-X4 (Coupling)'],
  },
];

// Generate the flat RDS_STANDARDS array from IEC classes
export const RDS_STANDARDS: RDSStandard[] = [
  // Function aspect entries (=)
  ...IEC_CLASSES.map(cls => ({
    code: `=${cls.letter}`,
    name: cls.name,
    description: cls.functionDescription,
    aspectType: 'function' as const,
    category: cls.category,
    examples: cls.functionExamples,
  })),
  // Product aspect entries (-)
  ...IEC_CLASSES.map(cls => ({
    code: `-${cls.letter}`,
    name: cls.name,
    description: cls.productDescription,
    aspectType: 'product' as const,
    category: cls.category,
    examples: cls.productExamples,
  })),
  // Location Aspect Standards (+) — IEC 81346-2 location classes
  {
    code: '+B',
    name: 'Building',
    description: 'Buildings and enclosed structures',
    aspectType: 'location',
    category: 'Facilities',
    examples: ['+B1 (Production hall)', '+B2 (Warehouse)', '+B3 (Office)'],
  },
  {
    code: '+F',
    name: 'Floor / Level',
    description: 'Floor levels within buildings',
    aspectType: 'location',
    category: 'Facilities',
    examples: ['+F0 (Ground floor)', '+F1 (First floor)', '+F-1 (Basement)'],
  },
  {
    code: '+R',
    name: 'Room',
    description: 'Rooms and enclosed spaces',
    aspectType: 'location',
    category: 'Facilities',
    examples: ['+R1 (Control room)', '+R2 (Clean room)', '+R3 (Electrical room)'],
  },
  {
    code: '+Z',
    name: 'Zone / Area',
    description: 'Production zones, areas, or outdoor spaces',
    aspectType: 'location',
    category: 'Facilities',
    examples: ['+Z1 (Assembly zone)', '+Z2 (Machining zone)', '+Z3 (Loading area)'],
  },
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
