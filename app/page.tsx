'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import UploadZone from '@/components/UploadZone';
import ChatInterface from '@/components/ChatInterface';
import ModelSelector from '@/components/ModelSelector';
import { Chunk, PageText, ManagedDocument } from '@/types';
import { savePDF, getPDF, saveState, getState, clearStorage, deletePDF } from '@/lib/storage';
import DocumentSidebar from '@/components/DocumentSidebar';
import SummaryPanel from '@/components/SummaryPanel';

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic<any>(() => import('@/components/PDFViewer'), { ssr: false });

export default function Home() {
  const [documents, setDocuments] = useState<ManagedDocument[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:3b');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobileView, setShowMobileView] = useState<'pdf' | 'chat' | 'debug'>('pdf');
  const [showDebug, setShowDebug] = useState(false);
  const [ocrPendingFile, setOcrPendingFile] = useState<File | null>(null);
  const [ocrStatus, setOcrStatus] = useState<{ page: number, total: number, status: string } | null>(null);
  const [autoOCRCountdown, setAutoOCRCountdown] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [chatWidth, setChatWidth] = useState(600); // Sensible fallback
  const [isResizing, setIsResizing] = useState(false);
  const [isChatBusy, setIsChatBusy] = useState(false);

  // Set default 50/50 split on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sidebarWidth = 260; // Approximate width of DocumentSidebar
      const availableWidth = window.innerWidth - sidebarWidth;
      setChatWidth(availableWidth / 2);
    }
  }, []);

  const activeDocument = documents.find(d => d.id === activeDocumentId) || null;

  // Optimized Resizing logic using rAF
  useEffect(() => {
    let animationFrameId: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const updateWidth = () => {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 300 && newWidth < 800) {
          setChatWidth(newWidth);
        }
      };

      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isResizing]);

  // Restore state on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const savedState = getState();
        if (savedState) {
          const docs: ManagedDocument[] = [];
          for (const docState of savedState.documents) {
            const file = await getPDF(docState.id);
            docs.push({
              ...docState,
              file
            } as ManagedDocument);
          }
          setDocuments(docs);
          setActiveDocumentId(savedState.activeDocumentId);
          setSelectedModel(savedState.selectedModel || 'qwen2.5:3b');
        }
      } catch (e) {
        console.error('Failed to restore state:', e);
      } finally {
        setIsRestoring(false);
      }
    };
    restore();
  }, []);

  // Debounced State Saving (to prevent lag during rapid updates)
  useEffect(() => {
    if (isRestoring || documents.length === 0) return;

    const timer = setTimeout(() => {
      saveState({
        documents: documents.map(({ file, ...rest }) => rest),
        activeDocumentId,
        selectedModel,
      });
      if (activeDocument && activeDocument.file) {
        savePDF(activeDocument.id, activeDocument.file);
      }
    }, 1000); // Wait 1s after last change before saving

    return () => clearTimeout(timer);
  }, [documents, activeDocumentId, selectedModel, isRestoring, activeDocument]);

  // Auto-run OCR Countdown
  useEffect(() => {
    if (autoOCRCountdown === null) return;
    if (autoOCRCountdown > 0) {
      const timer = setTimeout(() => setAutoOCRCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
      return () => clearTimeout(timer);
    } else if (ocrPendingFile) {
      handleRunOCR(ocrPendingFile);
      setAutoOCRCountdown(null);
    }
  }, [autoOCRCountdown, ocrPendingFile]);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsProcessing(true);
    setOcrPendingFile(null);
    setAutoOCRCountdown(null);
    const docId = `doc-${Date.now()}`;

    try {
      const { extractTextFromPDF, detectScannedPDF, chunkText } = await import('@/lib/pdfProcessor');
      const { toast } = await import('react-hot-toast');
      const { pages, totalPages } = await extractTextFromPDF(file);

      if (totalPages > 5) {
        toast.error(`Processed first 5 of ${totalPages} pages.`, { duration: 4000 });
      }

      if (detectScannedPDF(pages)) {
        setOcrPendingFile(file);
        setIsProcessing(false);
        setAutoOCRCountdown(3);
        return;
      }

      const textChunks = chunkText(pages, 100, 20).map(c => ({
        ...c,
        documentId: docId,
        documentName: file.name
      }));
      const newDoc: ManagedDocument = { id: docId, name: file.name, file, chunks: textChunks, extractedPages: pages, currentPage: 1 };

      setDocuments(prev => [...prev, newDoc]);

      // Don't switch if user is busy chatting, unless it's the very first document
      if (!isChatBusy || documents.length === 0) {
        setActiveDocumentId(docId);
      }

      await savePDF(docId, file);
      triggerSummary(newDoc, pages);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerSummary = async (doc: ManagedDocument, pages: PageText[]) => {
    setIsGeneratingSummary(true);
    try {
      const isCloud = selectedModel.includes(':cloud') || selectedModel.includes('llama-') || selectedModel.includes('mixtral-') || selectedModel.includes('gemma2-9b');
      const textToSum = pages.map(p => p.text).join('\n').substring(0, 4000);
      let summary = '';
      if (isCloud) {
        const { generateSummary: groqSum } = await import('@/lib/groq');
        summary = await groqSum(textToSum, selectedModel);
      } else {
        const { generateSummary: ollamaSum } = await import('@/lib/ollama');
        summary = await ollamaSum(textToSum, selectedModel);
      }
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, summary } : d));
    } catch (e) {
      console.error("Summary failed", e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleRunOCR = async (fileOverride?: File) => {
    const fileToProcess = fileOverride || ocrPendingFile;
    if (!fileToProcess) return;
    setIsProcessing(true);
    const docId = `doc-ocr-${Date.now()}`;
    try {
      const { extractTextFromPDFWithOCR, chunkText } = await import('@/lib/pdfProcessor');
      const { pages } = await extractTextFromPDFWithOCR(fileToProcess, (status) => setOcrStatus(status));
      const textChunks = chunkText(pages, 100, 20).map(c => ({
        ...c,
        documentId: docId,
        documentName: fileToProcess.name
      }));
      const newDoc: ManagedDocument = { id: docId, name: fileToProcess.name, file: fileToProcess, chunks: textChunks, extractedPages: pages, currentPage: 1 };
      setDocuments(prev => [...prev, newDoc]);

      // Don't switch if user is busy chatting
      if (!isChatBusy || documents.length === 0) {
        setActiveDocumentId(docId);
      }

      await savePDF(docId, fileToProcess);
      triggerSummary(newDoc, pages);
      setOcrPendingFile(null);
    } catch (err) {
      setError(`OCR Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsProcessing(false);
      setOcrStatus(null);
    }
  };

  const setDocumentPage = (id: string, page: number) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, currentPage: page } : d));
  };

  const handleDeleteDocument = async (id: string) => {
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);
    if (activeDocumentId === id) {
      setActiveDocumentId(updated[0]?.id || null);
    }
    await deletePDF(id);
  };

  const handleNewDocument = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) handleFileSelect(file);
    };
    input.click();
  };

  const allChunks = documents.flatMap(d => d.chunks);

  if (documents.length === 0 && !ocrPendingFile) {
    if (isRestoring) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="p-6"><h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">QueryDoc</h1></header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-xl w-full">
            <div className="text-center mb-10"><h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Your Private AI Library</h2><p className="text-gray-500 text-lg">Upload multiple PDFs to cross-reference them locally.</p></div>
            <UploadZone onFileSelect={handleFileSelect} />
          </div>
        </div>
      </div>
    );
  }

  if (ocrPendingFile && !activeDocument) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h3 className="text-xl font-bold">Scanned PDF Detected</h3>
          <p className="text-gray-500 text-sm">We need to run OCR to read this file. {autoOCRCountdown !== null ? `Starting in ${autoOCRCountdown}s...` : ''}</p>
          <button onClick={() => { setOcrPendingFile(null); setAutoOCRCountdown(null); }} className="w-full py-3 text-gray-500 font-medium">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden">
      <header className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">QueryDoc</h1>
            <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>
            <h2 className="text-sm font-bold text-gray-600 truncate max-w-[200px]">{activeDocument?.name || "Collection"}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block"><ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} /></div>
            <button onClick={() => setShowDebug(!showDebug)} className="hidden md:block p-2 text-gray-400 hover:text-blue-600 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg></button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <DocumentSidebar documents={documents} activeDocumentId={activeDocumentId} onSelect={setActiveDocumentId} onDelete={handleDeleteDocument} onUploadNew={handleNewDocument} />

        <div className="flex-1 flex overflow-hidden">
          <div className={`flex-1 h-full border-r border-gray-200 relative ${isResizing ? 'select-none pointer-events-none' : ''}`}>
            {activeDocument?.file ? (
              <PDFViewer
                key={activeDocument.id}
                file={activeDocument.file}
                initialPage={activeDocument.currentPage}
                onPageChange={(p: number) => setDocumentPage(activeDocument.id, p)}
              />
            ) : !isRestoring && activeDocument && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50">
                <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="font-bold">PDF File Missing</p>
                <p className="text-xs max-w-[200px]">The file could not be retrieved from your local storage. Try re-uploading.</p>
              </div>
            )}
          </div>

          {showDebug && (
            <div className="w-[30%] border-r border-gray-200 h-full flex flex-col bg-gray-50/50">
              <div className="p-4 border-b bg-white font-bold text-[10px] uppercase text-gray-400 tracking-widest flex justify-between items-center">
                Extracted Text
                {activeDocument?.file && <button onClick={() => handleRunOCR(activeDocument.file!)} className="text-blue-600 font-black">Run OCR</button>}
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {activeDocument?.extractedPages.map(page => (
                  <div key={page.pageNumber} className="p-3 bg-white border border-gray-100 rounded-lg text-[10px] font-mono whitespace-pre-wrap"><span className="font-black text-blue-600 mb-1 block">PAGE {page.pageNumber}</span>{page.text}</div>
                ))}
              </div>
            </div>
          )}

          {/* Resizer Handle */}
          <div
            className={`w-1.5 hover:w-2 bg-gray-200 hover:bg-blue-400 transition-all cursor-col-resize relative z-10 group ${isResizing ? 'bg-blue-500 w-2' : ''}`}
            onMouseDown={() => setIsResizing(true)}
          >
            <div className="absolute inset-y-0 -left-2 -right-2 bg-transparent" />
          </div>

          <div
            style={{ width: showDebug ? '35%' : `${chatWidth}px` }}
            className={`h-full flex flex-col p-4 bg-gray-50/30 transition-[width] duration-75 ${isResizing ? 'duration-0 select-none' : ''}`}
          >
            {activeDocument && <SummaryPanel summary={activeDocument.summary} fileName={activeDocument.name} isGenerating={isGeneratingSummary} />}
            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <ChatInterface chunks={allChunks} selectedModel={selectedModel} onModelChange={setSelectedModel} onBusyChange={setIsChatBusy} />
            </div>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-scaleIn">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{ocrStatus ? 'Intelligent OCR' : 'Processing PDF'}</h3>
            <p className="text-gray-500 text-sm">Running locally on your device...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"><h3 className="text-lg font-bold text-gray-900 mb-2">Error</h3><p className="text-gray-500 text-sm mb-6">{error}</p><button onClick={() => setError(null)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold">Dismiss</button></div>
        </div>
      )}
    </div>
  );
}
