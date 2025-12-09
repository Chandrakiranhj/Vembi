import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const sqlPath = path.join(process.cwd(), 'prisma', 'enable_rls.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolon to get individual statements
    // Remove comments and empty lines roughly
    const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Found ${statements.length} statements to execute.`);

    for (const statement of statements) {
        try {
            // Skip comments if the whole statement is a comment (starts with --)
            if (statement.startsWith('--')) {
                continue;
            }

            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await prisma.$executeRawUnsafe(statement);
            console.log('Success.');
        } catch (error) {
            console.error(`Error executing statement: ${statement}`);
            console.error(error);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
