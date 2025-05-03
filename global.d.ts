import { PrismaClient as OriginalPrismaClient } from '@prisma/client'

// Augment the PrismaClient type with the missing models
declare global {
  namespace PrismaClient {
    // Add missing models to the PrismaClient interface
    interface ExtendedPrismaClient extends OriginalPrismaClient {
      vendor: any;
      stockBatch: any;
      productComponent: any;
      assemblyComponentBatch: any;
    }
  }
}

// Declare the extended PrismaClient type
declare module '@prisma/client' {
  export interface PrismaClient extends PrismaClient.ExtendedPrismaClient {}
}

export {}; 