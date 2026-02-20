'use client';

import { Message as MessageType } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageProps {
    message: MessageType;
}

export default function Message({ message }: MessageProps) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}>
            <div
                className={`
          max-w-[80%] rounded-2xl px-4 py-3 shadow-sm
          ${isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }
        `}
            >
                {/* Message content */}
                <div className="text-sm break-words">
                    {isUser ? (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                    ) : (
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2 mt-4" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2 mt-3" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1 mt-2" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
                                blockquote: ({ node, ...props }) => (
                                    <blockquote className="border-l-4 border-blue-200 pl-4 italic my-2 text-gray-600 bg-gray-50 py-2 rounded-r" {...props} />
                                ),
                                code: ({ node, inline, className, children, ...props }: any) => {
                                    return inline ? (
                                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600" {...props}>
                                            {children}
                                        </code>
                                    ) : (
                                        <div className="relative group">
                                            <pre className="bg-slate-900 text-slate-50 p-3 rounded-lg my-3 overflow-x-auto text-xs font-mono leading-relaxed">
                                                <code {...props}>{children}</code>
                                            </pre>
                                        </div>
                                    );
                                },
                                table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto my-4 rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200" {...props} />
                                    </div>
                                ),
                                th: ({ node, ...props }) => <th className="bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
                                td: ({ node, ...props }) => <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 border-t border-gray-100" {...props} />,
                                a: ({ node, ...props }) => <a className="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                                hr: ({ node, ...props }) => <hr className="my-4 border-gray-200" {...props} />,
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    )}
                </div>

                {/* Page number citation for assistant messages */}
                {!isUser && (
                    <div className="mt-3 overflow-hidden flex flex-col gap-2 border-t border-gray-200 pt-3">
                        {message.sourceChunks && message.sourceChunks.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sources</span>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(
                                        message.sourceChunks.reduce((acc, chunk) => {
                                            if (!acc[chunk.pageNumber]) acc[chunk.pageNumber] = [];
                                            acc[chunk.pageNumber].push(chunk);
                                            return acc;
                                        }, {} as Record<number, typeof message.sourceChunks>)
                                    ).map(([pageStr, chunksOnPage]) => {
                                        const pageNum = parseInt(pageStr);
                                        return (
                                            <button
                                                key={`page-${pageNum}`}
                                                onClick={() => {
                                                    // Trigger navigation & highlight for the first chunk on this page
                                                    // PDFViewer handles multiple highlights if we enhance it later, or we can just jump to page
                                                    const event = new CustomEvent('jump-to-source', { detail: chunksOnPage[0] });
                                                    window.dispatchEvent(event);
                                                }}
                                                className="px-3 py-1.5 text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                                                title={`View ${chunksOnPage.length} source(s) on Page ${pageNum}`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Page {pageNum}
                                                <span className="bg-blue-200/50 text-blue-800 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                                                    {chunksOnPage.length}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="text-xs text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                            {message.stats && (
                                <>
                                    <div className="flex items-center gap-1" title="Tokens generated in response">
                                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                        </svg>
                                        <span>{message.stats.eval_count} tokens</span>
                                    </div>
                                    <div className="flex items-center gap-1" title="Tokens in prompt/context">
                                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <span>{message.stats.prompt_eval_count} ctx</span>
                                    </div>
                                    <div className="flex items-center gap-1" title="Total generation time">
                                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{(message.stats.total_duration / 1e9).toFixed(2)}s</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Timestamp */}
                <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
}
