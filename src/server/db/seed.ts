import { calculateLineTotals, calculateOrderTotals, type GstSlab } from '../../lib/format.ts';
import type {
  ActivityLog,
  Customer,
  Godown,
  Item,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderStatus,
  SalesOrder,
  SalesOrderLine,
  SalesOrderStatus,
  PaymentStatus,
  StockLevel,
  StockMovement,
  Supplier,
} from '../types.ts';

export interface SeedDataset {
  godowns: Godown[];
  suppliers: Supplier[];
  customers: Customer[];
  items: Item[];
  stockLevels: StockLevel[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  stockMovements: StockMovement[];
  activityLogs: ActivityLog[];
}

function daysAgoIso(daysAgo: number, hourOffset = 10): string {
  const now = new Date();
  const d = new Date(now.getTime() - daysAgo * 86_400_000);
  d.setHours(hourOffset, (daysAgo * 13) % 55, 0, 0);
  return d.toISOString();
}

function daysAheadIso(daysAhead: number): string {
  const now = new Date();
  const d = new Date(now.getTime() + daysAhead * 86_400_000);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function createSeedDataset(): SeedDataset {
  const godowns: Godown[] = [
    {
      id: 'gd-1',
      code: 'BHI-01',
      name: 'Bhiwandi Main Godown',
      city: 'Thane (MMR)',
      state: 'Maharashtra',
      manager: 'Rajesh Kulkarni',
      capacityUnits: 6000,
    },
    {
      id: 'gd-2',
      code: 'PUN-02',
      name: 'Pune Chakan Hub',
      city: 'Pune',
      state: 'Maharashtra',
      manager: 'Sneha Deshmukh',
      capacityUnits: 3500,
    },
    {
      id: 'gd-3',
      code: 'AMD-03',
      name: 'Ahmedabad GIDC Depot',
      city: 'Ahmedabad',
      state: 'Gujarat',
      manager: 'Ketan Patel',
      capacityUnits: 3000,
    },
  ];

  const suppliers: Supplier[] = [
    {
      id: 'sup-1',
      name: 'Polycab India Industrial Division',
      contactName: 'Vikramaditya Mehta',
      email: 'industrial.sales@polycab-dist.in',
      phone: '+91 98201 44110',
      city: 'Halol, Gujarat',
      gstin: '24AAACP6474E1Z5',
      leadTimeDays: 4,
    },
    {
      id: 'sup-2',
      name: 'Schneider Electric Partner Hub',
      contactName: 'Ananya Iyer',
      email: 'orders@se-westpartner.in',
      phone: '+91 98220 77312',
      city: 'Pune, Maharashtra',
      gstin: '27AABCS8821K1Z2',
      leadTimeDays: 5,
    },
    {
      id: 'sup-3',
      name: 'Havells Industrial Lighting Co.',
      contactName: 'Sandeep Bansal',
      email: 'west.lighting@havells-channel.in',
      phone: '+91 98112 55091',
      city: 'Noida, UP',
      gstin: '09AAACH0351H1Z9',
      leadTimeDays: 6,
    },
    {
      id: 'sup-4',
      name: 'L&T Switchgear Authorised Depot',
      contactName: 'Prashant Joshi',
      email: 'dispatch@lt-switchgear-west.in',
      phone: '+91 98214 33890',
      city: 'Navi Mumbai, Maharashtra',
      gstin: '27AAACL0140P1Z1',
      leadTimeDays: 3,
    },
    {
      id: 'sup-5',
      name: 'Fluke & Taparia Precision Tools',
      contactName: 'Nitin Chawla',
      email: 'b2b@precisiontools-india.in',
      phone: '+91 98250 11904',
      city: 'Ahmedabad, Gujarat',
      gstin: '24AABCT9102M1Z7',
      leadTimeDays: 5,
    },
    {
      id: 'sup-6',
      name: 'Finolex Cables Western Depot',
      contactName: 'Manoj Bhosale',
      email: 'supply@finolex-west.in',
      phone: '+91 98231 66421',
      city: 'Pimpri, Maharashtra',
      gstin: '27AAACF0342N1Z4',
      leadTimeDays: 3,
    },
    {
      id: 'sup-7',
      name: 'Hensel & Rittal Enclosures India',
      contactName: 'Deepak Nair',
      email: 'channel@enclosures-india.in',
      phone: '+91 98451 89230',
      city: 'Bengaluru, Karnataka',
      gstin: '29AABCH4419R1Z8',
      leadTimeDays: 7,
    },
    {
      id: 'sup-8',
      name: 'Dowells Brass Glands & Lugs',
      contactName: 'Harshad Shah',
      email: 'orders@dowells-terminations.in',
      phone: '+91 98242 20488',
      city: 'Vadodara, Gujarat',
      gstin: '24AAACD3311F1Z3',
      leadTimeDays: 4,
    },
  ];

  const customers: Customer[] = [
    {
      id: 'cus-1',
      name: 'Sterling & Wilson EPC Projects',
      contactName: 'Rohan Gokhale',
      email: 'procurement@sw-epc-demo.in',
      phone: '+91 98204 11223',
      city: 'Mumbai',
      gstin: '27AAACS4921B1Z8',
    },
    {
      id: 'cus-2',
      name: 'Bharat Forge Plant Maintenance',
      contactName: 'Abhijit Pawar',
      email: 'stores.mundhwa@bharatforge-demo.in',
      phone: '+91 98223 54901',
      city: 'Pune',
      gstin: '27AAACB0912C1Z2',
    },
    {
      id: 'cus-3',
      name: 'Torrent Industrial Contractors',
      contactName: 'Mihir Trivedi',
      email: 'purchase@torrent-contractors.in',
      phone: '+91 98251 77420',
      city: 'Ahmedabad',
      gstin: '24AABCT6128D1Z5',
    },
    {
      id: 'cus-4',
      name: 'Shree Ganesh Electricals & Panels',
      contactName: 'Mahesh Agarwal',
      email: 'mahesh@shreeganeshelec.in',
      phone: '+91 98211 90345',
      city: 'Thane',
      gstin: '27AADFS7743G1Z9',
    },
    {
      id: 'cus-5',
      name: 'Kalyani Infra Power Systems',
      contactName: 'Sujata Kulkarni',
      email: 'sujata@kalyaniinfra.in',
      phone: '+91 98230 41289',
      city: 'Chakan, Pune',
      gstin: '27AABCK8834H1Z1',
    },
    {
      id: 'cus-6',
      name: 'Navkar Switchboard Builders',
      contactName: 'Jignesh Modi',
      email: 'jignesh@navkarpanels.in',
      phone: '+91 98254 63119',
      city: 'Surat',
      gstin: '24AAACN4490J1Z6',
    },
    {
      id: 'cus-7',
      name: 'Deccan Cold Storage & Logistics',
      contactName: 'Farhan Siddiqui',
      email: 'eng@deccancoldchain.in',
      phone: '+91 98208 77614',
      city: 'Navi Mumbai',
      gstin: '27AABCD2319K1Z4',
    },
    {
      id: 'cus-8',
      name: 'Apex Textile Mills Utility Div.',
      contactName: 'Rameshwar Patidar',
      email: 'utility@apextextiles.in',
      phone: '+91 98240 51923',
      city: 'Vadodara',
      gstin: '24AABCA9021L1Z0',
    },
    {
      id: 'cus-9',
      name: 'Voltas MEP Subcontracting',
      contactName: 'Siddharth Menon',
      email: 'mep.west@voltas-partner.in',
      phone: '+91 98203 65018',
      city: 'Mumbai',
      gstin: '27AAACV2809M1Z7',
    },
    {
      id: 'cus-10',
      name: 'Sahyadri Automation & Drives',
      contactName: 'Pravin Shinde',
      email: 'pravin@sahyadriauto.in',
      phone: '+91 98228 84102',
      city: 'Nashik',
      gstin: '27AABCS5518N1Z3',
    },
    {
      id: 'cus-11',
      name: 'Kutch Solar Park O&M Services',
      contactName: 'Bhavin Jadeja',
      email: 'om@kutchsolarpark.in',
      phone: '+91 98259 19405',
      city: 'Bhuj',
      gstin: '24AABCK7192P1Z8',
    },
    {
      id: 'cus-12',
      name: 'Pragati Industrial Park Facility',
      contactName: 'Nikhil Sawant',
      email: 'facilities@pragatiipark.in',
      phone: '+91 98216 32098',
      city: 'Bhiwandi',
      gstin: '27AABCP3094Q1Z2',
    },
  ];

  // 40 authentic electrical & industrial supply items across 5 categories
  const catalogSpecs: Array<
    Omit<Item, 'id'> & { targetQty: [number, number, number] }
  > = [
    // 1. Cables & Wires (8 items)
    {
      sku: 'CAB-001',
      hsnCode: '8544',
      name: 'Polycab 4C × 16 sq.mm XLPE Armoured Cable (Drum 100m)',
      category: 'Cables & Wires',
      unit: 'Drum',
      costPrice: 18500,
      sellingPrice: 22400,
      gstRate: 18,
      minLevel: 12,
      preferredSupplierId: 'sup-1',
      targetQty: [5, 3, 2], // Total 10 <= 12 -> LOW
    },
    {
      sku: 'CAB-002',
      hsnCode: '8544',
      name: 'Finolex 2.5 sq.mm FR-LSH Copper Building Wire (90m Coil)',
      category: 'Cables & Wires',
      unit: 'Coil',
      costPrice: 1980,
      sellingPrice: 2450,
      gstRate: 18,
      minLevel: 40,
      preferredSupplierId: 'sup-6',
      targetQty: [110, 65, 50],
    },
    {
      sku: 'CAB-003',
      hsnCode: '8544',
      name: 'Polycab 4 sq.mm Solar DC Single-Core Cable UV Resistant (100m)',
      category: 'Cables & Wires',
      unit: 'Coil',
      costPrice: 4100,
      sellingPrice: 4950,
      gstRate: 18,
      minLevel: 25,
      preferredSupplierId: 'sup-1',
      targetQty: [48, 32, 28],
    },
    {
      sku: 'CAB-004',
      hsnCode: '8544',
      name: 'Finolex 1.5 sq.mm Multi-Strand Flame Retardant Wire (90m)',
      category: 'Cables & Wires',
      unit: 'Coil',
      costPrice: 1260,
      sellingPrice: 1580,
      gstRate: 18,
      minLevel: 50,
      preferredSupplierId: 'sup-6',
      targetQty: [140, 80, 75],
    },
    {
      sku: 'CAB-005',
      hsnCode: '8544',
      name: 'Polycab 3.5C × 50 sq.mm Aluminium Armoured Power Cable (100m)',
      category: 'Cables & Wires',
      unit: 'Drum',
      costPrice: 24800,
      sellingPrice: 29600,
      gstRate: 18,
      minLevel: 8,
      preferredSupplierId: 'sup-1',
      targetQty: [12, 8, 6],
    },
    {
      sku: 'CAB-006',
      hsnCode: '8544',
      name: 'Shielded Control Cable 12C × 1.5 sq.mm Copper (100m)',
      category: 'Cables & Wires',
      unit: 'Coil',
      costPrice: 9400,
      sellingPrice: 11500,
      gstRate: 18,
      minLevel: 15,
      preferredSupplierId: 'sup-1',
      targetQty: [22, 16, 12],
    },
    {
      sku: 'CAB-007',
      hsnCode: '8544',
      name: 'Industrial Cat6A Shielded Ethernet Cable 305m Box',
      category: 'Cables & Wires',
      unit: 'Box',
      costPrice: 7800,
      sellingPrice: 9450,
      gstRate: 18,
      minLevel: 18,
      preferredSupplierId: 'sup-6',
      targetQty: [30, 18, 14],
    },
    {
      sku: 'CAB-008',
      hsnCode: '8544',
      name: 'Submersible 3-Core Flat Cable 4 sq.mm Heavy Duty (100m)',
      category: 'Cables & Wires',
      unit: 'Coil',
      costPrice: 6850,
      sellingPrice: 8200,
      gstRate: 18,
      minLevel: 20,
      preferredSupplierId: 'sup-6',
      targetQty: [35, 22, 19],
    },

    // 2. Switchgear & Protection (8 items)
    {
      sku: 'SWG-001',
      hsnCode: '8536',
      name: 'Schneider Acti9 32A C-Curve Single Pole MCB 10kA',
      category: 'Switchgear & Protection',
      unit: 'Pcs',
      costPrice: 245,
      sellingPrice: 325,
      gstRate: 18,
      minLevel: 100,
      preferredSupplierId: 'sup-2',
      targetQty: [260, 180, 140],
    },
    {
      sku: 'SWG-002',
      hsnCode: '8536',
      name: 'Schneider Easy9 63A 4-Pole 30mA RCCB Earth Leakage Breaker',
      category: 'Switchgear & Protection',
      unit: 'Pcs',
      costPrice: 2650,
      sellingPrice: 3290,
      gstRate: 18,
      minLevel: 20,
      preferredSupplierId: 'sup-2',
      targetQty: [0, 0, 0], // OUT OF STOCK
    },
    {
      sku: 'SWG-003',
      hsnCode: '8536',
      name: 'L&T D-Sine 250A 3-Pole Thermal Magnetic MCCB 36kA',
      category: 'Switchgear & Protection',
      unit: 'Pcs',
      costPrice: 8900,
      sellingPrice: 10950,
      gstRate: 18,
      minLevel: 12,
      preferredSupplierId: 'sup-4',
      targetQty: [18, 12, 9],
    },
    {
      sku: 'SWG-004',
      hsnCode: '8536',
      name: 'L&T MNX 40A 3-Pole AC3 Power Contactor 240V Coil',
      category: 'Switchgear & Protection',
      unit: 'Pcs',
      costPrice: 1480,
      sellingPrice: 1890,
      gstRate: 18,
      minLevel: 35,
      preferredSupplierId: 'sup-4',
      targetQty: [65, 42, 30],
    },
    {
      sku: 'SWG-005',
      hsnCode: '8536',
      name: 'L&T 100A 3-Pole MCCB 36kA Fixed Thermal Release',
      category: 'Switchgear & Protection',
      unit: 'Pcs',
      costPrice: 4350,
      sellingPrice: 5400,
      gstRate: 18,
      minLevel: 18,
      preferredSupplierId: 'sup-4',
      targetQty: [7, 4, 2], // Total 13 <= 18 -> LOW
    },
    {
      sku: 'SWG-006',
      hsnCode: '8536',
      name: 'Type 1+2 AC Surge Protection Device 4-Pole 40kA',
      category: 'Switchgear & Protection',
      unit: 'Pcs',
      costPrice: 3100,
      sellingPrice: 3950,
      gstRate: 18,
      minLevel: 20,
      preferredSupplierId: 'sup-2',
      targetQty: [36, 20, 18],
    },
    {
      sku: 'SWG-007',
      hsnCode: '8536',
      name: 'Thermal Overload Relay 14–23A Direct Mounting',
      category: 'Switchgear & Protection',
      unit: 'Pcs',
      costPrice: 1120,
      sellingPrice: 1450,
      gstRate: 18,
      minLevel: 30,
      preferredSupplierId: 'sup-4',
      targetQty: [52, 34, 26],
    },
    {
      sku: 'SWG-008',
      hsnCode: '8536',
      name: '63A 4-Pole On-Load Changeover Switch with Enclosure',
      category: 'Switchgear & Protection',
      unit: 'Pcs',
      costPrice: 2890,
      sellingPrice: 3650,
      gstRate: 18,
      minLevel: 16,
      preferredSupplierId: 'sup-2',
      targetQty: [24, 15, 11],
    },

    // 3. Industrial Lighting (8 items — 12% GST slab for LED luminaires)
    {
      sku: 'LGT-001',
      hsnCode: '9405',
      name: 'Havells Endura 150W Industrial LED High Bay 5700K IP65',
      category: 'Industrial Lighting',
      unit: 'Pcs',
      costPrice: 4650,
      sellingPrice: 5890,
      gstRate: 12,
      minLevel: 24,
      preferredSupplierId: 'sup-3',
      targetQty: [8, 5, 3], // Total 16 <= 24 -> LOW
    },
    {
      sku: 'LGT-002',
      hsnCode: '9405',
      name: 'Havells 200W IP66 Industrial LED Floodlight Surge 10kV',
      category: 'Industrial Lighting',
      unit: 'Pcs',
      costPrice: 5200,
      sellingPrice: 6450,
      gstRate: 12,
      minLevel: 20,
      preferredSupplierId: 'sup-3',
      targetQty: [38, 24, 18],
    },
    {
      sku: 'LGT-003',
      hsnCode: '9405',
      name: '40W Vapour-Tight Waterproof LED Linear Batten 4ft IP65',
      category: 'Industrial Lighting',
      unit: 'Pcs',
      costPrice: 1180,
      sellingPrice: 1520,
      gstRate: 12,
      minLevel: 50,
      preferredSupplierId: 'sup-3',
      targetQty: [115, 70, 55],
    },
    {
      sku: 'LGT-004',
      hsnCode: '9405',
      name: 'Flameproof Ex-d Well Glass LED Luminaire 45W Zone 1/2',
      category: 'Industrial Lighting',
      unit: 'Pcs',
      costPrice: 6400,
      sellingPrice: 7950,
      gstRate: 12,
      minLevel: 12,
      preferredSupplierId: 'sup-3',
      targetQty: [19, 14, 10],
    },
    {
      sku: 'LGT-005',
      hsnCode: '9405',
      name: '90W LED Street Light Die-Cast Aluminium IP66',
      category: 'Industrial Lighting',
      unit: 'Pcs',
      costPrice: 2850,
      sellingPrice: 3600,
      gstRate: 12,
      minLevel: 25,
      preferredSupplierId: 'sup-3',
      targetQty: [44, 30, 22],
    },
    {
      sku: 'LGT-006',
      hsnCode: '9405',
      name: '36W Cleanroom 2×2 Recessed LED Panel Light 6500K',
      category: 'Industrial Lighting',
      unit: 'Pcs',
      costPrice: 1320,
      sellingPrice: 1690,
      gstRate: 12,
      minLevel: 40,
      preferredSupplierId: 'sup-3',
      targetQty: [88, 56, 44],
    },
    {
      sku: 'LGT-007',
      hsnCode: '9405',
      name: 'Industrial Emergency Exit LED Bulkhead 3-Hr Backup',
      category: 'Industrial Lighting',
      unit: 'Pcs',
      costPrice: 1450,
      sellingPrice: 1850,
      gstRate: 12,
      minLevel: 30,
      preferredSupplierId: 'sup-3',
      targetQty: [55, 36, 28],
    },
    {
      sku: 'LGT-008',
      hsnCode: '9405',
      name: '100W Industrial UFO High Bay LED Reflector 130 lm/W',
      category: 'Industrial Lighting',
      unit: 'Pcs',
      costPrice: 3450,
      sellingPrice: 4350,
      gstRate: 12,
      minLevel: 22,
      preferredSupplierId: 'sup-3',
      targetQty: [40, 26, 20],
    },

    // 4. Tools & Instruments (8 items)
    {
      sku: 'TLS-001',
      hsnCode: '9030',
      name: 'Fluke 376 FC True-RMS AC/DC Clamp Meter 1000A',
      category: 'Tools & Instruments',
      unit: 'Unit',
      costPrice: 28500,
      sellingPrice: 34900,
      gstRate: 18,
      minLevel: 6,
      preferredSupplierId: 'sup-5',
      targetQty: [9, 6, 4],
    },
    {
      sku: 'TLS-002',
      hsnCode: '9030',
      name: 'Digital Insulation Resistance Megger Tester 1000V',
      category: 'Tools & Instruments',
      unit: 'Unit',
      costPrice: 8200,
      sellingPrice: 10200,
      gstRate: 18,
      minLevel: 10,
      preferredSupplierId: 'sup-5',
      targetQty: [15, 11, 8],
    },
    {
      sku: 'TLS-003',
      hsnCode: '8203',
      name: 'Hydraulic Cable Lug Crimping Tool 16–300 sq.mm (12 Ton)',
      category: 'Tools & Instruments',
      unit: 'Set',
      costPrice: 4850,
      sellingPrice: 6150,
      gstRate: 18,
      minLevel: 10,
      preferredSupplierId: 'sup-5',
      targetQty: [0, 0, 0], // OUT OF STOCK
    },
    {
      sku: 'TLS-004',
      hsnCode: '8205',
      name: 'VDE 1000V Insulated Electrician Screwdriver Set (10 Pc)',
      category: 'Tools & Instruments',
      unit: 'Set',
      costPrice: 1650,
      sellingPrice: 2150,
      gstRate: 18,
      minLevel: 25,
      preferredSupplierId: 'sup-5',
      targetQty: [45, 30, 22],
    },
    {
      sku: 'TLS-005',
      hsnCode: '9025',
      name: 'Infrared Thermal Imaging Camera -20°C to 400°C Panel Audit',
      category: 'Tools & Instruments',
      unit: 'Unit',
      costPrice: 22400,
      sellingPrice: 27900,
      gstRate: 18,
      minLevel: 5,
      preferredSupplierId: 'sup-5',
      targetQty: [2, 1, 1], // Total 4 <= 5 -> LOW
    },
    {
      sku: 'TLS-006',
      hsnCode: '9030',
      name: 'Digital Earth Resistance & Soil Resistivity Tester Kit',
      category: 'Tools & Instruments',
      unit: 'Unit',
      costPrice: 6900,
      sellingPrice: 8650,
      gstRate: 18,
      minLevel: 8,
      preferredSupplierId: 'sup-5',
      targetQty: [13, 9, 7],
    },
    {
      sku: 'TLS-007',
      hsnCode: '8203',
      name: 'Heavy Duty Ratchet Armoured Cable Cutter up to 240 sq.mm',
      category: 'Tools & Instruments',
      unit: 'Pcs',
      costPrice: 2950,
      sellingPrice: 3750,
      gstRate: 18,
      minLevel: 14,
      preferredSupplierId: 'sup-5',
      targetQty: [24, 16, 12],
    },
    {
      sku: 'TLS-008',
      hsnCode: '8204',
      name: 'Calibrated Industrial Torque Wrench 20–100 Nm Busbar Kit',
      category: 'Tools & Instruments',
      unit: 'Unit',
      costPrice: 5400,
      sellingPrice: 6850,
      gstRate: 18,
      minLevel: 10,
      preferredSupplierId: 'sup-5',
      targetQty: [16, 10, 8],
    },

    // 5. Enclosures & Accessories (8 items — mix of 18% and 5% GST consumables)
    {
      sku: 'ENC-001',
      hsnCode: '8538',
      name: 'IP66 Powder-Coated Sheet Steel Wall Enclosure 600×400×210mm',
      category: 'Enclosures & Accessories',
      unit: 'Unit',
      costPrice: 3600,
      sellingPrice: 4550,
      gstRate: 18,
      minLevel: 16,
      preferredSupplierId: 'sup-7',
      targetQty: [28, 19, 14],
    },
    {
      sku: 'ENC-002',
      hsnCode: '8537',
      name: '8-Way TPN Double-Door Distribution Board IK09 IP43',
      category: 'Enclosures & Accessories',
      unit: 'Unit',
      costPrice: 2450,
      sellingPrice: 3150,
      gstRate: 18,
      minLevel: 20,
      preferredSupplierId: 'sup-7',
      targetQty: [34, 24, 18],
    },
    {
      sku: 'ENC-003',
      hsnCode: '8538',
      name: 'Weatherproof Polycarbonate IP67 Junction Box 200×150×100mm',
      category: 'Enclosures & Accessories',
      unit: 'Pcs',
      costPrice: 680,
      sellingPrice: 890,
      gstRate: 18,
      minLevel: 45,
      preferredSupplierId: 'sup-7',
      targetQty: [95, 62, 48],
    },
    {
      sku: 'ENC-004',
      hsnCode: '8536',
      name: 'Dowells Electrolytic Copper Tubular Lugs 50 sq.mm (Pack of 50)',
      category: 'Enclosures & Accessories',
      unit: 'Pack',
      costPrice: 1380,
      sellingPrice: 1790,
      gstRate: 18,
      minLevel: 30,
      preferredSupplierId: 'sup-8',
      targetQty: [10, 7, 4], // Total 21 <= 30 -> LOW
    },
    {
      sku: 'ENC-005',
      hsnCode: '7419',
      name: 'Double Compression Nickel-Plated Brass Cable Gland M32 (Pack 10)',
      category: 'Enclosures & Accessories',
      unit: 'Pack',
      costPrice: 1620,
      sellingPrice: 2090,
      gstRate: 18,
      minLevel: 25,
      preferredSupplierId: 'sup-8',
      targetQty: [42, 28, 20],
    },
    {
      sku: 'ENC-006',
      hsnCode: '3917',
      name: 'Heavy Gauge FR PVC Electrical Conduit 25mm (Bundle 25×3m)',
      category: 'Enclosures & Accessories',
      unit: 'Bundle',
      costPrice: 1850,
      sellingPrice: 2350,
      gstRate: 5,
      minLevel: 30,
      preferredSupplierId: 'sup-7',
      targetQty: [60, 42, 35],
    },
    {
      sku: 'ENC-007',
      hsnCode: '3926',
      name: 'UV-Stabilised Nylon 66 Cable Ties 300×4.8mm (Pack of 500)',
      category: 'Enclosures & Accessories',
      unit: 'Pack',
      costPrice: 420,
      sellingPrice: 560,
      gstRate: 5,
      minLevel: 60,
      preferredSupplierId: 'sup-8',
      targetQty: [130, 90, 70],
    },
    {
      sku: 'ENC-008',
      hsnCode: '8546',
      name: 'Industrial FR Electrical Insulation Tape 19mm×20m (Box of 30)',
      category: 'Enclosures & Accessories',
      unit: 'Box',
      costPrice: 690,
      sellingPrice: 890,
      gstRate: 5,
      minLevel: 40,
      preferredSupplierId: 'sup-8',
      targetQty: [85, 58, 46],
    },
  ];

  const items: Item[] = catalogSpecs.map((spec, idx) => ({
    id: `itm-${String(idx + 1).padStart(2, '0')}`,
    sku: spec.sku,
    hsnCode: spec.hsnCode,
    name: spec.name,
    category: spec.category,
    unit: spec.unit,
    costPrice: spec.costPrice,
    sellingPrice: spec.sellingPrice,
    gstRate: spec.gstRate as GstSlab,
    minLevel: spec.minLevel,
    preferredSupplierId: spec.preferredSupplierId,
  }));

  const godownById = new Map(godowns.map((g) => [g.id, g]));
  const itemById = new Map(items.map((it) => [it.id, it]));
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));
  const customerById = new Map(customers.map((c) => [c.id, c]));

