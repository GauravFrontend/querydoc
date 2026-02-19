# DocQuery - Quick Start Guide

## ✅ Installation Complete!

Your DocQuery application has been successfully created and is ready to use!

## 🚀 Current Status

- ✅ Next.js application created
- ✅ All components implemented
- ✅ Dependencies installed
- ✅ Development server running at http://localhost:3000

## 📋 Prerequisites Checklist

Before using the application, make sure you have:

### 1. Ollama Installed and Running

**Install Ollama:**
- Download from: https://ollama.ai
- Follow installation instructions for Windows

**Pull Required Models:**
```powershell
ollama pull qwen2.5:3b
ollama pull gemma2:2b
```

**Verify Ollama is Running:**
```powershell
ollama serve
```

Or check if it's accessible:
```powershell
curl http://localhost:11434/api/tags
```

## 🎯 How to Use DocQuery

1. **Open the Application**
   - Navigate to http://localhost:3000 in your browser
   - Chrome, Firefox, or Edge recommended

2. **Upload a PDF**
   - Drag and drop a PDF file onto the upload zone
   - Or click to browse and select a PDF
   - ⚠️ Important: Only TEXT-based PDFs work (no scanned documents)

3. **Ask Questions**
   - Once the PDF is processed, you'll see a split view:
     - Left side: PDF viewer with zoom and navigation controls
     - Right side: Chat interface
   - Type your question in the chat input
   - Examples:
     - "What is this document about?"
     - "Summarize the main points"
     - "What does it say about [topic]?"

4. **View Answers**
   - AI will stream the response word-by-word
   - Page number citations will be shown
   - You can ask follow-up questions

5. **Switch Models** (optional)
   - Use the model selector in the top-right
   - Try different models to compare responses

6. **Upload New Document**
   - Click "New Document" button in the header
   - Repeat the process with a different PDF

## 📱 Mobile/Responsive View

On smaller screens:
- Use the PDF/Chat tabs to switch between views
- Model selector remains accessible
- All features work the same

## 🐛 Troubleshooting

### "Cannot connect to Ollama"
**Problem:** The app can't reach Ollama at localhost:11434

**Solutions:**
1. Make sure Ollama is installed
2. Start Ollama: `ollama serve`
3. Check if models are downloaded: `ollama list`
4. Verify the service is running on port 11434

### "Scanned PDF Error"
**Problem:** PDF appears to be image-based

**Solution:**
- Only PDFs with selectable text work
- Test with a different PDF (try a downloaded article or report)
- Scanned documents require OCR, which is not implemented

### PDF Won't Load or Display
**Problem:** Blank screen or errors

**Solutions:**
1. Check browser console (F12) for errors
2. Try a smaller PDF file first
3. Ensure PDF is not corrupted
4. Clear browser cache and reload

### Slow Responses
**Problem:** AI takes a long time to respond

**Reasons:**
- Large models need more processing time
- Complex questions require more computation
- First query may be slower (model loading)

**Solutions:**
- Try the smaller model (gemma2:2b)
- Ask simpler, more focused questions
- Ensure your computer has adequate resources

## 🎨 Features Overview

### PDF Viewer
- 📄 Page navigation (previous/next)
- 🔍 Zoom in/out/reset
- 📱 Responsive canvas rendering
- 🖼️ Clean, professional interface

### Chat Interface
- 💬 Message history
- ⏱️ Real-time streaming responses
- 📍 Page number citations
- ⌨️ Easy-to-use input field
- 🔄 Loading states

### Landing Page
- 🎨 Beautiful gradient design
- 📤 Drag-and-drop upload
- ℹ️ Feature highlights
- 🎯 Clear value proposition

## 📊 Technical Details

**RAG (Retrieval Augmented Generation) Process:**
1. PDF text is extracted and chunked (500 words, 50 word overlap)
2. When you ask a question, relevant chunks are found using keyword matching
3. Top 3 chunks are sent to Ollama as context
4. AI generates an answer based only on those chunks
5. Response includes the page number where info was found

**Privacy & Security:**
- ✅ All processing happens in your browser
- ✅ No external API calls (except to local Ollama)
- ✅ PDFs never leave your computer
- ✅ No data collection or analytics
- ✅ 100% offline capable (after initial load)

## 📁 Project File Structure

```
docquery/
├── app/
│   ├── page.tsx          → Main component with upload/chat logic
│   ├── layout.tsx        → Root layout and metadata
│   └── globals.css       → Tailwind styles + animations
├── components/
│   ├── PDFViewer.tsx     → PDF rendering with zoom/navigation
│   ├── ChatInterface.tsx → Chat UI with streaming
│   ├── ModelSelector.tsx → Model dropdown
│   ├── UploadZone.tsx    → Beautiful landing page upload
│   └── Message.tsx       → Individual message component
├── lib/
│   ├── ollama.ts         → Ollama API with streaming
│   ├── pdfProcessor.ts   → PDF text extraction & chunking
│   └── ragUtils.ts       → Find relevant chunks, build prompts
└── types/
    └── index.ts          → TypeScript interfaces
```

## 🔧 Customization

### Change Chunk Size
Edit `lib/pdfProcessor.ts` line 45:
```typescript
chunkSize: number = 500,  // words per chunk
overlap: number = 50      // word overlap
```

### Add More Models
Edit `components/ModelSelector.tsx`:
```typescript
const MODELS = [
  { id: 'qwen2.5:3b', name: 'Qwen 2.5 (3B)' },
  { id: 'gemma2:2b', name: 'Gemma 2 (2B)' },
  { id: 'llama3:8b', name: 'Llama 3 (8B)' },  // Add here
];
```

### Adjust Number of Retrieved Chunks
Edit `components/ChatInterface.tsx` line 64:
```typescript
const relevantChunks = findRelevantChunks(question, chunks, 3); // Change 3 to desired number
```

## 🎓 Tips for Best Results

1. **Ask Specific Questions**: "What are the main findings?" works better than "Tell me about this"
2. **Reference Sections**: "Summarize the methodology section"
3. **Ask for Comparisons**: "Compare approaches A and B"
4. **Request Quotes**: "Find quotes about [topic]"
5. **Verify Citations**: Check the cited page numbers in the PDF viewer
6. **Try Different Models**: Each model has different strengths

## 📚 Sample Questions to Try

- "What is the main topic of this document?"
- "Summarize the key findings"
- "What methodology was used?"
- "List the main conclusions"
- "What does page X say about [topic]?"
- "Find information about [specific term]"
- "Explain [concept] as mentioned in the document"

## 🚀 Next Steps

Want to enhance the application? Consider:
- Adding OCR support for scanned PDFs (tesseract.js)
- Implementing semantic search (embeddings)
- Adding conversation memory
- Exporting chat history
- Saving document analysis
- Dark mode toggle
- Multiple document support
- Comparison features

## 📞 Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Review browser console for errors (F12)
3. Verify Ollama is running and models are downloaded
4. Try with a simple, small PDF first
5. Check that you're using a modern browser

## ✨ Enjoy DocQuery!

You now have a fully functional, privacy-focused PDF Q&A tool running locally on your machine. No subscriptions, no API keys, no cloud services required!

**Happy querying! 🎉**
