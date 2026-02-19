'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import UploadZone from '@/components/UploadZone';
// Dynamically import PDFViewer to avoid SSR issues with canvas/pdfjs
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), { ssr: false });
import ChatInterface from '@/components/ChatInterface';
import ModelSelector from '@/components/ModelSelector';
import { Chunk, PageText } from '@/types';

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [extractedPages, setExtractedPages] = useState<PageText[]>([]);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:3b');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobileView, setShowMobileView] = useState<'pdf' | 'chat' | 'debug'>('pdf');
  const [showDebug, setShowDebug] = useState(false);
  const [ocrPendingFile, setOcrPendingFile] = useState<File | null>(null);
  const [ocrStatus, setOcrStatus] = useState<{ page: number, total: number, status: string } | null>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsProcessing(true);
    setOcrPendingFile(null);

    try {
      // Dynamically import PDF processor and toast
      const { extractTextFromPDF, detectScannedPDF, chunkText } = await import('@/lib/pdfProcessor');
      const { toast } = await import('react-hot-toast');

      // Extract text from PDF
      const { pages, totalPages } = await extractTextFromPDF(file);
      setExtractedPages(pages);

      // Show toast if PDF is larger than 5 pages
      if (totalPages > 5) {
        toast.error(
          `Demo Limit: This PDF has ${totalPages} pages. Only the first 5 pages will be processed to maintain speed.`,
          {
            duration: 8000,
            icon: '⚠️',
            style: {
              borderRadius: '12px',
              background: '#fff7ed', // amber-50
              color: '#9a3412', // amber-800
              border: '2px solid #fbbf24', // amber-400
              fontWeight: 'bold',
              fontSize: '14px',
              padding: '16px',
            },
          }
        );
      }

      // Check if PDF is scanned
      if (detectScannedPDF(pages)) {
        setOcrPendingFile(file);
        setIsProcessing(false);
        return;
      }

      // Chunk the text
      const textChunks = chunkText(pages, 500, 50);

      setPdfFile(file);
      setChunks(textChunks);
    } catch (err) {
      setError(
        `Error processing PDF: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunOCR = async () => {
    if (!ocrPendingFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { extractTextFromPDFWithOCR, chunkText } = await import('@/lib/pdfProcessor');
      const { pages } = await extractTextFromPDFWithOCR(ocrPendingFile, (status) => {
        setOcrStatus(status);
      });

      setExtractedPages(pages);
      const textChunks = chunkText(pages, 500, 50);

      setPdfFile(ocrPendingFile);
      setChunks(textChunks);
      setOcrPendingFile(null);
    } catch (err) {
      setError(`OCR Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setOcrStatus(null);
    }
  };

  const handleNewDocument = () => {
    setPdfFile(null);
    setChunks([]);
    setExtractedPages([]);
    setError(null);
    setShowMobileView('pdf');
    setShowDebug(false);
    setOcrPendingFile(null);
    setOcrStatus(null);
  };

  // Show upload zone if no PDF is loaded
  if (!pdfFile && !ocrPendingFile) {
    return (
      <>
        <UploadZone onFileSelect={handleFileSelect} />

        {/* Processing overlay */}
        {isProcessing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center space-y-4">
              <svg className="w-16 h-16 mx-auto text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-800">
                {ocrStatus ? 'Performing OCR...' : 'Processing PDF...'}
              </h3>
              {ocrStatus ? (
                <div className="space-y-2">
                  <p className="text-gray-600">
                    {ocrStatus.status === 'rendering' ? 'Rendering page...' : 'Extracting text...'}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${(ocrStatus.page / ocrStatus.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-medium text-blue-600">
                    Page {ocrStatus.page} of {ocrStatus.total}
                  </p>
                </div>
              ) : (
                <p className="text-gray-600">Extracting text from the first 5 pages</p>
              )}
              <div className="text-xs text-amber-600 font-medium">Demo Version Limitation</div>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Error</h3>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={() => setError(null)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Scanned PDF Prompt
  if (ocrPendingFile && !pdfFile) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-amber-50 p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Scanned Document Detected</h3>
            <p className="text-gray-600">
              This PDF appears to be an image or scanned document. We can use OCR (Optical Character Recognition) to extract the text.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 flex gap-3 text-sm text-blue-700">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>OCR happens directly in your browser. This may take a moment depending on your device speed.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setOcrPendingFile(null)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleRunOCR}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : 'Run OCR'}
              </button>
            </div>
            <p className="text-center text-xs text-gray-400">
              Only the first 5 pages will be processed in this demo.
            </p>
          </div>
        </div>

        {/* OCR Processing Overlay (when triggered from within prompt) */}
        {isProcessing && ocrStatus && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center space-y-4 shadow-2xl">
              <div className="relative w-20 h-20 mx-auto">
                <svg className="w-full h-full text-blue-600 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-700">
                  {Math.round((ocrStatus.page / ocrStatus.total) * 100)}%
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Extracting Text...</h3>
              <p className="text-gray-600">
                {ocrStatus.status === 'rendering' ? `Preparing page ${ocrStatus.page}...` : `Reading page ${ocrStatus.page}...`}
              </p>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-700 h-full transition-all duration-500 ease-out shadow-inner"
                  style={{ width: `${(ocrStatus.page / ocrStatus.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 italic">This usually takes 2-5 seconds per page</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main interface with PDF loaded
  return (
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              QueryDoc
            </h1>
            <button
              onClick={handleNewDocument}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              New Document
            </button>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${showDebug ? 'bg-amber-600 text-white border border-amber-700 shadow-sm' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}
            >
              {showDebug ? 'Close Debug' : 'Debug Text'}
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile view toggle */}
            <div className="md:hidden flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setShowMobileView('pdf')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${showMobileView === 'pdf'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600'
                  }`}
              >
                PDF
              </button>
              <button
                onClick={() => setShowMobileView('debug')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${showMobileView === 'debug'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600'
                  }`}
              >
                Debug
              </button>
              <button
                onClick={() => setShowMobileView('chat')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${showMobileView === 'chat'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600'
                  }`}
              >
                Chat
              </button>
            </div>

            <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Desktop: Split view */}
        <div className="hidden md:flex w-full h-full">
          {/* PDF viewer - 60% standard, 35% debug mode */}
          <div className={`${showDebug ? 'w-[35%]' : 'w-3/5'} border-r border-gray-200 h-full transition-all duration-300`}>
            {pdfFile && <PDFViewer file={pdfFile} />}
          </div>

          {/* Debug middle column - only on desktop when debug is enabled */}
          {showDebug && (
            <div className="w-[30%] border-r border-gray-200 h-full flex flex-col bg-gray-50/50 transition-all duration-300">
              <div className="flex-shrink-0 px-4 py-3 bg-white border-b flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Extracted Content
                </h2>
                <button
                  onClick={() => {
                    setOcrPendingFile(pdfFile);
                    handleRunOCR();
                  }}
                  className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  Force OCR
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-8 scrollbar-thin">
                {extractedPages.map((page) => (
                  <div key={page.pageNumber} className="space-y-2">
                    <div className="flex items-center gap-2 sticky top-0 bg-transparent py-1">
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">
                        P{page.pageNumber}
                      </span>
                      <div className="flex-1 h-[1px] bg-gray-200"></div>
                    </div>
                    <div className="text-[11px] text-gray-600 leading-relaxed font-mono whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                      {page.text || <span className="italic text-gray-400">Empty</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat - 40% standard, 35% debug mode */}
          <div className={`${showDebug ? 'w-[35%]' : 'w-2/5'} h-full transition-all duration-300`}>
            <ChatInterface chunks={chunks} selectedModel={selectedModel} />
          </div>
        </div>

        {/* Mobile: Tabbed view */}
        <div className="md:hidden w-full h-full">
          {showMobileView === 'pdf' && pdfFile && <PDFViewer file={pdfFile} />}

          {showMobileView === 'debug' && (
            <div className="w-full h-full flex flex-col bg-gray-50">
              <div className="bg-white border-b px-4 py-2 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Extraction Debug</span>
                <button
                  onClick={() => {
                    setOcrPendingFile(pdfFile);
                    handleRunOCR();
                  }}
                  className="text-xs text-blue-600 font-bold"
                >
                  Force OCR
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-6">
                {extractedPages.map((page) => (
                  <div key={page.pageNumber} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">P{page.pageNumber}</span>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                    <div className="text-[12px] text-gray-700 font-mono whitespace-pre-wrap bg-white p-4 rounded-xl border">
                      {page.text || <span className="text-gray-400">Empty</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showMobileView === 'chat' && <ChatInterface chunks={chunks} selectedModel={selectedModel} />}
        </div>
      </div>
    </div>
  );
}
