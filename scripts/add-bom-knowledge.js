/**
 * Script to add BOM management knowledge to the AI Assistant
 * 
 * This script reads the AI-KNOWLEDGE-SYSTEM-GUIDE.md file and
 * adds it to the AI knowledge base via the /api/ai/documents endpoint.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function main() {
  try {
    console.log('Reading BOM knowledge document...');
    
    // Read the knowledge file
    const filePath = path.join(__dirname, '..', 'AI-KNOWLEDGE-SYSTEM-GUIDE.md');
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log('Document read successfully. Adding to AI knowledge base...');
    
    // Add document to AI knowledge base
    const response = await fetch('http://localhost:3000/api/ai/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Vembi Inventory & BOM Management System Guide',
        content,
        type: 'guide',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to add document: ${errorData.message || 'Unknown error'}`);
    }
    
    const result = await response.json();
    console.log('Document added successfully!');
    console.log('Document ID:', result.document.id);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 