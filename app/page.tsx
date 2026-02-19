'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import UploadZone from '@/components/UploadZone';
// Dynamically import PDFViewer to avoid SSR issues with canvas/pdfjs
const PDFViewer = dynamic<any>(() => import('@/components/PDFViewer'), { ssr: false });
import ChatInterface from '@/components/ChatInterface';
import ModelSelector from '@/components/ModelSelector';
import { Chunk, PageText } from '@/types';
import { savePDF, getPDF, saveState, getState, clearStorage } from '@/lib/storage';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore state on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const savedState = getState();
        const savedFile = await getPDF();
        if (savedState && savedFile) {
          setPdfFile(savedFile);
          setChunks(savedState.chunks);
          setExtractedPages(savedState.extractedPages);
          setSelectedModel(savedState.selectedModel);
          setCurrentPage(savedState.currentPage || 1);
        }
      } catch (e) {
        console.error('Failed to restore state:', e);
      } finally {
        setIsRestoring(false);
      }
    };
    restore();
  }, []);

  // Save state when it changes
  useEffect(() => {
    if (!isRestoring && pdfFile && chunks.length > 0) {
      saveState({
        chunks,
        extractedPages,
        selectedModel,
        currentPage
      });
      savePDF(pdfFile);
    }
  }, [pdfFile, chunks, extractedPages, selectedModel, isRestoring, currentPage]);

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
      setCurrentPage(1);
    } catch (err) {
      setError(
        `Error processing PDF: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunOCR = async (fileOverride?: File) => {
    console.log('--- OCR Force Triggered ---');
    const fileToProcess = fileOverride || ocrPendingFile;
    console.log('File to process:', fileToProcess?.name);

    if (!fileToProcess) {
      console.error('No file found for OCR');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('Importing OCR processor...');
      const { extractTextFromPDFWithOCR, chunkText } = await import('@/lib/pdfProcessor');

      console.log('Starting OCR extraction...');
      const { pages } = await extractTextFromPDFWithOCR(fileToProcess, (status) => {
        console.log(`OCR Progress: Page ${status.page}/${status.total} - ${status.status}`);
        setOcrStatus(status);
      });

      console.log('OCR Complete. Extracted pages:', pages.length);
      setExtractedPages(pages);
      const textChunks = chunkText(pages, 500, 50);

      setPdfFile(fileToProcess);
      setChunks(textChunks);
      setCurrentPage(1);
      setOcrPendingFile(null);
    } catch (err) {
      console.error('OCR Error detail:', err);
      setError(`OCR Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setOcrStatus(null);
      console.log('--- OCR Finished ---');
    }
  };

  const handleNewDocument = () => {
    clearStorage();
    setPdfFile(null);
    setChunks([]);
    setExtractedPages([]);
    setError(null);
    setShowMobileView('pdf');
    setShowDebug(false);
    setOcrPendingFile(null);
    setOcrStatus(null);
    setCurrentPage(1);
  };

  // No PDF layout
  if (!pdfFile && !ocrPendingFile) {
    if (isRestoring) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }
    return (
      <>
        <UploadZone onFileSelect={handleFileSelect} />
        {/* Global Overlays (Processing/Error) are rendered at the bottom now */}
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
                onClick={() => handleRunOCR()}
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
          <div className="flex items-center gap-1 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent shrink-0">
              Query<span className="hidden sm:inline">Doc</span>
            </h1>
            <button
              onClick={handleNewDocument}
              className="p-2 sm:px-4 sm:py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 shrink-0"
              title="New Document"
            >
              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">New Document</span>
            </button>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`hidden md:block px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${showDebug
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }`}
            >
              {showDebug ? 'Hide Text' : 'View Text'}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile view toggle - more compact */}
            <div className="md:hidden flex bg-gray-100 rounded-lg p-0.5 border border-gray-200 whitespace-nowrap">
              {['pdf', 'chat'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setShowMobileView(tab as any)}
                  className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-tight transition-all ${showMobileView === tab
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="hidden sm:block">
              <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Desktop: Split view */}
        <div className="hidden md:flex w-full h-full">
          {/* PDF viewer - 60% standard, 35% debug mode */}
          <div className={`${showDebug ? 'w-[35%]' : 'w-3/5'} border-r border-gray-200 h-full transition-all duration-300`}>
            {pdfFile && <PDFViewer file={pdfFile} initialPage={currentPage} onPageChange={setCurrentPage} />}
          </div>

          {/* Debug middle column - only on desktop when debug is enabled */}
          {showDebug && (
            <div className="w-[30%] border-r border-gray-200 h-full flex flex-col bg-gray-50/50 transition-all duration-300">
              <div className="flex-shrink-0 px-4 py-3 bg-white border-b flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Extracted Text
                </h2>
                <button
                  onClick={() => {
                    if (pdfFile) handleRunOCR(pdfFile);
                  }}
                  className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded border border-blue-700 hover:bg-blue-700 transition-all shadow-sm"
                  title="Run OCR to fix poor quality text extraction"
                >
                  IMPROVE QUALITY (OCR)
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
            <ChatInterface chunks={chunks} selectedModel={selectedModel} onModelChange={setSelectedModel} />
          </div>
        </div>

        {/* Mobile: Tabbed view */}
        <div className="md:hidden w-full h-full">
          {showMobileView === 'pdf' && pdfFile && (
            <div className="relative w-full h-full">
              <PDFViewer file={pdfFile} initialPage={currentPage} onPageChange={setCurrentPage} />

              {/* Floating action button to see text on mobile */}
              <button
                onClick={() => setShowDebug(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform sm:hidden"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
          )}

          {/* Mobile Text Overlay (Slide-up Panel) */}
          <div
            className={`fixed inset-0 z-[60] bg-black/60 transition-opacity duration-300 md:hidden ${showDebug && showMobileView !== 'chat' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            onClick={() => setShowDebug(false)}
          >
            <div
              className={`absolute bottom-0 left-0 right-0 bg-gray-50 rounded-t-[32px] overflow-hidden transition-transform duration-500 ease-out h-[85dvh] flex flex-col ${showDebug && showMobileView !== 'chat' ? 'translate-y-0' : 'translate-y-full'
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-4 shrink-0" onClick={() => setShowDebug(false)} />

              <div className="px-6 py-2 flex justify-between items-center bg-white border-b shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-black text-gray-800 uppercase tracking-widest">Document Content</span>
                </div>
                <button
                  onClick={() => {
                    if (pdfFile) handleRunOCR(pdfFile);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-[11px] font-black rounded-full shadow-lg active:scale-95 transition-transform"
                >
                  FIX TEXT (OCR)
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-6 pb-32">
                {extractedPages.map((page) => (
                  <div key={page.pageNumber} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-gray-900 text-white text-[10px] font-black rounded-lg uppercase tracking-wider">Page {page.pageNumber}</span>
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <span className="text-[10px] font-mono text-gray-400">{page.text.length} characters</span>
                    </div>
                    <div className="text-[14px] text-gray-700 font-mono leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      {page.text || <span className="text-gray-300 italic">Processing unsuccessful. Try "Fix Text".</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {showMobileView === 'chat' && <ChatInterface chunks={chunks} selectedModel={selectedModel} onModelChange={setSelectedModel} />}
        </div>
      </div>

      {/* GLOBAL OVERLAYS - Moved outside main conditional blocks */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[100]">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-scaleIn">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <svg className="w-full h-full text-blue-600 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {ocrStatus && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-700">
                    {Math.round((ocrStatus.page / ocrStatus.total) * 100)}%
                  </span>
                </div>
              )}
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">
              {ocrStatus ? 'Intelligent OCR' : 'Processing PDF'}
            </h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              {ocrStatus
                ? `${ocrStatus.status === 'rendering' ? 'Capturing image' : 'Analyzing text'} of page ${ocrStatus.page}...`
                : 'Extracting clean text for AI analysis...'}
            </p>
            {ocrStatus && (
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                  style={{ width: `${(ocrStatus.page / ocrStatus.total) * 100}%` }}
                />
              </div>
            )}
            <div className="text-[10px] uppercase tracking-widest text-amber-600 font-black">
              DEMO: PROCESSING FIRST 5 PAGES
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto bg-red-50 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
