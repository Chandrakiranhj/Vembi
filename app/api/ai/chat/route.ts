import { NextRequest, NextResponse } from 'next/server';
import { generateResponse, ChatMessage } from '@/lib/ai-service';
import { searchDocuments } from '@/lib/ai-document-store';
import { detectUserIntent, getTaskGuidance } from '@/lib/ai-advanced-capabilities';

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request format', message: 'Messages array is required' },
        { status: 400 }
      );
    }
    
    // Extract the latest user message
    const latestUserMessage = [...messages]
      .reverse()
      .find((msg: ChatMessage) => msg.role === 'user')?.content;
    
    if (!latestUserMessage) {
      return NextResponse.json(
        { error: 'No user message found', message: 'At least one user message is required' },
        { status: 400 }
      );
    }
    
    // Detect if this is a task guidance request
    const taskGuidancePattern = /how (to|do I) (create|add|report|process) (an? )?(assembly|component|defect|return)/i;
    const taskMatch = latestUserMessage.match(taskGuidancePattern);
    
    if (taskMatch) {
      const taskType = taskMatch[2].toLowerCase();
      const taskObject = taskMatch[4].toLowerCase();
      const taskKey = `${taskType}_${taskObject}`;
      const guidance = getTaskGuidance(taskKey);
      
      if (guidance !== 'Task guidance not available.') {
        return NextResponse.json({
          response: guidance,
          success: true,
          isGuidance: true
        });
      }
    }
    
    // Detect user intent
    const intent = await detectUserIntent(latestUserMessage);
    
    // Determine if this is a document-related query
    const isDocumentQuery = intent === 'documentSearch' || 
                           /document|manual|guide|instruction|procedure|policy/i.test(latestUserMessage.toLowerCase());
    
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
      success: true,
      intent: intent
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