
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Applying storage RLS policies...');

    try {
        // Allow authenticated uploads
        await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'objects' 
          AND policyname = 'Allow authenticated uploads to batch-invoices'
        ) THEN
          CREATE POLICY "Allow authenticated uploads to batch-invoices"
          ON storage.objects
          FOR INSERT
          TO authenticated
          WITH CHECK ( bucket_id = 'batch-invoices' );
        END IF;
      END
      $$;
    `);
        console.log('Policy "Allow authenticated uploads to batch-invoices" applied.');

        // Allow public viewing
        await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'objects' 
          AND policyname = 'Allow public viewing of batch-invoices'
        ) THEN
          CREATE POLICY "Allow public viewing of batch-invoices"
          ON storage.objects
          FOR SELECT
          TO public
          USING ( bucket_id = 'batch-invoices' );
        END IF;
      END
      $$;
    `);
        console.log('Policy "Allow public viewing of batch-invoices" applied.');

        // Allow authenticated updates (optional, but good for re-uploading)
        await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' 
            AND policyname = 'Allow authenticated updates to batch-invoices'
          ) THEN
            CREATE POLICY "Allow authenticated updates to batch-invoices"
            ON storage.objects
            FOR UPDATE
            TO authenticated
            USING ( bucket_id = 'batch-invoices' )
            WITH CHECK ( bucket_id = 'batch-invoices' );
          END IF;
        END
        $$;
      `);
        console.log('Policy "Allow authenticated updates to batch-invoices" applied.');

    } catch (error) {
        console.error('Error applying policies:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
