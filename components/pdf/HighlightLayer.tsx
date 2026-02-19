'use client';

import React from 'react';
import { HighlightArea } from '@/types';

interface HighlightLayerProps {
    /**
     * Array of DOMRects representing the selection areas.
     * These are usually from window.getSelection().getRangeAt(0).getClientRects()
     */
    rects: DOMRect[];
    /**
     * Ref to the container that is positioned relative, 
     * which the highlights will be positioned within.
     */
    containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * HighlightLayer component draws semi-transparent rectangles over selected text.
 */
export default function HighlightLayer({ rects, containerRef, persistentHighlights = [] }: HighlightLayerProps & { persistentHighlights?: HighlightArea[] }) {
    if (!containerRef.current) return null;

    // Get the bounding box of the container to calculate relative offsets
    const containerRect = containerRef.current.getBoundingClientRect();

    return (
        <div className="absolute inset-0 pointer-events-none z-10">
            {/* Active Selection Highlights */}
            {rects.map((rect, idx) => {
                const top = rect.top - containerRect.top;
                const left = rect.left - containerRect.left;
                if (top < 0 || left < 0) return null;

                return (
                    <div
                        key={`selection-${idx}`}
                        className="absolute bg-blue-500/30 ring-1 ring-blue-500/10 pointer-events-none rounded-sm transition-opacity duration-150"
                        style={{
                            top: `${top}px`,
                            left: `${left}px`,
                            width: `${rect.width}px`,
                            height: `${rect.height}px`,
                        }}
                    />
                );
            })}

            {/* Persistent Saved Highlights */}
            {persistentHighlights.map((hl) => (
                hl.rects.map((rect, idx) => (
                    <div
                        key={`saved-${hl.id}-${idx}`}
                        className="absolute pointer-events-none rounded-sm opacity-40 mix-blend-multiply"
                        style={{
                            top: `${rect.top}px`,
                            left: `${rect.left}px`,
                            width: `${rect.width}px`,
                            height: `${rect.height}px`,
                            backgroundColor: hl.color || '#facc15',
                        }}
                    />
                ))
            ))}
        </div>
    );
}
