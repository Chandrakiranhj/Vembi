import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { 
  addDocument, 
  getAllDocuments, 
  getDocumentsByType,
  deleteDocument,
  getDocument
} from '@/lib/ai-document-store';

// GET - Retrieve documents
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const auth = getAuth(req);
    const { userId } = auth;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to access documents' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    // Return specific document if ID is provided
    if (id) {
      const document = getDocument(id);
      if (!document) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Document not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ document });
    }

    // Return documents of a specific type if type is provided
    if (type) {
      const documents = getDocumentsByType(type);
      return NextResponse.json({ documents });
    }

    // Return all documents by default
    const documents = getAllDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error in documents endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

// POST - Add a new document
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const auth = getAuth(req);
    const { userId } = auth;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to add documents' },
        { status: 401 }
      );
    }

    // Parse request body
    const data = await req.json();
    const { title, content, type, metadata } = data;

    // Validate required fields
    if (!title || !content || !type) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing required fields: title, content, or type' },
        { status: 400 }
      );
    }

    // Add the document, which returns both document and pineconeSuccess
    const result = await addDocument(title, content, type, metadata);

    // Return the new document with Pinecone status
    return NextResponse.json({ 
      document: result.document, 
      success: true, 
      pineconeSuccess: result.pineconeSuccess 
    });
  } catch (error) {
    console.error('Error adding document:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove a document
export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const auth = getAuth(req);
    const { userId } = auth;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to delete documents' },
        { status: 401 }
      );
    }

    // Get document ID from query parameters
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing document ID' },
        { status: 400 }
      );
    }

    // Delete the document (now async)
    const success = await deleteDocument(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Document not found' },
        { status: 404 }
      );
    }

    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
} 