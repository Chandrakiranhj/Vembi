import { NextRequest, NextResponse } from 'next/server';
import { generateResponse, ChatMessage } from '@/lib/ai-service';
import { getAuth } from '@clerk/nextjs/server';
import { searchDocuments } from '@/lib/ai-document-store';

// Validate that the chat request is properly formed
function validateChatRequest(data: unknown): data is { messages: ChatMessage[] } {
  return (
    data !== null &&
    typeof data === 'object' &&
    'messages' in data &&
    Array.isArray((data as { messages: unknown }).messages) &&
    (data as { messages: unknown[] }).messages.every((msg) =>
      typeof msg === 'object' &&
      msg !== null &&
      'role' in msg &&
      'content' in msg &&
      (
        (msg as { role: unknown }).role === 'user' || 
        (msg as { role: unknown }).role === 'assistant' || 
        (msg as { role: unknown }).role === 'system'
      ) &&
      typeof (msg as { content: unknown }).content === 'string'
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    // Get auth data to check if user is authenticated
    const auth = getAuth(req);
    const { userId } = auth;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to use the AI chat' },
        { status: 401 }
      );
    }

    // Parse request body
    const data = await req.json();

    // Validate the request data
    if (!validateChatRequest(data)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid chat request format' },
        { status: 400 }
      );
    }

    const { messages } = data;

    // Extract the latest user query to potentially search documents
    const latestUserMessage = [...messages]
      .reverse()
      .find(msg => msg.role === 'user')?.content || '';

    // Check if the message mentions documents or guides
    const isDocumentQuery = latestUserMessage.toLowerCase().includes('document') || 
                           latestUserMessage.toLowerCase().includes('guide') ||
                           latestUserMessage.toLowerCase().includes('procedure') ||
                           latestUserMessage.toLowerCase().includes('manual');

    // If it's a document query, search documents and add results to context
    if (isDocumentQuery) {
      const docs = await searchDocuments(latestUserMessage);
      if (docs.length > 0) {
        // Add document information as a system message before the last user message
        const docInfo = docs.map(doc => 
          `Document: ${doc.title}\nContent: ${doc.content.substring(0, 1000)}${doc.content.length > 1000 ? '...' : ''}`
        ).join('\n\n');
        
        const lastUserIndex = messages.findIndex(msg => 
          msg.content === latestUserMessage && msg.role === 'user'
        );
        
        if (lastUserIndex > 0) {
          messages.splice(lastUserIndex, 0, {
            role: 'system',
            content: `Found the following relevant documents:\n${docInfo}`,
          });
        }
      }
    }

    // Generate AI response
    const aiResponse = await generateResponse(messages);

    // Return the response
    return NextResponse.json({ 
      response: aiResponse,
      success: true
    });
  } catch (error) {
    console.error('Error in AI chat endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
} 