  // Start stock at targetQty for each (item, godown)
  const stockMap = new Map<string, number>();
  const keyOf = (itemId: string, godownId: string) => `${itemId}::${godownId}`;

  catalogSpecs.forEach((spec, idx) => {
    const itemId = items[idx].id;
    stockMap.set(keyOf(itemId, 'gd-1'), spec.targetQty[0]);
    stockMap.set(keyOf(itemId, 'gd-2'), spec.targetQty[1]);
    stockMap.set(keyOf(itemId, 'gd-3'), spec.targetQty[2]);
  });

  const stockLevels: StockLevel[] = [];
  for (const it of items) {
    for (const gd of godowns) {
      stockLevels.push({
        itemId: it.id,
        godownId: gd.id,
        qty: stockMap.get(keyOf(it.id, gd.id)) ?? 0,
      });
    }
  }

  // Build 15 Purchase Orders across last 90 days (10 RECEIVED, 4 PENDING, 1 CANCELLED)
  const poBlueprints: Array<{
    daysAgo: number;
    supplierId: string;
    godownId: string;
    status: PurchaseOrderStatus;
    expectedOffsetDays: number;
    notes: string;
    lines: Array<{ itemIdx: number; qty: number }>;
  }> = [
    { daysAgo: 84, supplierId: 'sup-1', godownId: 'gd-1', status: 'RECEIVED', expectedOffsetDays: -80, notes: 'Q3 cable restock for EPC projects', lines: [{ itemIdx: 0, qty: 18 }, { itemIdx: 2, qty: 35 }, { itemIdx: 4, qty: 10 }] },
    { daysAgo: 76, supplierId: 'sup-2', godownId: 'gd-2', status: 'RECEIVED', expectedOffsetDays: -71, notes: 'Acti9 MCB & SPD batch', lines: [{ itemIdx: 8, qty: 180 }, { itemIdx: 13, qty: 24 }] },
    { daysAgo: 68, supplierId: 'sup-3', godownId: 'gd-1', status: 'RECEIVED', expectedOffsetDays: -62, notes: 'Warehouse high-bay luminaires', lines: [{ itemIdx: 16, qty: 30 }, { itemIdx: 17, qty: 28 }, { itemIdx: 18, qty: 80 }] },
    { daysAgo: 59, supplierId: 'sup-4', godownId: 'gd-3', status: 'RECEIVED', expectedOffsetDays: -56, notes: 'MCCB & contactor replenishment', lines: [{ itemIdx: 10, qty: 14 }, { itemIdx: 11, qty: 45 }, { itemIdx: 12, qty: 18 }] },
    { daysAgo: 51, supplierId: 'sup-5', godownId: 'gd-1', status: 'RECEIVED', expectedOffsetDays: -46, notes: 'Precision calibration tools order', lines: [{ itemIdx: 24, qty: 8 }, { itemIdx: 25, qty: 14 }, { itemIdx: 27, qty: 35 }] },
    { daysAgo: 43, supplierId: 'sup-6', godownId: 'gd-2', status: 'RECEIVED', expectedOffsetDays: -40, notes: 'FR building wire & Cat6A restock', lines: [{ itemIdx: 1, qty: 90 }, { itemIdx: 3, qty: 110 }, { itemIdx: 6, qty: 24 }] },
    { daysAgo: 35, supplierId: 'sup-7', godownId: 'gd-1', status: 'RECEIVED', expectedOffsetDays: -28, notes: 'IP66 enclosures & TPN DBs', lines: [{ itemIdx: 32, qty: 24 }, { itemIdx: 33, qty: 28 }, { itemIdx: 37, qty: 50 }] },
    { daysAgo: 27, supplierId: 'sup-8', godownId: 'gd-3', status: 'RECEIVED', expectedOffsetDays: -23, notes: 'Brass cable glands & copper lugs', lines: [{ itemIdx: 35, qty: 30 }, { itemIdx: 36, qty: 35 }, { itemIdx: 38, qty: 80 }] },
    { daysAgo: 21, supplierId: 'sup-3', godownId: 'gd-2', status: 'CANCELLED', expectedOffsetDays: -15, notes: 'Superseded by consolidated tender PO', lines: [{ itemIdx: 19, qty: 15 }, { itemIdx: 20, qty: 20 }] },
    { daysAgo: 17, supplierId: 'sup-1', godownId: 'gd-1', status: 'RECEIVED', expectedOffsetDays: -13, notes: 'Control cable & flat submersible refill', lines: [{ itemIdx: 5, qty: 20 }, { itemIdx: 7, qty: 25 }] },
    { daysAgo: 11, supplierId: 'sup-4', godownId: 'gd-2', status: 'RECEIVED', expectedOffsetDays: -8, notes: 'Relay & changeover stock', lines: [{ itemIdx: 14, qty: 40 }, { itemIdx: 15, qty: 20 }] },
    // 4 Pending POs ready for workflow demonstration (including low/out-of-stock SKUs!)
    { daysAgo: 5, supplierId: 'sup-2', godownId: 'gd-1', status: 'PENDING', expectedOffsetDays: 2, notes: 'Urgent restock for out-of-stock 63A RCCBs', lines: [{ itemIdx: 9, qty: 35 }, { itemIdx: 8, qty: 60 }] },
    { daysAgo: 4, supplierId: 'sup-5', godownId: 'gd-1', status: 'PENDING', expectedOffsetDays: 3, notes: 'Replenish hydraulic crimpers & thermal cameras', lines: [{ itemIdx: 26, qty: 16 }, { itemIdx: 28, qty: 6 }] },
    { daysAgo: 2, supplierId: 'sup-1', godownId: 'gd-2', status: 'PENDING', expectedOffsetDays: 4, notes: 'Armoured 4C×16 cable restock for Pune EPC', lines: [{ itemIdx: 0, qty: 15 }, { itemIdx: 2, qty: 20 }] },
    { daysAgo: 1, supplierId: 'sup-3', godownId: 'gd-3', status: 'PENDING', expectedOffsetDays: 5, notes: '150W High Bay LED & Floodlight dispatch', lines: [{ itemIdx: 16, qty: 25 }, { itemIdx: 23, qty: 18 }] },
  ];

