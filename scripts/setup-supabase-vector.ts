import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Setting up Supabase Vector...");

        // Enable vector extension
        try {
            await prisma.$executeRawUnsafe(`create extension if not exists vector;`);
            console.log("Vector extension enabled");
        } catch (e) {
            console.log("Vector extension might already be enabled or requires superuser:", e);
        }

        // Create documents table
        // We use a separate table for AI documents to avoid messing with Prisma schema for now
        await prisma.$executeRawUnsafe(`
      create table if not exists documents (
        id uuid primary key default gen_random_uuid(),
        content text,
        metadata jsonb,
        embedding vector(768)
      );
    `);
        console.log("Documents table created");

        // Create match_documents function
        await prisma.$executeRawUnsafe(`
      create or replace function match_documents (
        query_embedding vector(768),
        match_threshold float,
        match_count int
      )
      returns table (
        id uuid,
        content text,
        metadata jsonb,
        similarity float
      )
      language plpgsql
      as $$
      begin
        return query
        select
          documents.id,
          documents.content,
          documents.metadata,
          1 - (documents.embedding <=> query_embedding) as similarity
        from documents
        where 1 - (documents.embedding <=> query_embedding) > match_threshold
        order by documents.embedding <=> query_embedding
        limit match_count;
      end;
      $$;
    `);
        console.log("match_documents function created");

    } catch (e) {
        console.error("Error setting up Supabase Vector:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
