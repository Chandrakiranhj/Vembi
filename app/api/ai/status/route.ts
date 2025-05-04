import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { isPineconeAvailable } from '@/lib/ai-document-store';
import { areAIConfigKeysSet } from '@/lib/ai-config';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const auth = getAuth(req);
    const { userId } = auth;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to check AI status' },
        { status: 401 }
      );
    }

    // Check if config keys are set (API keys)
    const configKeysSet = areAIConfigKeysSet();
    
    // Check Pinecone availability
    const pineconeAvailable = await isPineconeAvailable();

    // Return status information
    return NextResponse.json({
      configKeysSet,
      pinecone: pineconeAvailable,
      success: true
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        pinecone: false,
        configKeysSet: false
      },
      { status: 500 }
    );
  }
} 