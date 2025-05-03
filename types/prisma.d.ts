import { PrismaClient } from '@prisma/client'

// This file extends the Prisma Client with missing types
declare global {
  namespace PrismaClient {
    interface PrismaExtension {
      vendor: any;
      stockBatch: any;
      productComponent: any;
      assemblyComponentBatch: any;
    }
  }
}

// Augment the PrismaClient to include the missing models
declare module '@prisma/client' {
  interface PrismaClient {
    vendor: any;
    stockBatch: any;
    productComponent: any;
    assemblyComponentBatch: any;
  }
}

export {}; 