  const purchaseOrders: PurchaseOrder[] = poBlueprints.map((bp, index) => {
    const poNumber = `PO-2627-${String(index + 101).padStart(4, '0')}`;
    const supplier = supplierById.get(bp.supplierId)!;
    const godown = godownById.get(bp.godownId)!;
    const lines: PurchaseOrderLine[] = bp.lines.map((ln, lineIdx) => {
      const item = items[ln.itemIdx];
      const calc = calculateLineTotals({
        qty: ln.qty,
        unitPrice: item.costPrice,
        gstRate: item.gstRate,
      });
      return {
        id: `pol-${index + 1}-${lineIdx + 1}`,
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        unit: item.unit,
        qty: ln.qty,
        unitCost: item.costPrice,
        gstRate: item.gstRate,
        taxableAmount: calc.taxableAmount,
        gstAmount: calc.gstAmount,
        lineTotal: calc.lineTotal,
      };
    });
    const totals = calculateOrderTotals(
      lines.map((l) => ({ qty: l.qty, unitPrice: l.unitCost, gstRate: l.gstRate })),
    );
    const orderDate = daysAgoIso(bp.daysAgo, 9);
    const expectedDate =
      bp.expectedOffsetDays >= 0
        ? daysAheadIso(bp.expectedOffsetDays)
        : daysAgoIso(Math.abs(bp.expectedOffsetDays), 16);
    const receivedDate =
      bp.status === 'RECEIVED' ? daysAgoIso(Math.max(1, bp.daysAgo - 3), 15) : null;

    return {
      id: `po-${index + 1}`,
      poNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      godownId: godown.id,
      godownName: godown.name,
      orderDate,
      expectedDate,
      receivedDate,
      status: bp.status,
      ...totals,
      notes: bp.notes,
      lines,
    };
  });

