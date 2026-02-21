'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { SelectionData } from '@/types';

/**
 * TextItem interface representing the structure returned by PDF.js getTextContent()
 */
interface TextItem {
    str: string;
    dir: string;
    width: number;
    height: number;
    transform: number[]; // [scaleX, skewX, skewY, scaleY, tx, ty]
    fontName: string;
}

interface TextLayerProps {
    page: any;
    viewport: any;
    scale: number;
    pageNumber: number;
    onSelectionChange?: (selection: SelectionData | null) => void;
}

/**
 * TextLayer component renders an invisible but selectable layer of text
 * aligned with the canvas-rendered PDF page.
 */
export default function TextLayer({ page, viewport, scale, pageNumber, onSelectionChange }: TextLayerProps) {
    const [textItems, setTextItems] = useState<TextItem[]>([]);
    const [hoveredBlockId, setHoveredBlockId] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchText = async () => {
            try {
                const content = await page.getTextContent();
                setTextItems(content.items as TextItem[]);
            } catch (error) {
                console.error("Error fetching text content:", error);
            }
        };
        fetchText();
    }, [page]);

    // Handle selection changes within this layer with debouncing
    useEffect(() => {
        let debounceTimer: NodeJS.Timeout;

        const handleSelection = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                    onSelectionChange?.(null);
                    return;
                }

                // SECURITY CHECK: Only trigger if the selection is actually inside this specific TextLayer
                // This prevents the popup from appearing when selecting text in Chat or Sidebar
                const isInside = containerRef.current?.contains(selection.anchorNode);
                if (!isInside) return;

                const range = selection.getRangeAt(0);
                const text = selection.toString();
                const rects = Array.from(range.getClientRects());

                onSelectionChange?.({ text, rects, pageNumber });
            }, 200); // 200ms debounce
        };

        document.addEventListener('selectionchange', handleSelection);
        return () => {
            document.removeEventListener('selectionchange', handleSelection);
            clearTimeout(debounceTimer);
        };
    }, [onSelectionChange, pageNumber]);

    // Group items into logical blocks based on vertical proximity
    const { itemsWithBlockId, blockRects } = useMemo(() => {
        if (textItems.length === 0) return { itemsWithBlockId: [], blockRects: {} };

        const baseItems = textItems.map((item, idx) => {
            const tx = item.transform[4];
            const ty = item.transform[5];
            const fontSize = item.transform[3];
            const [, top] = viewport.convertToViewportPoint(tx, ty + fontSize);
            const [left] = viewport.convertToViewportPoint(tx, ty);
            return {
                id: `p${pageNumber}-t${idx}`,
                text: item.str,
                left,
                top,
                fontSize: fontSize * scale,
                width: item.width * scale,
                scaleX: item.transform[0] / item.transform[3],
                fontFamily: item.fontName
            };
        });

        // Sort items: Primarily by TOP, secondarily by LEFT
        const sorted = [...baseItems].sort((a, b) => {
            if (Math.abs(a.top - b.top) < 2) return a.left - b.left;
            return a.top - b.top;
        });

        const rects: Record<number, { top: number; left: number; right: number; bottom: number }> = {};
        let currentBlockId = 0;
        let lastBottom = sorted[0].top + sorted[0].fontSize;

        const results = sorted.map((item, idx) => {
            if (idx > 0) {
                const gap = item.top - lastBottom;
                // Threshold: If the vertical gap is more than 0.7 * fontSize, it's a new block
                if (gap > item.fontSize * 0.7) {
                    currentBlockId++;
                }
            }

            // Update block bounding box
            const currentRect = rects[currentBlockId] || { top: Infinity, left: Infinity, right: -Infinity, bottom: -Infinity };
            rects[currentBlockId] = {
                top: Math.min(currentRect.top, item.top),
                left: Math.min(currentRect.left, item.left),
                right: Math.max(currentRect.right, item.left + item.width),
                bottom: Math.max(currentRect.bottom, item.top + item.fontSize),
            };

            lastBottom = Math.max(lastBottom, item.top + item.fontSize);
            return { ...item, blockId: currentBlockId };
        });

        return { itemsWithBlockId: results, blockRects: rects };
    }, [textItems, viewport, scale, pageNumber]);

    const handleBlockClick = (blockId: number) => {
        const blockItems = itemsWithBlockId.filter(item => item.blockId === blockId);
        const text = blockItems.map(item => item.text).join(' ');

        // Create DOMRect-like objects for the highlights
        // We need to provide these in screen coordinates for the HighlightLayer to work consistently
        // since PDFViewer handles the relative conversion.
        const containerRect = document.querySelector(`[data-page="${pageNumber}"]`)?.getBoundingClientRect();
        if (!containerRect) return;

        const rects = blockItems.map(item => {
            return new DOMRect(
                containerRect.left + item.left,
                containerRect.top + item.top,
                item.width,
                item.fontSize
            );
        });

        onSelectionChange?.({ text, rects, pageNumber });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const container = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - container.left;
        const y = e.clientY - container.top;

        // Find if we are over any block rect (with a small buffer for easier interaction)
        let foundBlockId = null;
        for (const [id, rect] of Object.entries(blockRects)) {
            const buffer = 4;
            if (
                x >= rect.left - buffer &&
                x <= rect.right + buffer &&
                y >= rect.top - buffer &&
                y <= rect.bottom + buffer
            ) {
                foundBlockId = parseInt(id);
                break;
            }
        }
        setHoveredBlockId(foundBlockId);
    };

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 pointer-events-auto select-text"
            data-page={pageNumber}
            style={{
                width: viewport.width,
                height: viewport.height,
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredBlockId(null)}
            onClick={(e) => {
                if (hoveredBlockId !== null) {
                    handleBlockClick(hoveredBlockId);
                } else {
                    // Clicked on text layer but not on a specific block
                    onSelectionChange?.(null);
                    window.getSelection()?.removeAllRanges();
                }
            }}
        >
            {/* Block Hover Highlight Background */}
            {hoveredBlockId !== null && blockRects[hoveredBlockId] && (
                <div
                    className="absolute bg-blue-500/5 ring-1 ring-blue-500/10 rounded-lg pointer-events-none transition-all duration-300 ease-out z-0 shadow-sm"
                    style={{
                        top: blockRects[hoveredBlockId].top - 4,
                        left: blockRects[hoveredBlockId].left - 8,
                        width: (blockRects[hoveredBlockId].right - blockRects[hoveredBlockId].left) + 16,
                        height: (blockRects[hoveredBlockId].bottom - blockRects[hoveredBlockId].top) + 8,
                    }}
                />
            )}

            {/* Individual selectable spans */}
            {itemsWithBlockId.map((item) => (
                <span
                    key={item.id}
                    className="absolute whitespace-pre origin-top-left pointer-events-none cursor-text text-transparent selection:bg-blue-400/30 z-10"
                    style={{
                        left: `${item.left}px`,
                        top: `${item.top}px`,
                        fontSize: `${item.fontSize}px`,
                        fontFamily: 'sans-serif',
                        transform: `scaleX(${item.scaleX})`,
                        width: `${item.width}px`,
                        height: `${item.fontSize}px`,
                        lineHeight: 1,
                    }}
                >
                    {item.text}
                </span>
            ))}
        </div>
    );
}
