'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SummaryPanelProps {
    summary: string | undefined;
    fileName: string;
    isGenerating: boolean;
}

export default function SummaryPanel({ summary, fileName, isGenerating }: SummaryPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (!summary && !isGenerating) return null;

    return (
        <div className="mb-4 overflow-hidden border border-blue-100 rounded-2xl bg-gradient-to-br from-blue-50/50 to-white shadow-sm transition-all animate-fadeIn">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest text-left">Document Summary</h3>
                        <p className="text-[10px] text-blue-600 font-medium truncate max-w-[200px] text-left">{fileName}</p>
                    </div>
                </div>
                <svg
                    className={`w-4 h-4 text-blue-400 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {!isCollapsed && (
                <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-300">
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2 -mr-2">
                        {isGenerating ? (
                            <div className="space-y-3 py-2">
                                <div className="h-3 bg-blue-100/50 rounded-full w-3/4 animate-pulse"></div>
                                <div className="h-3 bg-blue-100/50 rounded-full w-full animate-pulse"></div>
                                <div className="h-3 bg-blue-100/50 rounded-full w-2/3 animate-pulse"></div>
                            </div>
                        ) : (
                            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed text-xs">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-sm font-bold text-gray-900 mt-3 mb-1" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-xs font-bold text-gray-900 mt-2 mb-1" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-[11px] font-bold text-gray-900 mt-2 mb-0.5" {...props} />,
                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />
                                    }}
                                >
                                    {summary || ''}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