  // Build 25 Sales Orders across last 90 days
  const soBlueprints: Array<{
    daysAgo: number;
    customerId: string;
    godownId: string;
    status: SalesOrderStatus;
    paymentStatus: PaymentStatus;
    notes: string;
    lines: Array<{ itemIdx: number; qty: number }>;
  }> = [
    { daysAgo: 86, customerId: 'cus-1', godownId: 'gd-1', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Bandra substation cable lot', lines: [{ itemIdx: 0, qty: 6 }, { itemIdx: 1, qty: 28 }] },
    { daysAgo: 81, customerId: 'cus-2', godownId: 'gd-2', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Forging bay switchgear upgrade', lines: [{ itemIdx: 8, qty: 45 }, { itemIdx: 10, qty: 4 }] },
    { daysAgo: 74, customerId: 'cus-3', godownId: 'gd-3', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Sanand plant LED bay retrofit', lines: [{ itemIdx: 16, qty: 14 }, { itemIdx: 18, qty: 30 }] },
    { daysAgo: 69, customerId: 'cus-4', godownId: 'gd-1', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Panel shop monthly stock', lines: [{ itemIdx: 11, qty: 16 }, { itemIdx: 32, qty: 8 }, { itemIdx: 35, qty: 15 }] },
    { daysAgo: 63, customerId: 'cus-5', godownId: 'gd-2', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Chakan factory distribution boards', lines: [{ itemIdx: 33, qty: 10 }, { itemIdx: 37, qty: 18 }] },
    { daysAgo: 58, customerId: 'cus-6', godownId: 'gd-3', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'MCC panel assembly supplies', lines: [{ itemIdx: 12, qty: 6 }, { itemIdx: 14, qty: 14 }, { itemIdx: 36, qty: 12 }] },
    { daysAgo: 52, customerId: 'cus-7', godownId: 'gd-1', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Cold storage waterproof lighting', lines: [{ itemIdx: 17, qty: 12 }, { itemIdx: 18, qty: 24 }, { itemIdx: 22, qty: 14 }] },
    { daysAgo: 47, customerId: 'cus-8', godownId: 'gd-3', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Spinning unit power cables', lines: [{ itemIdx: 4, qty: 4 }, { itemIdx: 7, qty: 10 }] },
    { daysAgo: 42, customerId: 'cus-9', godownId: 'gd-1', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Commercial tower MEP wiring', lines: [{ itemIdx: 1, qty: 35 }, { itemIdx: 3, qty: 45 }, { itemIdx: 6, qty: 10 }] },
    { daysAgo: 38, customerId: 'cus-10', godownId: 'gd-2', status: 'CANCELLED', paymentStatus: 'UNPAID', notes: 'Customer revised BOM to 400A rating', lines: [{ itemIdx: 10, qty: 3 }, { itemIdx: 15, qty: 5 }] },
    { daysAgo: 34, customerId: 'cus-11', godownId: 'gd-3', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Solar DC string cable dispatch', lines: [{ itemIdx: 2, qty: 22 }, { itemIdx: 13, qty: 10 }, { itemIdx: 24, qty: 2 }] },
    { daysAgo: 30, customerId: 'cus-12', godownId: 'gd-1', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Logistics warehouse lighting phase 2', lines: [{ itemIdx: 16, qty: 12 }, { itemIdx: 20, qty: 15 }, { itemIdx: 23, qty: 10 }] },
    { daysAgo: 26, customerId: 'cus-1', godownId: 'gd-1', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Express armoured feeder dispatch', lines: [{ itemIdx: 0, qty: 5 }, { itemIdx: 5, qty: 8 }, { itemIdx: 26, qty: 4 }] },
    { daysAgo: 23, customerId: 'cus-2', godownId: 'gd-2', status: 'FULFILLED', paymentStatus: 'PARTIAL', notes: 'Maintenance audit toolkit & relays', lines: [{ itemIdx: 24, qty: 2 }, { itemIdx: 25, qty: 4 }, { itemIdx: 28, qty: 2 }] },
    { daysAgo: 19, customerId: 'cus-3', godownId: 'gd-3', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Hazardous zone flameproof fixtures', lines: [{ itemIdx: 19, qty: 8 }, { itemIdx: 34, qty: 25 }] },
    { daysAgo: 16, customerId: 'cus-4', godownId: 'gd-1', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Copper lugs & gland bulk order', lines: [{ itemIdx: 35, qty: 18 }, { itemIdx: 36, qty: 14 }, { itemIdx: 38, qty: 35 }] },
    { daysAgo: 13, customerId: 'cus-5', godownId: 'gd-2', status: 'FULFILLED', paymentStatus: 'PARTIAL', notes: 'Assembly line switchgear lot', lines: [{ itemIdx: 8, qty: 40 }, { itemIdx: 12, qty: 5 }, { itemIdx: 31, qty: 4 }] },
    { daysAgo: 10, customerId: 'cus-6', godownId: 'gd-3', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Enclosures & busbar torque tools', lines: [{ itemIdx: 32, qty: 7 }, { itemIdx: 29, qty: 3 }, { itemIdx: 30, qty: 6 }] },
    { daysAgo: 8, customerId: 'cus-9', godownId: 'gd-1', status: 'FULFILLED', paymentStatus: 'UNPAID', notes: 'MEP Phase 3 lighting & panels', lines: [{ itemIdx: 21, qty: 28 }, { itemIdx: 1, qty: 24 }, { itemIdx: 39, qty: 25 }] },
    { daysAgo: 6, customerId: 'cus-7', godownId: 'gd-1', status: 'FULFILLED', paymentStatus: 'PAID', notes: 'Cold room backup lighting & MCBs', lines: [{ itemIdx: 22, qty: 12 }, { itemIdx: 8, qty: 30 }] },
    { daysAgo: 4, customerId: 'cus-11', godownId: 'gd-3', status: 'FULFILLED', paymentStatus: 'PARTIAL', notes: 'Inverter station SPD & solar wire', lines: [{ itemIdx: 2, qty: 14 }, { itemIdx: 13, qty: 8 }] },
    { daysAgo: 3, customerId: 'cus-1', godownId: 'gd-1', status: 'CONFIRMED', paymentStatus: 'UNPAID', notes: 'Scheduled Monday site delivery', lines: [{ itemIdx: 4, qty: 3 }, { itemIdx: 11, qty: 12 }, { itemIdx: 37, qty: 15 }] },
    { daysAgo: 2, customerId: 'cus-8', godownId: 'gd-2', status: 'FULFILLED', paymentStatus: 'UNPAID', notes: 'Urgent textile utility replacement', lines: [{ itemIdx: 15, qty: 6 }, { itemIdx: 16, qty: 6 }] },
    { daysAgo: 1, customerId: 'cus-10', godownId: 'gd-2', status: 'CONFIRMED', paymentStatus: 'UNPAID', notes: 'Automation panel wire & lugs', lines: [{ itemIdx: 3, qty: 20 }, { itemIdx: 27, qty: 8 }] },
    { daysAgo: 0, customerId: 'cus-12', godownId: 'gd-1', status: 'DRAFT', paymentStatus: 'UNPAID', notes: 'Proforma quote awaiting PO sign-off', lines: [{ itemIdx: 17, qty: 8 }, { itemIdx: 33, qty: 6 }, { itemIdx: 38, qty: 20 }] },
  ];

  const salesOrders: SalesOrder[] = soBlueprints.map((bp, index) => {
    const invoiceNumber = `INV-2627-${String(index + 201).padStart(4, '0')}`;
    const customer = customerById.get(bp.customerId)!;
    const godown = godownById.get(bp.godownId)!;
    const lines: SalesOrderLine[] = bp.lines.map((ln, lineIdx) => {
      const item = items[ln.itemIdx];
      const calc = calculateLineTotals({
        qty: ln.qty,
        unitPrice: item.sellingPrice,
        gstRate: item.gstRate,
      });
      return {
        id: `sol-${index + 1}-${lineIdx + 1}`,
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        unit: item.unit,
        qty: ln.qty,
        unitPrice: item.sellingPrice,
        gstRate: item.gstRate,
        taxableAmount: calc.taxableAmount,
        gstAmount: calc.gstAmount,
        lineTotal: calc.lineTotal,
      };
    });
    const totals = calculateOrderTotals(
      lines.map((l) => ({ qty: l.qty, unitPrice: l.unitPrice, gstRate: l.gstRate })),
    );
    const orderDate = daysAgoIso(bp.daysAgo, 11);
    const fulfilledDate =
      bp.status === 'FULFILLED' ? daysAgoIso(bp.daysAgo, 15) : null;
    const cancelledDate =
      bp.status === 'CANCELLED' ? daysAgoIso(Math.max(0, bp.daysAgo - 1), 14) : null;

    return {
      id: `so-${index + 1}`,
      invoiceNumber,
      customerId: customer.id,
      customerName: customer.name,
      godownId: godown.id,
      godownName: godown.name,
      orderDate,
      fulfilledDate,
      cancelledDate,
      status: bp.status,
      paymentStatus: bp.paymentStatus,
      ...totals,
      notes: bp.notes,
      lines,
    };
  });

  // Construct coherent, append-only StockMovements that end at exact current stockLevels
  const stockMovements: StockMovement[] = [];
  let mvCounter = 1;
  const nextMvId = () => `mv-${String(mvCounter++).padStart(4, '0')}`;

  // Collect chronological movement events from RECEIVED POs, FULFILLED/CANCELLED SOs, and 2 inter-godown transfers
  interface RawEvent {
    itemId: string;
    godownId: string;
    type: StockMovement['type'];
    qtyDelta: number;
    referenceType: StockMovement['referenceType'];
    referenceId: string;
    referenceNumber: string;
    reason: string;
    createdAt: string;
  }

  const events: RawEvent[] = [];

  for (const po of purchaseOrders) {
    if (po.status === 'RECEIVED' && po.receivedDate) {
      for (const line of po.lines) {
        events.push({
          itemId: line.itemId,
          godownId: po.godownId,
          type: 'PURCHASE_IN',
          qtyDelta: line.qty,
          referenceType: 'PO',
          referenceId: po.id,
          referenceNumber: po.poNumber,
          reason: `Received from ${po.supplierName}`,
          createdAt: po.receivedDate,
        });
      }
    }
  }

  for (const so of salesOrders) {
    if (so.status === 'FULFILLED' && so.fulfilledDate) {
      for (const line of so.lines) {
        events.push({
          itemId: line.itemId,
          godownId: so.godownId,
          type: 'SALE_OUT',
          qtyDelta: -line.qty,
          referenceType: 'SO',
          referenceId: so.id,
          referenceNumber: so.invoiceNumber,
          reason: `Dispatched to ${so.customerName}`,
          createdAt: so.fulfilledDate,
        });
      }
    } else if (so.status === 'CANCELLED' && so.cancelledDate) {
      for (const line of so.lines) {
        events.push({
          itemId: line.itemId,
          godownId: so.godownId,
          type: 'SALE_OUT',
          qtyDelta: -line.qty,
          referenceType: 'SO',
          referenceId: so.id,
          referenceNumber: so.invoiceNumber,
          reason: `Initial dispatch for ${so.customerName}`,
          createdAt: so.orderDate,
        });
        events.push({
          itemId: line.itemId,
          godownId: so.godownId,
          type: 'SALE_CANCEL_REVERSAL',
          qtyDelta: line.qty,
          referenceType: 'SO',
          referenceId: so.id,
          referenceNumber: so.invoiceNumber,
          reason: `Reversal — order cancelled (${so.notes})`,
          createdAt: so.cancelledDate,
        });
      }
    }
  }

  // Add 2 realistic inter-godown transfers
  const transferDate1 = daysAgoIso(9, 13);
  events.push(
    {
      itemId: items[1].id,
      godownId: 'gd-1',
      type: 'TRANSFER_OUT',
      qtyDelta: -20,
      referenceType: 'TRANSFER',
      referenceId: 'trf-101',
      referenceNumber: 'TRF-2627-0101',
      reason: 'Rebalanced to Pune Chakan Hub for automotive shutdown',
      createdAt: transferDate1,
    },
    {
      itemId: items[1].id,
      godownId: 'gd-2',
      type: 'TRANSFER_IN',
      qtyDelta: 20,
      referenceType: 'TRANSFER',
      referenceId: 'trf-101',
      referenceNumber: 'TRF-2627-0101',
      reason: 'Received from Bhiwandi Main Godown',
      createdAt: transferDate1,
    },
  );

  const transferDate2 = daysAgoIso(3, 16);
  events.push(
    {
      itemId: items[8].id,
      godownId: 'gd-1',
      type: 'TRANSFER_OUT',
      qtyDelta: -30,
      referenceType: 'TRANSFER',
      referenceId: 'trf-102',
      referenceNumber: 'TRF-2627-0102',
      reason: 'Stock transfer to Ahmedabad GIDC Depot',
      createdAt: transferDate2,
    },
    {
      itemId: items[8].id,
      godownId: 'gd-3',
      type: 'TRANSFER_IN',
      qtyDelta: 30,
      referenceType: 'TRANSFER',
      referenceId: 'trf-102',
      referenceNumber: 'TRF-2627-0102',
      reason: 'Received from Bhiwandi Main Godown',
      createdAt: transferDate2,
    },
  );

  events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Compute net delta per (item, godown) to back-calculate opening stock so running balance matches final stockMap
  const netDeltaByKey = new Map<string, number>();
  for (const ev of events) {
    const k = keyOf(ev.itemId, ev.godownId);
    netDeltaByKey.set(k, (netDeltaByKey.get(k) ?? 0) + ev.qtyDelta);
  }

  const runningByKey = new Map<string, number>();
  const openingIso = daysAgoIso(92, 8);

  for (const it of items) {
    for (const gd of godowns) {
      const k = keyOf(it.id, gd.id);
      const finalQty = stockMap.get(k) ?? 0;
      const netDelta = netDeltaByKey.get(k) ?? 0;
      const openingQty = Math.max(0, finalQty - netDelta);
      runningByKey.set(k, openingQty);

      if (openingQty > 0) {
        stockMovements.push({
          id: nextMvId(),
          itemId: it.id,
          sku: it.sku,
          itemName: it.name,
          godownId: gd.id,
          godownName: gd.name,
          type: 'ADJUSTMENT',
          qtyDelta: openingQty,
          balanceAfter: openingQty,
          referenceType: 'ADJUSTMENT',
          referenceId: `open-${it.id}-${gd.id}`,
          referenceNumber: 'OPEN-FY26',
          reason: 'Opening FY26 audited inventory count',
          createdAt: openingIso,
        });
      }
    }
  }

  for (const ev of events) {
    const k = keyOf(ev.itemId, ev.godownId);
    const prev = runningByKey.get(k) ?? 0;
    const next = Math.max(0, prev + ev.qtyDelta);
    runningByKey.set(k, next);
    const item = itemById.get(ev.itemId)!;
    const godown = godownById.get(ev.godownId)!;

    stockMovements.push({
      id: nextMvId(),
      itemId: ev.itemId,
      sku: item.sku,
      itemName: item.name,
      godownId: ev.godownId,
      godownName: godown.name,
      type: ev.type,
      qtyDelta: ev.qtyDelta,
      balanceAfter: next,
      referenceType: ev.referenceType,
      referenceId: ev.referenceId,
      referenceNumber: ev.referenceNumber,
      reason: ev.reason,
      createdAt: ev.createdAt,
    });
  }

  // Sync stockLevels strictly to exact final running balances so audit ledger & stock match 100%
  for (const sl of stockLevels) {
    const k = keyOf(sl.itemId, sl.godownId);
    const expected = stockMap.get(k) ?? 0;
    const actual = runningByKey.get(k) ?? 0;
    if (actual !== expected) {
      const diff = expected - actual;
      const item = itemById.get(sl.itemId)!;
      const godown = godownById.get(sl.godownId)!;
      stockMovements.push({
        id: nextMvId(),
        itemId: sl.itemId,
        sku: item.sku,
        itemName: item.name,
        godownId: sl.godownId,
        godownName: godown.name,
        type: 'ADJUSTMENT',
        qtyDelta: diff,
        balanceAfter: expected,
        referenceType: 'ADJUSTMENT',
        referenceId: `reconcile-${sl.itemId}-${sl.godownId}`,
        referenceNumber: 'CYCLE-CNT',
        reason: 'Quarterly physical cycle-count reconciliation',
        createdAt: daysAgoIso(14, 17),
      });
      runningByKey.set(k, expected);
    }
  }

  // Recent Activity Logs derived from newest orders & transfers
  const activityLogs: ActivityLog[] = [
    {
      id: 'act-1',
      type: 'SALE_CREATED',
      title: `Draft invoice ${salesOrders[24].invoiceNumber}`,
      description: `Proforma created for ${salesOrders[24].customerName}`,
      referenceType: 'SO',
      referenceId: salesOrders[24].id,
      createdAt: salesOrders[24].orderDate,
    },
    {
      id: 'act-2',
      type: 'PO_CREATED',
      title: `Purchase order ${purchaseOrders[14].poNumber} raised`,
      description: `43 lighting units ordered from ${purchaseOrders[14].supplierName}`,
      referenceType: 'PO',
      referenceId: purchaseOrders[14].id,
      createdAt: purchaseOrders[14].orderDate,
    },
    {
      id: 'act-3',
      type: 'SALE_FULFILLED',
      title: `Dispatched ${salesOrders[22].invoiceNumber}`,
      description: `Fulfilled 12 units from ${salesOrders[22].godownName} to ${salesOrders[22].customerName}`,
      referenceType: 'SO',
      referenceId: salesOrders[22].id,
      createdAt: salesOrders[22].fulfilledDate ?? salesOrders[22].orderDate,
    },
    {
      id: 'act-4',
      type: 'TRANSFER',
      title: 'Inter-godown transfer TRF-2627-0102',
      description: 'Moved 30 pcs of SWG-001 from Bhiwandi Main to Ahmedabad GIDC Depot',
      referenceType: 'GODOWN',
      referenceId: 'gd-3',
      createdAt: transferDate2,
    },
    {
      id: 'act-5',
      type: 'PO_CREATED',
      title: `Restock PO ${purchaseOrders[11].poNumber} pending`,
      description: `Awaiting 95 switchgear units from ${purchaseOrders[11].supplierName}`,
      referenceType: 'PO',
      referenceId: purchaseOrders[11].id,
      createdAt: purchaseOrders[11].orderDate,
    },
    {
      id: 'act-6',
      type: 'SALE_FULFILLED',
      title: `Dispatched ${salesOrders[20].invoiceNumber}`,
      description: `Solar DC cables & SPDs shipped to ${salesOrders[20].customerName}`,
      referenceType: 'SO',
      referenceId: salesOrders[20].id,
      createdAt: salesOrders[20].fulfilledDate ?? salesOrders[20].orderDate,
    },
    {
      id: 'act-7',
      type: 'PURCHASE_RECEIVED',
      title: `Received ${purchaseOrders[10].poNumber}`,
      description: `+60 units received into ${purchaseOrders[10].godownName}`,
      referenceType: 'PO',
      referenceId: purchaseOrders[10].id,
      createdAt: purchaseOrders[10].receivedDate ?? purchaseOrders[10].orderDate,
    },
    {
      id: 'act-8',
      type: 'TRANSFER',
      title: 'Inter-godown transfer TRF-2627-0101',
      description: 'Moved 20 coils of CAB-002 from Bhiwandi Main to Pune Chakan Hub',
      referenceType: 'GODOWN',
      referenceId: 'gd-2',
      createdAt: transferDate1,
    },
  ];

  return {
    godowns,
    suppliers,
    customers,
    items,
    stockLevels,
    purchaseOrders,
    salesOrders,
    stockMovements,
    activityLogs,
  };
}
