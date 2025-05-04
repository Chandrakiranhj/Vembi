# Adding BOM Knowledge to the AI Assistant

To ensure the AI Assistant has complete knowledge about the Vembi Inventory Management System, especially the BOM management functionality, follow these steps to add the knowledge document to the AI's database.

## Option 1: Through the AI Assistant UI

1. Log in to the Vembi Inventory Management System
2. Navigate to the "AI Assistant" page
3. Select the "Knowledge Documents" tab
4. Click the "Add Document" button
5. Enter the following details:
   - **Title**: Vembi Inventory & BOM Management System Guide
   - **Type**: Guide
   - **Content**: Copy the entire content of the `AI-KNOWLEDGE-SYSTEM-GUIDE.md` file
6. Click "Add Document"

## Option 2: Using the Provided Script

We've created a script to automatically add the knowledge document to the AI system:

1. Make sure the application is running locally
2. Open a terminal and navigate to the project root directory
3. Install the required dependencies if you haven't already:
   ```
   npm install node-fetch
   ```
4. Run the script:
   ```
   node scripts/add-bom-knowledge.js
   ```
5. You should see a confirmation message that the document was added successfully

## Verifying the Knowledge

To verify that the AI has correctly incorporated the BOM knowledge:

1. Go to the "AI Assistant" page
2. In the chat interface, ask a question about BOM management, such as:
   - "How do I edit a product's BOM?"
   - "How is production capacity calculated?"
   - "What happens when I change component quantities in a BOM?"
3. The AI should provide detailed, accurate answers based on the knowledge document

## Additional Resources

- The system prompt in `lib/ai-config.ts` has been updated to include specific knowledge about the BOM management system
- The knowledge document can be found in `AI-KNOWLEDGE-SYSTEM-GUIDE.md`
- You can customize or expand the knowledge document as needed 