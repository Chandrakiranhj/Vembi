import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean up existing data first (order matters due to relations)
  console.log('Cleaning up existing data...');
  await prisma.assemblyComponentBatch.deleteMany({}); // Delete new join table first
  await prisma.returnComponent.deleteMany({});
  await prisma.defect.deleteMany({});
  await prisma.productComponent.deleteMany({}); // Delete BOM entries
  await prisma.stockBatch.deleteMany({}); // Delete stock batches
  await prisma.assembly.deleteMany({});
  await prisma.return.deleteMany({});
  await prisma.component.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.vendor.deleteMany({}); // Delete vendors
  await prisma.user.deleteMany({}); // Delete users
  
  // Create admin user
  console.log('Creating admin user...');
  const adminUser = await prisma.user.create({
    data: {
      userId: 'seed-admin-user-id', // This will need to be replaced with actual Clerk ID
      name: 'Chandrakiran',
      email: 'chandrakiranhj@gmail.com',
      role: Role.ADMIN,
      image: null
    }
  });
  console.log(`Created admin user: ${adminUser.email} (ID: ${adminUser.id})`);

  // Create vendors
  console.log('Creating vendors...');
  
  // Create multiple vendors from the spreadsheet
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'Ashish Telecom SP Road',
        contactPerson: 'Admin',
        email: 'contact@ashishtelecom.com',
        phone: '123-456-7890',
        address: 'SP Road',
        notes: 'Major supplier for SD cards, USB cables, and plugs',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Robu.in',
        contactPerson: 'Admin',
        email: 'contact@robu.in',
        phone: '123-456-7891',
        address: 'Online',
        notes: 'Supplier for various electronic components',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Xcluma',
        contactPerson: 'Admin',
        email: 'contact@xcluma.com',
        phone: '123-456-7892',
        address: 'Online',
        notes: 'Supplier for battery shields and other components',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Makerbaazar',
        contactPerson: 'Admin',
        email: 'contact@makerbaazar.com',
        phone: '123-456-7893',
        address: 'Online',
        notes: 'Supplier for speakers',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Probots',
        contactPerson: 'Admin',
        email: 'contact@probots.com',
        phone: '123-456-7894',
        address: 'Online',
        notes: 'Supplier for potentiometers',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Electronic Components',
        contactPerson: 'Admin',
        email: 'contact@electronic.com',
        phone: '123-456-7895',
        address: 'Online',
        notes: 'Generic electronic components supplier',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Robocraze',
        contactPerson: 'Admin',
        email: 'contact@robocraze.com',
        phone: '123-456-7896',
        address: 'Online',
        notes: 'Supplier for batteries and components',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Thinkrobotics',
        contactPerson: 'Admin',
        email: 'contact@thinkrobotics.com',
        phone: '123-456-7897',
        address: 'Online',
        notes: 'Supplier for batteries',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Shanthi Electronics SP Road',
        contactPerson: 'Admin',
        email: 'contact@shanthielectronics.com',
        phone: '123-456-7898',
        address: 'SP Road',
        notes: 'Supplier for batteries',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Touchetech',
        contactPerson: 'Admin',
        email: 'contact@touchetech.com',
        phone: '123-456-7899',
        address: 'Online',
        notes: 'Supplier for boards and cables',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Accurate Plastics',
        contactPerson: 'Admin',
        email: 'contact@accurateplastics.com',
        phone: '123-456-7800',
        address: 'Physical Store',
        notes: 'Supplier for enclosure and plastic parts',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'ElementzOnline',
        contactPerson: 'Admin',
        email: 'contact@elementzonline.com',
        phone: '123-456-7801',
        address: 'www.elementzonline.com',
        notes: 'Online supplier for various components',
        isActive: true
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Ktron',
        contactPerson: 'Admin',
        email: 'contact@ktron.com',
        phone: '123-456-7802',
        address: 'Online',
        notes: 'Supplier for CPU components',
        isActive: true
      }
    }),
    // Default vendor for compatibility with old code
    prisma.vendor.create({
      data: {
        name: 'Seed Data Supplier',
        contactPerson: 'System Admin',
        email: 'system@vembi.com',
        phone: '123-456-7890',
        address: 'System Generated',
        notes: 'Default vendor created by seed script',
        isActive: true
      }
    })
  ]);
  
  console.log(`Created ${vendors.length} vendors`);
  
  // Store vendors in an object for easy lookup
  const vendorMap: Record<string, typeof vendors[0]> = vendors.reduce((acc, vendor) => {
    acc[vendor.name] = vendor;
    return acc;
  }, {} as Record<string, typeof vendors[0]>);
  
  // Create products
  console.log('Creating products...');
  const hexis = await prisma.product.create({
    data: {
      modelNumber: 'HEXIS-1.0',
      name: 'Hexis',
      description: 'Hexis braille device',
      specifications: {
        type: 'Braille Device',
        dimensions: '15cm x 10cm x 2.5cm',
        weight: '350g',
        batteryLife: '8 hours'
      }
    }
  });

  const iris = await prisma.product.create({
    data: {
      modelNumber: 'IRIS-1.0',
      name: 'Iris',
      description: 'Iris braille device',
      specifications: {
        type: 'Braille Device',
        dimensions: '12cm x 8cm x 2cm',
        weight: '300g',
        batteryLife: '10 hours'
      }
    }
  });

  console.log(`Created products: ${hexis.name} and ${iris.name}`);

  // Component data (removing currentQuantity)
  const componentsData = [
    { sku: 'SD', name: 'SD card', description: '8Gb micro SD card', category: 'Storage', minimumQuantity: 10, initialStock: 239, productHexis: true, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Ashish Telecom SP Road'] },
    { sku: 'S1', name: 'SD card holder', description: 'Micro SD Card Module - Breakout Board', category: 'Storage', minimumQuantity: 10, initialStock: 62, productHexis: true, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Robu.in', 'Xcluma'] },
    { sku: 'CP', name: 'CPU', description: 'ESP32 Development Board with Wifi and Bluetooth $t-30$ pin', category: 'Electronics', minimumQuantity: 10, initialStock: 15, productHexis: true, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Robu.in', 'Xcluma', 'Ktron'] },
    { sku: 'BS', name: 'Battery shield', description: '18650 Battery Holder/Development Board Compatible With Raspberry Pi3B/3B+', category: 'Power', minimumQuantity: 10, initialStock: 17, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Xcluma', 'Robu.in'] },
    { sku: 'UC', name: 'USB Micro B cable', description: 'USB to Micro USB Cable wire 1M for NodeMCU', category: 'Cables', minimumQuantity: 10, initialStock: 74, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Ashish Telecom SP Road'] },
    { sku: 'UB', name: 'USB C cable', description: 'USB C cable wire 1M for NodeMCU', category: 'Cables', minimumQuantity: 10, initialStock: 24, productHexis: false, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Ashish Telecom SP Road'] },
    { sku: 'UP', name: 'USB plug', description: 'ERD TC-50 5V 2A BC USB Dock', category: 'Power', minimumQuantity: 10, initialStock: 128, productHexis: true, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Ashish Telecom SP Road', 'ElementzOnline', 'Robocraze'] },
    { sku: 'SP', name: 'Speakers', description: 'Mini Mylar Miniature Speaker 8ohm 0.25watt [29mm] Plastic Toy Speaker', category: 'Audio', minimumQuantity: 10, initialStock: 37, productHexis: true, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Makerbaazar'] },
    { sku: 'PT', name: 'Potentiometer', description: 'Round Dial Potentiometer 3 Pin 10K 16mm Thumbwheel', category: 'Electronics', minimumQuantity: 10, initialStock: 33, productHexis: false, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Probots'] },
    { sku: 'BC', name: 'Boost convertor', description: '1.5V 1.8V 2.5V 3V 3.3V 3.7V 4.2V to 5V DC-DC Boost Converter Step-Up Module', category: 'Power', minimumQuantity: 10, initialStock: 57, productHexis: false, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Electronic Components', 'Robu.in'] },
    { sku: 'UT', name: 'USB-C TP4056', description: 'TP4056 1A Li-ion lithium Battery Charging Module With Current Protection-Type C', category: 'Power', minimumQuantity: 10, initialStock: 72, productHexis: false, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Robu.in', 'Electronic Components'] },
    { sku: 'BT', name: 'IRIS battery 1000mah', description: '3.7V 1000mAh Li-Ion Battery', category: 'Power', minimumQuantity: 10, initialStock: 23, productHexis: false, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Robocraze', 'Thinkrobotics', 'Probots'] },
    { sku: 'B1', name: '18650 battery', description: '3.7-4.2V LiPo rechargeable battery', category: 'Power', minimumQuantity: 10, initialStock: 76, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Shanthi Electronics SP Road'] },
    { sku: 'SB', name: 'Sandwich board', description: 'Braille sandwich card', category: 'Electronics', minimumQuantity: 10, initialStock: 41, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Touchetech'] },
    { sku: 'CB', name: 'CPU Board', description: 'Hexis CPU board', category: 'Electronics', minimumQuantity: 10, initialStock: 7, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Touchetech'] },
    { sku: 'KB', name: 'Keypad board', description: 'Hexis Keypad board', category: 'Electronics', minimumQuantity: 10, initialStock: 28, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Touchetech'] },
    { sku: 'VC', name: 'Voltage sensing cable', description: 'LiPo battery voltage sensing cable (single wire)', category: 'Cables', minimumQuantity: 10, initialStock: 31, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Touchetech'] },
    { sku: 'LK', name: 'Left side keypad cable', description: 'For Hexis keypad', category: 'Cables', minimumQuantity: 10, initialStock: 74, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Touchetech'] },
    { sku: 'RK', name: 'Right side keypad cable', description: 'For Hexis keypad', category: 'Cables', minimumQuantity: 10, initialStock: 33, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Touchetech'] },
    { sku: 'PC', name: 'Power cable for Hexis', description: 'Hexis power cable from shield to CPU Board', category: 'Cables', minimumQuantity: 10, initialStock: 30, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Touchetech'] },
    { sku: 'SC', name: 'Speaker cable for Hexis', description: 'Hexis speaker cable', category: 'Cables', minimumQuantity: 10, initialStock: 39, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Touchetech'] },
    { sku: 'S2', name: 'Speaker cable for Iris', description: 'Iris speaker cable', category: 'Cables', minimumQuantity: 10, initialStock: 13, productHexis: false, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Touchetech'] },
    { sku: 'EH', name: 'Hexis enclosure, with keypad plastics', description: 'ABS enclosure for Hexis', category: 'Housing', minimumQuantity: 10, initialStock: 17, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Accurate Plastics'] },
    { sku: 'EI', name: 'Iris enclosure, keypad set', description: 'ABS enclosure for Hexis', category: 'Housing', minimumQuantity: 10, initialStock: 18, productHexis: false, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Accurate Plastics'] },
    { sku: 'SW', name: 'Switch plastics with bushes', description: 'ABS switch and rubber bush', category: 'Housing', minimumQuantity: 10, initialStock: 42, productHexis: true, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Accurate Plastics'] },
    { sku: 'IP', name: 'IRIS PCB board', description: 'Iris CPU board', category: 'Electronics', minimumQuantity: 10, initialStock: 36, productHexis: false, productIris: true, unitOfMeasure: 'pcs', preferredVendors: ['Touchetech'] },
    { sku: 'DB', name: '90 degree board', description: 'Hexis 90° board', category: 'Electronics', minimumQuantity: 10, initialStock: 39, productHexis: true, productIris: false, unitOfMeasure: 'pcs', preferredVendors: ['Touchetech'] },
  ];

  // Create components and initial stock batch for each
  console.log('Creating components and initial stock batches...');
  const components: Record<string, { id: string, name: string, sku: string }> = {};
  
  for (const componentData of componentsData) {
    const { sku, name, description, category, minimumQuantity, initialStock, productHexis, productIris, unitOfMeasure, preferredVendors } = componentData;
    
    // Store notes about which products this component is used in
    const productNotes = [];
    if (productHexis) productNotes.push('Used in Hexis');
    if (productIris) productNotes.push('Used in Iris');
    
    // Create component (without currentQuantity)
    const component = await prisma.component.create({
      data: {
        sku,
        name,
        category: category || 'Uncategorized',
        minimumQuantity,
        description: description ? `${description}. Unit of Measure: ${unitOfMeasure}. ${productNotes.join('. ')}` : `Unit of Measure: ${unitOfMeasure}. ${productNotes.join('. ')}`,
      },
    });
    
    console.log(`Created component: ${component.name} (${component.sku})`);
    components[sku] = component;
    
    // Create an initial stock batch for this component with preferred vendor
    if (initialStock > 0 && preferredVendors && preferredVendors.length > 0) {
        const vendorName = preferredVendors[0]; // Use first preferred vendor
        const vendor = vendorMap[vendorName] || vendors[vendors.length - 1]; // Fallback to default vendor if preferred not found
        
        const batchNumber = `SEED-BATCH-${sku}`;
        await prisma.stockBatch.create({
            data: {
                batchNumber,
                componentId: component.id,
                initialQuantity: initialStock,
                currentQuantity: initialStock, // Initialize current stock
                vendorId: vendor.id, // Use proper vendorId from the created vendor
                notes: `Initial stock from seed script. Vendor: ${vendor.name}`,
                dateReceived: new Date(),
            }
        });
        console.log(`Created initial stock batch: ${batchNumber} for ${component.name} (${initialStock} units) from ${vendor.name}`);
    }
  }

  // Create ProductComponent entries (BOM)
  console.log('Creating Bill of Materials (BOM)...');
  for (const componentData of componentsData) {
    const component = components[componentData.sku];
    if (componentData.productHexis) {
      await prisma.productComponent.create({
        data: {
          productId: hexis.id,
          componentId: component.id,
          quantityRequired: 1, // Assuming 1 for simplicity, adjust if needed
        }
      });
    }
    if (componentData.productIris) {
      await prisma.productComponent.create({
        data: {
          productId: iris.id,
          componentId: component.id,
          quantityRequired: 1, // Assuming 1 for simplicity, adjust if needed
        }
      });
    }
  }
  console.log('BOM created.');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 