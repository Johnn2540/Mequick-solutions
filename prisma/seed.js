// One-off script — not part of the request/response lifecycle, so it's
// fine to use its own top-level await flow here (unlike route handlers).
// Run with: npm run seed  (or `npx prisma db seed`)
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const slugify = require('../utils/slugify');

function placeholderImage(label, size = '600x400') {
  return `https://placehold.co/${size}/1f95d3/ffffff?text=${encodeURIComponent(label)}`;
}

const CATEGORIES = [
  {
    name: 'Theatre & ICU Equipment',
    description: 'Operating theatre and intensive care equipment for critical patient monitoring and life support.',
  },
  {
    name: 'Maternity Equipment',
    description: 'Delivery, neonatal, and maternity ward equipment for maternal and infant care.',
  },
  {
    name: 'Laboratory Equipment & Reagents',
    description: 'Diagnostic analyzers, microscopes, and lab instruments for clinical and research laboratories.',
  },
  {
    name: 'Dental Equipment',
    description: 'Dental chairs, imaging, and instruments for modern dental practices.',
  },
  {
    name: 'Imaging Equipment',
    description: 'X-ray, ultrasound, and fluoroscopy systems for diagnostic imaging.',
  },
  {
    name: 'Surgical Instruments',
    description: 'Precision surgical instrument sets and electrosurgical equipment.',
  },
  {
    name: 'Medical Consumables',
    description: 'Syringes, cannulas, sutures, and other single-use clinical consumables.',
  },
  {
    name: 'Laboratory Consumables',
    description: 'Test tubes, slides, pipette tips, and other lab consumables.',
  },
  {
    name: 'Medical Gloves',
    description: 'Nitrile, latex, and vinyl gloves for examination and surgical use.',
  },
  {
    name: 'Medical Safety Products',
    description: 'Sharps disposal, biohazard waste handling, and clinical safety equipment.',
  },
  {
    name: 'Personal Protective Equipment (PPE)',
    description: 'Isolation gowns, respirator masks, and face shields for infection control.',
  },
  {
    name: 'Hospital Furniture',
    description: 'Hospital beds, cabinets, and mobility aids for wards and clinics.',
  },
  {
    name: 'Emergency Equipment',
    description: 'Defibrillators, resuscitation trolleys, and emergency response equipment.',
  },
];

const BRANDS = [
  'Mindray',
  'Philips Healthcare',
  'Drager',
  'Bistos',
  'GE Healthcare',
  'Olympus',
  'Sirona',
  'Woodpecker',
  'Siemens Healthineers',
  'B.Braun',
  'Covidien',
  'Karl Storz',
  'BD',
  'Ethicon',
  'Eppendorf',
  'Ansell',
  '3M',
];

