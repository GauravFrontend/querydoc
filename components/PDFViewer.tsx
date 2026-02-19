'use client';

import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import TextLayer from './pdf/TextLayer';
import HighlightLayer from './pdf/HighlightLayer';
import QuickActions from './pdf/QuickActions';
import { SelectionData, HighlightArea } from '@/types';

interface PDFViewerProps {
    file: File;
}

export default function PDFViewer({ file }: PDFViewerProps) {
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pageWrapperRef = useRef<HTMLDivElement>(null);

    const [pageProxy, setPageProxy] = useState<any>(null);
    const [viewport, setViewport] = useState<any>(null);
    const [selection, setSelection] = useState<SelectionData | null>(null);
    const [savedHighlights, setSavedHighlights] = useState<HighlightArea[]>([]);

    // Load PDF
    useEffect(() => {
        const loadPDF = async () => {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
        };

        loadPDF();
    }, [file]);

    // Render page
    useEffect(() => {
        let renderTask: any = null;

        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current) return;

            try {
                const page = await pdfDoc.getPage(currentPage);
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (!context) return;

                // Handle High DPI displays
                const outputScale = window.devicePixelRatio || 1;

                canvas.width = Math.floor(viewport.width * outputScale);
                canvas.height = Math.floor(viewport.height * outputScale);
                canvas.style.width = Math.floor(viewport.width) + "px";
                canvas.style.height = Math.floor(viewport.height) + "px";

                // Reset transform matrix to identity before rendering
                // This fixes potential mirroring issues from previous renders
                context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                renderTask = page.render(renderContext);
                await renderTask.promise;

                // Store page proxy and viewport for the text layer
                setPageProxy(page);
                setViewport(viewport);
                // Clear selection when changing page/zoom
                setSelection(null);
            } catch (error: any) {
                // Ignore cancellation errors
                if (error.name !== 'RenderingCancelledException') {
                    console.error('Render error:', error);
                }
            }
        };

        renderPage();

        return () => {
            if (renderTask) {
                renderTask.cancel();
            }
        };
    }, [pdfDoc, currentPage, scale]);

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(numPages, prev + 1));
    };

    const handleZoomIn = () => {
        setScale(prev => Math.min(3.0, prev + 0.2));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(0.5, prev - 0.2));
    };

    const handleZoomReset = () => {
        setScale(1.0);
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
                {/* Page navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Previous page"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">{currentPage}</span>
                        <span className="text-sm text-gray-500">/</span>
                        <span className="text-sm text-gray-500">{numPages}</span>
                    </div>

                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === numPages}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Next page"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleZoomOut}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Zoom out"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                        </svg>
                    </button>

                    <button
                        onClick={handleZoomReset}
                        className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Reset zoom"
                    >
                        {Math.round(scale * 100)}%
                    </button>

                    <button
                        onClick={handleZoomIn}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Zoom in"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* PDF Canvas */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto p-4 flex items-start justify-center min-h-0 relative select-none"
            >
                <div
                    ref={pageWrapperRef}
                    className="bg-white shadow-lg relative"
                    style={viewport ? { width: viewport.width, height: viewport.height } : {}}
                >
                    <canvas ref={canvasRef} className="max-w-full h-auto" />

                    {/* Text Selection Layer */}
                    {pageProxy && viewport && (
                        <TextLayer
                            page={pageProxy}
                            viewport={viewport}
                            scale={scale}
                            pageNumber={currentPage}
                            onSelectionChange={setSelection}
                        />
                    )}

                    {/* Highlight Layer */}
                    <HighlightLayer
                        rects={selection?.rects || []}
                        containerRef={pageWrapperRef}
                        persistentHighlights={savedHighlights.filter(h => h.pageNumber === currentPage)}
                    />

                    {/* Quick Actions Menu */}
                    {selection && selection.rects.length > 0 && (
                        <QuickActions
                            selection={selection}
                            onCopy={() => {
                                navigator.clipboard.writeText(selection.text);
                                setSelection(null);
                            }}
                            onHighlight={(color) => {
                                if (!pageWrapperRef.current) return;
                                const containerRect = pageWrapperRef.current.getBoundingClientRect();
                                const newHighlight: HighlightArea = {
                                    id: Date.now().toString(),
                                    pageNumber: currentPage,
                                    text: selection.text,
                                    color,
                                    rects: selection.rects.map(r => ({
                                        top: r.top - containerRect.top,
                                        left: r.left - containerRect.left,
                                        width: r.width,
                                        height: r.height
                                    }))
                                };
                                setSavedHighlights(prev => [...prev, newHighlight]);
                                setSelection(null);
                                window.getSelection()?.removeAllRanges();
                            }}
                            onAction={(action) => {
                                let prompt = '';
                                if (action === 'explain') prompt = `Explain this part of the document: "${selection.text}"`;
                                else if (action === 'summarize') prompt = `Summarize this section: "${selection.text}"`;
                                else if (action === 'rewrite') prompt = `Rewrite this more clearly: "${selection.text}"`;
                                else if (action === 'ask') prompt = `Regarding this: "${selection.text}", [your question]`;

                                const event = new CustomEvent('ask-ai', { detail: prompt });
                                window.dispatchEvent(event);
                                setSelection(null);
                                window.getSelection()?.removeAllRanges();
                            }}
                            onClose={() => setSelection(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
