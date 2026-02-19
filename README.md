# QueryDoc - Local AI-Powered PDF Q&A

Ask questions to your PDF documents privately with 100% local AI processing using Ollama.

![QueryDoc](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## 🌟 Features

- **📄 PDF Upload & Processing**: Drag-and-drop or file picker for PDF files
- **🔍 Text Extraction**: Extract and chunk text from PDFs using pdf.js
- **💬 Chat Interface**: Ask questions about your documents with streaming responses
- **🎯 Page Citations**: Get answers with references to specific page numbers
- **🔒 100% Private**: All processing happens locally - no external API calls
- **🤖 Multi-Model Support**: Switch between different Ollama models (qwen2.5:3b, gemma2:2b)
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **⚡ Real-time Streaming**: See AI responses as they're generated

## 🚀 Prerequisites

Before running QueryDoc, ensure you have:

1. **Node.js 18+** installed
2. **Ollama** installed and running locally

### Installing Ollama

1. Download and install Ollama from [ollama.ai](https://ollama.ai)
2. Pull the required models:

```bash
ollama pull qwen2.5:3b
ollama pull gemma2:2b
```

3. Verify Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

## 📦 Installation

1. Clone the repository and navigate to the project:

```bash
cd QueryDoc
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎯 How to Use

1. **Upload a PDF**: Drag and drop a PDF file or click to select one
   - ⚠️ Only text-based PDFs are supported (no scanned/image PDFs)

2. **Ask Questions**: Type your question in the chat interface
   - Example: "What are the key findings in this document?"
   - Example: "Summarize the introduction section"

3. **View Answers**: Get AI-generated answers with page number citations

4. **Switch Models**: Use the model selector to try different AI models

5. **New Document**: Click "New Document" to upload a different PDF

## 🏗️ Project Structure

```
QueryDoc/
├── app/
│   ├── page.tsx              # Main app component
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── PDFViewer.tsx         # PDF rendering component
│   ├── ChatInterface.tsx     # Chat UI and message handling
│   ├── ModelSelector.tsx     # Model dropdown
│   ├── UploadZone.tsx        # File upload interface
│   └── Message.tsx           # Individual message component
├── lib/
│   ├── ollama.ts             # Ollama API integration
│   ├── pdfProcessor.ts       # PDF text extraction
│   └── ragUtils.ts           # RAG (Retrieval Augmented Generation)
└── types/
    └── index.ts              # TypeScript interfaces
```

## 🛠️ Technical Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF Processing**: pdfjs-dist
- **AI**: Local Ollama API
- **Architecture**: Client-side RAG (Retrieval Augmented Generation)

## 🔧 How It Works

1. **PDF Processing**: 
   - Text is extracted from PDF using pdf.js
   - Text is chunked into ~500 word segments with 50 word overlap
   - Chunks are stored with page number metadata

2. **Question Answering**:
   - User question is analyzed for keywords
   - Top 3 most relevant chunks are retrieved
   - Context + question is sent to local Ollama model
   - Response is streamed back word-by-word

3. **RAG Pipeline**:
   ```
   User Question → Find Relevant Chunks → Build Prompt → 
   Query Ollama → Stream Response → Display with Citations
   ```

## ⚠️ Limitations

- **Text-based PDFs only**: Scanned/image-based PDFs are not supported (no OCR)
- **Local AI required**: Ollama must be running at http://localhost:11434
- **Simple keyword matching**: Advanced semantic search not implemented
- **No persistence**: Documents and chat history are not saved

## 🎨 Customization

### Adding More Models

Edit `components/ModelSelector.tsx`:

```typescript
const MODELS = [
  { id: 'qwen2.5:3b', name: 'Qwen 2.5 (3B)' },
  { id: 'gemma2:2b', name: 'Gemma 2 (2B)' },
  { id: 'llama3:8b', name: 'Llama 3 (8B)' },  // Add new model
];
```

### Adjusting Chunk Size

Edit `lib/pdfProcessor.ts`:

```typescript
export function chunkText(
  pages: PageText[],
  chunkSize: number = 500,  // Adjust this
  overlap: number = 50      // and this
): Chunk[]
```

## ☁️ Deploy to Vercel with Local Ollama

To use this app on Vercel while keeping your data local with Ollama:

1.  **Configure Ollama for External Access**:
    Ollama by default only listens to localhost. To allow access from Vercel (via a tunnel), you must set the `OLLAMA_ORIGINS` environment variable.

    **Windows (PowerShell)**:
    ```powershell
    $env:OLLAMA_ORIGINS="*"; ollama serve
    ```

    **Mac/Linux**:
    ```bash
    OLLAMA_ORIGINS="*" ollama serve
    ```

2.  **Expose Ollama to the Internet**:
    Since Vercel cannot access your `localhost`, you need a tunnel. We recommend [ngrok](https://ngrok.com/).

    ```bash
    ngrok http 11434
    ```

    Copy the forwarded URL (e.g., `https://your-id.ngrok-free.app`).

3.  **Deploy to Vercel**:
    - Push your code to GitHub.
    - Import the project into Vercel.
    - Deploy!

4.  **Connect the App**:
    - Open your Vercel deployment URL on any device.
    - Click "Change" in the top header next to "Ollama URL".
    - Paste your **HTTPS Ngrok URL** (e.g., `https://your-id.ngrok-free.app`).
    - Start chat!

    > **Note**: Free ngrok URLs change every time you restart ngrok. You will need to update the URL in the app settings whenever you restart the tunnel.

## 📝 Build for Production


```bash
npm run build
npm start
```

## 🐛 Troubleshooting

### "Cannot connect to Ollama"
- Ensure Ollama is running: `ollama serve`
- Check if models are pulled: `ollama list`
- Verify port 11434 is accessible

### "Scanned PDF error"
- Only text-based PDFs work
- Try using a different PDF with selectable text

### PDF not rendering
- Check browser console for errors
- Ensure pdf.js worker is loading correctly

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) - Local AI inference
- [pdf.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [Next.js](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Styling

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

**Built with ❤️ for privacy-focused AI document analysis**