const PRODUCTS = [
  // Theatre & ICU Equipment
  { category: 'Theatre & ICU Equipment', brand: 'Mindray', name: 'Multi-Parameter ICU Patient Monitor', sku: 'TIC-001', price: 185000, availability: 'IN_STOCK', description: 'ICU-grade patient monitor tracking ECG, SpO2, NIBP, and temperature in real time.', specifications: 'Display: 15" touchscreen\nParameters: ECG, SpO2, NIBP, Temp, Resp\nBattery backup: 4 hours\nWarranty: 2 years' },
  { category: 'Theatre & ICU Equipment', brand: 'Philips Healthcare', name: 'LED Operating Theatre Light (Ceiling Mounted)', sku: 'TIC-002', price: 320000, availability: 'IN_STOCK', description: 'Shadow-free ceiling-mounted LED surgical light for operating theatres.', specifications: 'Light source: LED\nIlluminance: 160,000 lux\nColor temperature: 3500-4500K\nMounting: Ceiling' },
  { category: 'Theatre & ICU Equipment', brand: 'Drager', name: 'ICU Ventilator (Invasive/Non-Invasive)', sku: 'TIC-003', price: 950000, availability: 'PREORDER', featured: true, description: 'Advanced ventilator supporting both invasive and non-invasive ventilation modes.', specifications: 'Modes: VCV, PCV, SIMV, CPAP\nTidal volume: 20-2000mL\nDisplay: Color touchscreen\nWarranty: 2 years' },

  // Maternity Equipment
  { category: 'Maternity Equipment', brand: 'Bistos', name: 'Handheld Fetal Doppler', sku: 'MAT-001', price: 8500, availability: 'IN_STOCK', description: 'Portable fetal heart rate monitor for antenatal checkups.', specifications: 'Display: LCD digital readout\nProbe frequency: 3MHz\nBattery: Rechargeable Li-ion' },
  { category: 'Maternity Equipment', name: 'Electric Delivery Bed (Adjustable)', sku: 'MAT-002', price: 145000, availability: 'IN_STOCK', description: 'Adjustable electric delivery bed with stirrups and drainage system.', specifications: 'Frame: Stainless steel\nAdjustment: Electric motor\nMax load: 180kg' },
  { category: 'Maternity Equipment', brand: 'GE Healthcare', name: 'Infant Radiant Warmer', sku: 'MAT-003', price: 210000, availability: 'IN_STOCK', featured: true, description: 'Radiant warmer providing controlled thermal support for newborns.', specifications: 'Heater: Quartz radiant\nControl: Servo & manual mode\nAlarm: Skin temp deviation' },

  // Laboratory Equipment & Reagents
  { category: 'Laboratory Equipment & Reagents', brand: 'Mindray', name: 'Semi-Automated Chemistry Analyzer', sku: 'LAB-001', price: 680000, availability: 'IN_STOCK', featured: true, description: 'Semi-automated clinical chemistry analyzer for routine biochemistry testing.', specifications: 'Throughput: 200 tests/hour\nWavelengths: 8\nMemory: 500 results' },
  { category: 'Laboratory Equipment & Reagents', brand: 'Olympus', name: 'Binocular Compound Microscope', sku: 'LAB-002', price: 45000, availability: 'IN_STOCK', description: 'Binocular microscope for routine clinical and educational microscopy.', specifications: 'Magnification: 40x-1000x\nIllumination: LED\nHead: Binocular, 30° inclined' },
  { category: 'Laboratory Equipment & Reagents', name: 'Benchtop Centrifuge (12-Place)', sku: 'LAB-003', price: 38000, availability: 'IN_STOCK', description: 'Benchtop centrifuge for serum and plasma separation.', specifications: 'Capacity: 12 x 15mL tubes\nMax speed: 4000rpm\nTimer: 0-99 min' },

  // Dental Equipment
  { category: 'Dental Equipment', brand: 'Sirona', name: 'Complete Dental Chair Unit', sku: 'DEN-001', price: 550000, availability: 'PREORDER', featured: true, description: 'Fully integrated dental chair unit with delivery system and LED light.', specifications: 'Movement: Electro-hydraulic\nUpholstery: Synthetic leather\nIncludes: Spittoon, LED light, delivery unit' },
  { category: 'Dental Equipment', name: 'Portable Dental X-Ray Unit', sku: 'DEN-002', price: 175000, availability: 'IN_STOCK', description: 'Portable, handheld dental X-ray unit for chairside imaging.', specifications: 'Tube voltage: 60kV\nWeight: 1.8kg\nBattery: Lithium rechargeable' },
  { category: 'Dental Equipment', brand: 'Woodpecker', name: 'Ultrasonic Dental Scaler', sku: 'DEN-003', price: 22000, availability: 'IN_STOCK', description: 'Ultrasonic scaler for plaque and calculus removal.', specifications: 'Frequency: 28-32kHz\nPower: LED-illuminated handpiece\nWater supply: Built-in' },

  // Imaging Equipment
  { category: 'Imaging Equipment', brand: 'Siemens Healthineers', name: 'Digital X-Ray Machine', sku: 'IMG-001', price: 2400000, availability: 'PREORDER', featured: true, description: 'Digital radiography system for general diagnostic imaging.', specifications: 'Generator: High-frequency\nDetector: Digital flat panel\nMax output: 630mA' },
  { category: 'Imaging Equipment', brand: 'Mindray', name: 'Portable Ultrasound Scanner', sku: 'IMG-002', price: 480000, availability: 'IN_STOCK', description: 'Portable ultrasound scanner for abdominal, cardiac, and obstetric imaging.', specifications: 'Display: 15" LED monitor\nProbes: Convex, linear, phased array\nBattery: 2 hours' },
  { category: 'Imaging Equipment', brand: 'GE Healthcare', name: 'Mobile C-Arm Fluoroscopy Unit', sku: 'IMG-003', price: 3200000, availability: 'OUT_OF_STOCK', description: 'Mobile C-arm for intraoperative fluoroscopic imaging.', specifications: 'Image intensifier: 9"\nGenerator: 15kW\nRotation: 360° orbital' },

  // Surgical Instruments
  { category: 'Surgical Instruments', brand: 'B.Braun', name: 'General Surgery Instrument Set', sku: 'SUR-001', price: 32000, availability: 'IN_STOCK', description: 'Complete stainless steel instrument set for general surgical procedures.', specifications: 'Material: Surgical grade stainless steel\nPieces: 30-piece set\nSterilizable: Autoclavable' },
  { category: 'Surgical Instruments', brand: 'Covidien', name: 'Electrosurgical Unit (Diathermy Machine)', sku: 'SUR-002', price: 165000, availability: 'IN_STOCK', featured: true, description: 'Electrosurgical generator for cutting and coagulation during surgery.', specifications: 'Output modes: Cut, coagulate, blend\nMax power: 300W\nSafety: Return electrode monitoring' },
  { category: 'Surgical Instruments', brand: 'Karl Storz', name: 'Laparoscopic Instrument Set', sku: 'SUR-003', price: 480000, availability: 'PREORDER', description: 'Laparoscopic instrument set for minimally invasive surgery.', specifications: 'Includes: Graspers, scissors, dissectors\nShaft diameter: 5mm\nLength: 33cm' },

  // Medical Consumables
  { category: 'Medical Consumables', brand: 'BD', name: 'Disposable Syringes (Box of 100)', sku: 'CON-001', price: 1200, availability: 'IN_STOCK', description: 'Single-use disposable syringes in assorted sizes.', specifications: 'Sizes: 2mL, 5mL, 10mL\nMaterial: Medical-grade plastic\nSterility: Sterile, single-use' },
  { category: 'Medical Consumables', brand: 'B.Braun', name: 'IV Cannulas (Box of 50)', sku: 'CON-002', price: 2800, availability: 'IN_STOCK', description: 'Color-coded IV cannulas for peripheral venous access.', specifications: 'Gauges: 18G-24G\nMaterial: FEP catheter\nFeatures: Injection port' },
  { category: 'Medical Consumables', brand: 'Ethicon', name: 'Surgical Sutures (Box)', sku: 'CON-003', price: 4500, availability: 'IN_STOCK', description: 'Absorbable and non-absorbable surgical sutures, assorted sizes.', specifications: 'Types: Absorbable & non-absorbable\nSizes: 2-0 to 4-0\nNeedle: Reverse cutting' },

  // Laboratory Consumables
  { category: 'Laboratory Consumables', name: 'Test Tubes (Pack of 100)', sku: 'LCO-001', price: 1500, availability: 'IN_STOCK', description: 'Borosilicate glass test tubes for laboratory sample collection.', specifications: 'Material: Borosilicate glass\nCapacity: 10mL\nPack size: 100 units' },
  { category: 'Laboratory Consumables', name: 'Microscope Slides (Box of 50)', sku: 'LCO-002', price: 900, availability: 'IN_STOCK', description: 'Frosted-end glass microscope slides for specimen mounting.', specifications: 'Size: 25mm x 75mm\nThickness: 1mm\nEdges: Ground' },
  { category: 'Laboratory Consumables', brand: 'Eppendorf', name: 'Pipette Tips (Pack of 1000)', sku: 'LCO-003', price: 3200, availability: 'IN_STOCK', description: 'Universal pipette tips compatible with standard micropipettes.', specifications: 'Volume range: 0.1-1000µL\nMaterial: Polypropylene\nSterility: RNase/DNase-free' },

  // Medical Gloves
  { category: 'Medical Gloves', brand: 'Ansell', name: 'Nitrile Examination Gloves (Box of 100)', sku: 'GLV-001', price: 950, availability: 'IN_STOCK', description: 'Powder-free nitrile examination gloves for clinical use.', specifications: 'Material: Nitrile\nSizes: S, M, L, XL\nPowder-free: Yes' },
  { category: 'Medical Gloves', brand: 'Ansell', name: 'Latex Surgical Gloves (Box of 50 Pairs)', sku: 'GLV-002', price: 2200, availability: 'IN_STOCK', description: 'Sterile latex surgical gloves with textured grip.', specifications: 'Material: Natural rubber latex\nSterility: Sterile pairs\nSizes: 6.5-8.5' },
  { category: 'Medical Gloves', name: 'Vinyl Examination Gloves (Box of 100)', sku: 'GLV-003', price: 750, availability: 'IN_STOCK', description: 'Latex-free vinyl gloves for general examination use.', specifications: 'Material: Vinyl (latex-free)\nSizes: S, M, L, XL' },

  // Medical Safety Products
  { category: 'Medical Safety Products', name: 'Sharps Disposal Container (5L)', sku: 'SAF-001', price: 1200, availability: 'IN_STOCK', description: 'Puncture-resistant sharps container for safe needle disposal.', specifications: 'Capacity: 5 litres\nMaterial: High-density plastic\nLid: Locking, tamper-evident' },
  { category: 'Medical Safety Products', name: 'Biohazard Waste Bags (Roll of 50)', sku: 'SAF-002', price: 1800, availability: 'IN_STOCK', description: 'Autoclavable biohazard bags for infectious waste disposal.', specifications: 'Capacity: 30L\nMaterial: LDPE\nMarking: Biohazard symbol' },
  { category: 'Medical Safety Products', name: 'Emergency Eye Wash Station', sku: 'SAF-003', price: 15000, availability: 'IN_STOCK', description: 'Wall-mounted emergency eye wash station for chemical exposure response.', specifications: 'Flow rate: 1.5 GPM\nActivation: Push handle\nMounting: Wall-mounted' },

  // PPE
  { category: 'Personal Protective Equipment (PPE)', name: 'Disposable Isolation Gowns (Pack of 20)', sku: 'PPE-001', price: 4500, availability: 'IN_STOCK', featured: true, description: 'Fluid-resistant disposable isolation gowns for infection control.', specifications: 'Material: Non-woven polypropylene\nClosure: Rear tie\nSize: Universal' },
  { category: 'Personal Protective Equipment (PPE)', brand: '3M', name: 'N95 Respirator Masks (Box of 20)', sku: 'PPE-002', price: 3800, availability: 'IN_STOCK', description: 'NIOSH-approved N95 particulate respirator masks.', specifications: 'Filtration: N95 (95% efficiency)\nDesign: Cup-style\nStraps: Dual elastic' },
  { category: 'Personal Protective Equipment (PPE)', name: 'Face Shields (Pack of 10)', sku: 'PPE-003', price: 2500, availability: 'IN_STOCK', description: 'Full-face protective shields for splash and droplet protection.', specifications: 'Visor: Clear PET\nHeadband: Adjustable foam\nReusable: Yes' },

  // Hospital Furniture
  { category: 'Hospital Furniture', name: 'Adjustable Hospital Bed (Manual)', sku: 'FUR-001', price: 85000, availability: 'IN_STOCK', description: 'Manual crank-adjustable hospital bed with side rails.', specifications: 'Frame: Powder-coated steel\nAdjustment: 3-function manual crank\nSide rails: Foldable' },
  { category: 'Hospital Furniture', name: 'Bedside Cabinet', sku: 'FUR-002', price: 18000, availability: 'IN_STOCK', description: 'Bedside storage cabinet with drawer and cupboard.', specifications: 'Material: Powder-coated steel\nCompartments: 1 drawer, 1 cupboard\nCastors: Lockable' },
  { category: 'Hospital Furniture', name: 'Standard Foldable Wheelchair', sku: 'FUR-003', price: 22000, availability: 'IN_STOCK', featured: true, description: 'Foldable steel-frame wheelchair for patient mobility.', specifications: 'Frame: Steel, foldable\nSeat width: 46cm\nMax load: 100kg' },

  // Emergency Equipment
  { category: 'Emergency Equipment', brand: 'Philips Healthcare', name: 'Automated External Defibrillator (AED)', sku: 'EMG-001', price: 285000, availability: 'IN_STOCK', featured: true, description: 'Automated external defibrillator with voice-guided rescue prompts.', specifications: 'Energy: 150J biphasic\nGuidance: Voice & visual prompts\nBattery life: 4 years standby' },
  { category: 'Emergency Equipment', name: 'Emergency Resuscitation Trolley (Crash Cart)', sku: 'EMG-002', price: 195000, availability: 'IN_STOCK', description: 'Fully equipped resuscitation trolley for emergency response.', specifications: 'Drawers: 5-tier\nMaterial: Powder-coated steel\nCastors: 4, lockable' },
  { category: 'Emergency Equipment', name: 'Portable Oxygen Concentrator (5L)', sku: 'EMG-003', price: 78000, availability: 'IN_STOCK', description: 'Portable oxygen concentrator for emergency and home oxygen therapy.', specifications: 'Flow rate: 1-5 LPM\nOxygen purity: 90-96%\nNoise level: <45dB' },
];

