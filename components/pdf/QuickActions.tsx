'use client';

import React from 'react';
import { SelectionData } from '@/types';

interface QuickActionsProps {
    selection: SelectionData;
    onAction: (action: 'explain' | 'summarize' | 'rewrite' | 'ask') => void;
    onHighlight: (color: string) => void;
    onCopy: () => void;
    onClose: () => void;
}

const COLORS = [
    { name: 'Red', bg: 'bg-[#ef4444]', ring: 'ring-red-500/20' },
    { name: 'Orange', bg: 'bg-[#f97316]', ring: 'ring-orange-500/20' },
    { name: 'Yellow', bg: 'bg-[#facc15]', ring: 'ring-yellow-500/20' },
    { name: 'Green', bg: 'bg-[#22c55e]', ring: 'ring-green-500/20' },
    { name: 'Blue', bg: 'bg-[#3b82f6]', ring: 'ring-blue-500/20' },
    { name: 'Purple', bg: 'bg-[#a855f7]', ring: 'ring-purple-500/20' },
    { name: 'Pink', bg: 'bg-[#ec4899]', ring: 'ring-pink-500/20' },
];

export default function QuickActions({ selection, onAction, onHighlight, onCopy, onClose }: QuickActionsProps) {
    if (!selection || selection.rects.length === 0) return null;

    // Position the menu above the first rect
    const firstRect = selection.rects[0];

    return (
        <div
            className="fixed z-[100] bg-[#1e293b] text-white shadow-2xl rounded-xl p-1 flex flex-col gap-1 w-[260px] animate-in fade-in zoom-in duration-200"
            style={{
                top: Math.max(10, firstRect.top - 90),
                left: firstRect.left + (firstRect.width / 2) - 130,
            }}
        >
            {/* AI Commands Row */}
            <div className="flex items-center px-1 h-8">
                <button
                    onClick={() => onAction('explain')}
                    className="flex-1 text-[13px] font-medium hover:bg-white/10 py-1 rounded-md transition-colors"
                >
                    Explain
                </button>
                <div className="w-px h-4 bg-white/10 mx-0.5" />
                <button
                    onClick={() => onAction('summarize')}
                    className="flex-1 text-[13px] font-medium hover:bg-white/10 py-1 rounded-md transition-colors"
                >
                    Summarize
                </button>
                <div className="w-px h-4 bg-white/10 mx-0.5" />
                <button
                    onClick={() => onAction('rewrite')}
                    className="flex-1 text-[13px] font-medium hover:bg-white/10 py-1 rounded-md transition-colors"
                >
                    Rewrite
                </button>
            </div>

            <div className="h-px bg-white/5 mx-1" />

            {/* Colors & Utilities Row */}
            <div className="flex items-center gap-1.5 px-2 py-1.5">
                {COLORS.map((color) => (
                    <button
                        key={color.name}
                        onClick={() => onHighlight(color.bg.replace('bg-[', '').replace(']', ''))}
                        className={`w-4 h-4 rounded-full ${color.bg} hover:ring-2 hover:ring-offset-2 hover:ring-offset-[#1e293b] ring-white/20 transition-all`}
                        title={color.name}
                    />
                ))}

                <div className="flex-1" />

                <button
                    onClick={() => onAction('ask')}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                    title="Ask AI"
                >
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </button>

                <button
                    onClick={onCopy}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                    title="Copy Text"
                >
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
