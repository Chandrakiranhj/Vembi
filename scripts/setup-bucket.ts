
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
    console.log('Creating "batch-invoices" bucket...');

    const { data, error } = await supabase
        .storage
        .createBucket('batch-invoices', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf']
        });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket "batch-invoices" already exists.');
            // Try to update it to be public just in case
            const { error: updateError } = await supabase.storage.updateBucket('batch-invoices', {
                public: true,
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf']
            });
            if (updateError) {
                console.error('Error updating bucket:', updateError);
            } else {
                console.log('Bucket updated successfully.');
            }
        } else {
            console.error('Error creating bucket:', error);
        }
    } else {
        console.log('Bucket "batch-invoices" created successfully:', data);
    }
}

createBucket();
