const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Fixing Prisma client generation...');

// Ensure the Prisma client is correctly set up
try {
  // Add the 'output' option to the Prisma generator if it doesn't exist already
  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
  let schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Check if the output option is already present
  if (!schema.includes('output =')) {
    console.log('Adding output path to Prisma generator...');
    // Add the output path to the generator
    schema = schema.replace(
      /generator\s+client\s*{[^}]*}/s,
      (match) => match.replace(/}$/, '\n  output = "./generated/client"\n}')
    );
    fs.writeFileSync(schemaPath, schema);
    console.log('Updated schema.prisma with output path');
  }

  // Generate the Prisma client
  console.log('Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('Prisma client generation completed successfully.');
} catch (error) {
  console.error('Error fixing Prisma client:', error.message);
  process.exit(1);
} 