async function main() {
  console.log('Seeding database...');

  // Seed one account per role so role-based authorization (e.g. delete
  // buttons hidden/blocked for EDITOR) can actually be exercised without
  // hand-creating users in Prisma Studio.
  const seedUsers = [
    { name: 'Mequick Solutions Super Admin', email: 'superadmin@mequicksolutions.co.ke', password: 'SuperAdmin123!', role: 'SUPER_ADMIN' },
    { name: 'Mequick Solutions Admin', email: 'admin@mequicksolutions.co.ke', password: 'ChangeMe123!', role: 'ADMIN' },
    { name: 'Mequick Solutions Editor', email: 'editor@mequicksolutions.co.ke', password: 'Editor123!', role: 'EDITOR' },
  ];

  for (const seedUser of seedUsers) {
    const passwordHash = await bcrypt.hash(seedUser.password, 12);
    await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {},
      create: {
        name: seedUser.name,
        email: seedUser.email,
        passwordHash,
        role: seedUser.role,
        isActive: true,
      },
    });
  }

  const categoryIdByName = {};
  for (const cat of CATEGORIES) {
    const slug = slugify(cat.name);
    const category = await prisma.category.upsert({
      where: { slug },
      update: { description: cat.description },
      create: {
        name: cat.name,
        slug,
        description: cat.description,
        image: placeholderImage(cat.name, '800x500'),
      },
    });
    categoryIdByName[cat.name] = category.id;
  }

  const brandIdByName = {};
  for (const brandName of BRANDS) {
    const slug = slugify(brandName);
    const brand = await prisma.brand.upsert({
      where: { slug },
      update: {},
      create: { name: brandName, slug },
    });
    brandIdByName[brandName] = brand.id;
  }

  let created = 0;
  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    const exists = await prisma.product.findUnique({ where: { slug } });
    if (exists) continue;

    await prisma.product.create({
      data: {
        name: p.name,
        slug,
        sku: p.sku,
        description: p.description,
        specifications: p.specifications,
        price: p.price,
        availability: p.availability,
        featured: Boolean(p.featured),
        categoryId: categoryIdByName[p.category],
        brandId: p.brand ? brandIdByName[p.brand] : null,
        images: {
          create: [{ url: placeholderImage(p.name), isPrimary: true }],
        },
      },
    });
    created += 1;
  }

  console.log(`Seeded ${CATEGORIES.length} categories, ${BRANDS.length} brands, ${created} new products.`);
  console.log('Seed admin logins (CHANGE THESE before any real deployment):');
  seedUsers.forEach((u) => console.log(`  ${u.role.padEnd(12)} ${u.email} / ${u.password}`));
  console.log('Product images are https://placehold.co placeholders — replace them via the admin panel once Cloudinary credentials are live.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
