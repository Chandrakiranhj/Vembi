'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, File, Trash2, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';

// Document type
interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  uploadedAt: string | Date;
}

export function DocumentsManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pineconeStatus, setPineconeStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  
  // New document form state
  const [newDocument, setNewDocument] = useState({
    title: '',
    content: '',
    type: 'guide',
  });

  // Check Pinecone connection status
  const checkPineconeStatus = async () => {
    try {
      const response = await fetch('/api/ai/status');
      if (response.ok) {
        const data = await response.json();
        setPineconeStatus(data.pinecone ? 'connected' : 'disconnected');
      } else {
        setPineconeStatus('disconnected');
      }
    } catch (error) {
      console.error('Error checking Pinecone status:', error);
      setPineconeStatus('disconnected');
    }
  };

  // Fetch documents
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/documents');
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      const data = await response.json();
      setDocuments(data.documents || []);
      
      // Check Pinecone status after fetching documents
      await checkPineconeStatus();
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
      setPineconeStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  // Load documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Handle document form changes
  const handleDocumentChange = (
    field: keyof typeof newDocument,
    value: string
  ) => {
    setNewDocument((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Update title if empty
    if (!newDocument.title.trim()) {
      // Remove file extension from filename
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      handleDocumentChange('title', fileName);
    }
    
    try {
      // Read the file as text
      const text = await readFileAsText(file);
      
      // Update document content
      handleDocumentChange('content', text);
      
      toast.success(`File "${file.name}" loaded successfully`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read file');
    }
  };
  
  // Helper to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Add document
  const handleAddDocument = async () => {
    if (!newDocument.title.trim() || !newDocument.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Show uploading toast
      const uploadingToast = toast.loading('Uploading document to knowledge base...');
      
      const response = await fetch('/api/ai/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDocument),
      });

      // Dismiss the uploading toast
      toast.dismiss(uploadingToast);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add document');
      }

      const result = await response.json();

      // Reset form and close dialog
      setNewDocument({
        title: '',
        content: '',
        type: 'guide',
      });
      setUploadDialogOpen(false);
      
      // Refresh document list
      fetchDocuments();
      
      // Show different toasts based on Pinecone indexing status
      if (result.pineconeSuccess === false) {
        toast.success('Document added successfully but not indexed in Pinecone. Vector search may not work for this document.');
      } else {
        toast.success('Document added successfully and indexed for AI vector search');
      }
    } catch (error) {
      console.error('Error adding document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add document');
    }
  };

  // Delete document
  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ai/documents?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Remove from list
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      toast.success('Document deleted successfully');
      
      // Close view dialog if open
      if (selectedDocument?.id === id) {
        setViewDialogOpen(false);
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  // View document
  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setViewDialogOpen(true);
  };

  // Filter documents by search term
  const filteredDocuments = searchTerm
    ? documents.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : documents;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-[700px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#8B2131] text-white">
        <div className="flex items-center">
          <h2 className="font-semibold">Knowledge Base Documents</h2>
          {/* Pinecone status indicator */}
          <div className="ml-3 flex items-center">
            <span className="text-xs mr-1">Vector Search:</span>
            {pineconeStatus === 'loading' && (
              <span className="inline-flex items-center text-xs text-yellow-300">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Checking...
              </span>
            )}
            {pineconeStatus === 'connected' && (
              <span className="inline-flex items-center text-xs text-green-300">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                Active
              </span>
            )}
            {pineconeStatus === 'disconnected' && (
              <span className="inline-flex items-center text-xs text-red-300">
                <div className="h-2 w-2 rounded-full bg-red-500 mr-1"></div>
                Disabled
              </span>
            )}
          </div>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="text-white hover:bg-[#6D1A27]"
            >
              <UploadCloud className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add Knowledge Document</DialogTitle>
              <DialogDescription>
                Add a new document to the AI knowledge base. The AI will use this document to help answer questions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  value={newDocument.title}
                  onChange={(e) => handleDocumentChange('title', e.target.value)}
                  className="col-span-3"
                  placeholder="Document title"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Select
                  value={newDocument.type}
                  onValueChange={(value) => handleDocumentChange('type', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="file" className="text-right">
                  Upload File
                </Label>
                <div className="col-span-3">
                  <Input
                    id="file"
                    type="file"
                    accept=".txt,.md,.doc,.docx"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: .txt, .md, .doc, .docx
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="content" className="text-right">
                  Content
                </Label>
                <Textarea
                  id="content"
                  value={newDocument.content}
                  onChange={(e) => handleDocumentChange('content', e.target.value)}
                  className="col-span-3 h-40"
                  placeholder="Document content..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddDocument}
                className="bg-[#8B2131] hover:bg-[#6D1A27]"
              >
                Add Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Document List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#8B2131]" />
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="p-4 space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-gray-100 rounded-md">
                  <File className="h-5 w-5 text-[#8B2131]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate" title={doc.title}>
                    {doc.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(doc.uploadedAt).toLocaleString()}{' '}
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded-full ml-2 capitalize">
                      {doc.type}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewDocument(doc)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
            <File className="h-12 w-12 text-gray-300 mb-3" />
            {searchTerm ? (
              <p>No documents found matching your search.</p>
            ) : (
              <>
                <p>No documents added yet.</p>
                <p className="text-sm mt-1">Add your first document to get started.</p>
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* View Document Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.title}</DialogTitle>
            <DialogDescription>
              <span className="capitalize">{selectedDocument?.type}</span> • {' '}
              {selectedDocument?.uploadedAt 
                ? new Date(selectedDocument.uploadedAt).toLocaleString() 
                : ''}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-4">
            <div className="whitespace-pre-wrap text-gray-800">
              {selectedDocument?.content}
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setViewDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedDocument) {
                  handleDeleteDocument(selectedDocument.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 