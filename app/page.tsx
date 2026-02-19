'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import UploadZone from '@/components/UploadZone';
// Dynamically import PDFViewer to avoid SSR issues with canvas/pdfjs
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), { ssr: false });
import ChatInterface from '@/components/ChatInterface';
import ModelSelector from '@/components/ModelSelector';
import { Chunk } from '@/types';

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:3b');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobileView, setShowMobileView] = useState<'pdf' | 'chat'>('pdf');

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      // Dynamically import PDF processor to avoid SSR issues
      const { extractTextFromPDF, detectScannedPDF, chunkText } = await import('@/lib/pdfProcessor');

      // Extract text from PDF
      const pages = await extractTextFromPDF(file);

      // Check if PDF is scanned
      if (detectScannedPDF(pages)) {
        setError(
          'This appears to be a scanned or image-based PDF. Please upload a text-based PDF document.'
        );
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

  const handleNewDocument = () => {
    setPdfFile(null);
    setChunks([]);
    setError(null);
    setShowMobileView('pdf');
  };

  // Show upload zone if no PDF is loaded
  if (!pdfFile) {
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
              <h3 className="text-xl font-semibold text-gray-800">Processing PDF...</h3>
              <p className="text-gray-600">Extracting and analyzing text</p>
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

  // Main interface with PDF loaded
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              DocQuery
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
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: Split view */}
        <div className="hidden md:flex w-full">
          {/* PDF viewer - 60% */}
          <div className="w-3/5 border-r border-gray-200">
            <PDFViewer file={pdfFile} />
          </div>

          {/* Chat - 40% */}
          <div className="w-2/5">
            <ChatInterface chunks={chunks} selectedModel={selectedModel} />
          </div>
        </div>

        {/* Mobile: Tabbed view */}
        <div className="md:hidden w-full">
          {showMobileView === 'pdf' ? (
            <PDFViewer file={pdfFile} />
          ) : (
            <ChatInterface chunks={chunks} selectedModel={selectedModel} />
          )}
        </div>
      </div>
    </div>
  );
}
