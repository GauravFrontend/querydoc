Here is a concise list of the features available in the DocQuery application:

PDF Upload & Text Extraction: Easily upload PDF documents to extract text for analysis.
Scanned PDF Detection & Local OCR: Automatically detects unselectable text in scanned PDFs or images and runs a local automated OCR engine (Tesseract.js) to extract hidden text.
Local AI & RAG Chat: Chat with your documents completely privately using local AI models (via Ollama) powered by Retrieval-Augmented Generation (RAG).
Cloud Model Fallback: Includes a backup Groq Cloud model with rate limits for situations where local resources are unavailable or insufficient.
Side-by-Side PDF Viewer: View the original PDF document right beside your chat interface for easy referencing.
Cross-Session Persistence: Automatically saves your active PDF, extracted text, chat history, and the last page you viewed so you can pick up where you left off after refreshing.
Model Selection: Switch seamlessly between available local models and cloud models.
Extracted Text Debug View: Peek under the hood and view the raw extracted text from your document, with a quick option to trigger OCR to improve text quality manually.
Responsive Design: Adapts for both desktop (split-screen view) and mobile (tabbed view) for a seamless experience across devices.
Partial Processing for Speed (Demo Mode): Warns users if a PDF is long and limits processing to the first 5 pages to maintain quick performance.