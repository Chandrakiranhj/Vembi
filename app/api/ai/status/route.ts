import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isVectorStoreAvailable, getVectorStoreStatus } from '@/lib/ai-document-store';
import { areAIConfigKeysSet } from '@/lib/ai-config';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to check AI status' },
        { status: 401 }
      );
    }

    // Check if config keys are set (API keys)
    const configKeysSet = areAIConfigKeysSet();

    // Check Vector Store availability
    const vectorStoreAvailable = await isVectorStoreAvailable();

    // Get detailed Vector Store status
    const vectorStoreStatus = getVectorStoreStatus();

    // Return status information
    return NextResponse.json({
      configKeysSet,
      vectorStore: vectorStoreAvailable,
      vectorStoreStatus: {
        initialized: vectorStoreStatus.initialized,
        error: vectorStoreStatus.error
      },
      success: true
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        vectorStore: false,
        configKeysSet: false
      },
      { status: 500 }
    );
  }
}