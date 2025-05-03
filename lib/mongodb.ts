import { MongoClient, ObjectId } from 'mongodb';
import { prisma } from './prisma';

// MongoDB connection string
const MONGODB_URI = process.env.DATABASE_URL || '';

// Define return types
interface ReturnDocument {
  _id: ObjectId;
  status: string;
  updatedAt: Date;
  serialNumber?: string;
  reason?: string;
  modelNumber?: string;
  createdAt?: Date;
  product?: {
    id?: string;
    name?: string;
    modelNumber?: string;
  };
  qc?: {
    id?: string;
    status?: string;
  };
}

// Create a MongoDB client
let cachedClient: MongoClient | null = null;

/**
 * Get a MongoDB client instance
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) {
    return cachedClient;
  }

  // Try to get the client from prisma's internal connection
  try {
    // Prisma internal _engine and client properties are not exposed in types
    const prismaAny = prisma as { _engine?: { client?: MongoClient } };
    const client = prismaAny._engine?.client;
    if (client) {
      cachedClient = client;
      return client;
    }
  } catch (error) {
    console.warn('Could not access Prisma MongoDB client:', error);
  }

  // Fall back to creating a new connection
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

/**
 * Update a return's status
 */
export async function updateReturnStatus(returnId: string, status: string): Promise<ReturnDocument> {
  try {
    console.log(`Updating return ${returnId} to status ${status}`);
    const client = await getMongoClient();
    const db = client.db();
    
    // Convert string ID to MongoDB ObjectId
    const objectId = new ObjectId(returnId);
    
    // Check if return exists first
    const existingReturn = await db.collection('Return').findOne({ _id: objectId });
    if (!existingReturn) {
      console.error(`Return with ID ${returnId} not found`);
      throw new Error(`Return with ID ${returnId} not found`);
    }
    
    console.log(`Found return. Current status: ${existingReturn.status}`);
    
    // Update the return status
    const result = await db.collection('Return').updateOne(
      { _id: objectId },
      { $set: { status, updatedAt: new Date() } }
    );
    
    console.log(`Update result: matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);
    
    if (result.matchedCount === 0) {
      throw new Error(`Return with ID ${returnId} not found`);
    }
    
    // Get the updated return
    const updatedReturn = await db.collection('Return').findOne({ _id: objectId });
    if (!updatedReturn) {
      throw new Error(`Return with ID ${returnId} not found after update`);
    }
    
    console.log(`Return updated successfully. New status: ${updatedReturn.status}`);
    return updatedReturn as ReturnDocument;
  } catch (error) {
    console.error('Error updating return status:', error);
    throw error;
  }
}

/**
 * Get a return by ID
 */
export async function getReturnById(returnId: string): Promise<ReturnDocument | null> {
  try {
    const client = await getMongoClient();
    const db = client.db();
    
    // Convert string ID to MongoDB ObjectId
    const objectId = new ObjectId(returnId);
    
    // Get the return
    return await db.collection('Return').findOne({ _id: objectId }) as ReturnDocument | null;
  } catch (error) {
    console.error('Error getting return:', error);
    throw error;
  }
}

/**
 * Check if a return has completed QC
 */
export async function hasCompletedQC(returnId: string): Promise<boolean> {
  try {
    const client = await getMongoClient();
    const db = client.db();
    
    // Convert string ID to MongoDB ObjectId
    const objectId = new ObjectId(returnId);
    
    console.log('Checking QC completion for return:', returnId);
    
    // First find the return document to check if it has a QC reference
    const returnDoc = await db.collection('Return').findOne({ _id: objectId });
    if (!returnDoc) {
      console.log('Return not found:', returnId);
      return false;
    }
    
    console.log('Return found with data:', JSON.stringify(returnDoc, null, 2));
    
    // Check first if the return document has a qc field and status is COMPLETED
    if (returnDoc.qc && returnDoc.qc.status === 'COMPLETED') {
      console.log('QC completed based on embedded qc field');
      return true;
    }
    
    // Try to find QC record in separate collection as fallback
    const qcRecord = await db.collection('ReturnQC').findOne({ 
      returnId: objectId.toString()
    });
    
    console.log('QC record from collection:', qcRecord ? JSON.stringify(qcRecord, null, 2) : 'Not found');
    
    const hasCompleted = qcRecord !== null && qcRecord.status === 'COMPLETED';
    console.log('QC record found:', !!qcRecord, 'QC status:', qcRecord?.status, 'Completed:', hasCompleted);
    
    return hasCompleted;
  } catch (error) {
    console.error('Error checking QC status:', error);
    return false;
  }
}

/**
 * Complete a QC process for a return
 */
export async function completeQC(returnId: string): Promise<boolean> {
  try {
    console.log(`Completing QC for return ${returnId}`);
    const client = await getMongoClient();
    const db = client.db();
    
    // Get the return document
    const objectId = new ObjectId(returnId);
    const returnDoc = await db.collection('Return').findOne({ _id: objectId });
    
    if (!returnDoc) {
      console.error(`Return with ID ${returnId} not found`);
      return false;
    }
    
    // Check if there's a QC record ID
    const qcId = returnDoc.qcId || null;
    console.log(`Found return with QC ID: ${qcId}`);
    
    // Update the QC status directly in the return document
    const updateResult = await db.collection('Return').updateOne(
      { _id: objectId },
      { 
        $set: { 
          "qc.status": "COMPLETED",
          updatedAt: new Date()
        } 
      }
    );
    
    console.log(`Updated Return document: matchedCount=${updateResult.matchedCount}, modifiedCount=${updateResult.modifiedCount}`);
    
    // If we have a QC ID, also update the QC record
    if (qcId) {
      try {
        const qcObjectId = new ObjectId(qcId);
        const qcUpdateResult = await db.collection('ReturnQC').updateOne(
          { _id: qcObjectId },
          { 
            $set: { 
              status: "COMPLETED",
              updatedAt: new Date()
            } 
          }
        );
        console.log(`Updated QC record: matchedCount=${qcUpdateResult.matchedCount}, modifiedCount=${qcUpdateResult.modifiedCount}`);
      } catch (qcError) {
        console.error(`Error updating QC record (non-critical):`, qcError);
        // Continue, as we've already updated the main return record
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error completing QC:', error);
    return false;
  }
} 