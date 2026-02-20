'use client';

import { Message as MessageType } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useRef, useEffect } from 'react';
import { playTTS, stopTTS, pauseTTS, resumeTTS } from '@/lib/tts';

interface MessageProps {
    message: MessageType;
}

export default function Message({ message }: MessageProps) {
    const isUser = message.role === 'user';
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const messageRef = useRef<HTMLDivElement>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isPlaying) stopTTS();
        };
    }, [isPlaying]);

    // Spacebar to pause/resume
    useEffect(() => {
        if (!isPlaying) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName;
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

            if (e.code === 'Space') {
                e.preventDefault();
                if (isPaused) {
                    resumeTTS();
                    setIsPaused(false);
                } else {
                    pauseTTS();
                    setIsPaused(true);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, isPaused]);

    const clearHighlight = () => {
        // @ts-ignore
        if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
            // @ts-ignore
            CSS.highlights.delete('tts-highlight');
        }
    };

    const applyHighlight = (startIndex: number) => {
        if (!messageRef.current || typeof CSS === 'undefined' || !('highlights' in CSS)) return;

        const text = messageRef.current.textContent || '';
        if (!text) return;

        // Find sentence boundaries
        const textBefore = text.substring(0, startIndex);
        const matchStarts = [...textBefore.matchAll(/[.?!]\s+|\n+/g)];
        const sentenceStart = matchStarts.length > 0 ? matchStarts[matchStarts.length - 1].index! + matchStarts[matchStarts.length - 1][0].length : 0;

        const textAfter = text.substring(startIndex);
        const matchEnd = textAfter.match(/[.?!](\s+|$)|(\n+)/);
        const sentenceEnd = matchEnd ? startIndex + matchEnd.index! + matchEnd[0].length : text.length;

        const treeWalker = document.createTreeWalker(messageRef.current, NodeFilter.SHOW_TEXT);
        let currentIndex = 0;
        let startNode = null, endNode = null, startOff = 0, endOff = 0;

        while (treeWalker.nextNode()) {
            const node = treeWalker.currentNode;
            const nodeLen = node.textContent?.length || 0;

            if (!startNode && currentIndex + nodeLen > sentenceStart) {
                startNode = node;
                startOff = sentenceStart - currentIndex;
            }
            if (startNode && currentIndex + nodeLen >= sentenceEnd) {
                endNode = node;
                endOff = sentenceEnd - currentIndex;
                break;
            }
            currentIndex += nodeLen;
        }

        if (startNode && endNode) {
            try {
                const range = new Range();
                range.setStart(startNode, startOff);

                // Safety check in case sentenceEnd overshoots current text node length at the very end
                if (endOff > (endNode.textContent?.length || 0)) {
                    range.setEnd(endNode, endNode.textContent?.length || 0);
                } else {
                    range.setEnd(endNode, endOff);
                }

                // @ts-ignore
                const highlight = new Highlight(range);
                // @ts-ignore
                CSS.highlights.set('tts-highlight', highlight);

                // Auto-scroll logic safely
                const rect = range.getBoundingClientRect();
                if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
                    window.scrollBy({ top: rect.top - Math.max(100, window.innerHeight / 3), behavior: 'smooth' });
                }
            } catch (e) {
                console.error("Highlight error", e);
            }
        }
    };

    const startPlayback = (startIndex = 0) => {
        if (!messageRef.current) return;
        const fullText = messageRef.current.textContent || '';

        if (startIndex === 0 && isPlaying && !isPaused) {
            // Stop toggle
            stopTTS();
            setIsPlaying(false);
            setIsPaused(false);
            clearHighlight();
            return;
        }

        setIsPlaying(true);
        setIsPaused(false);

        playTTS(
            fullText,
            startIndex,
            (charIdx) => applyHighlight(charIdx),
            () => {
                setIsPlaying(false);
                setIsPaused(false);
                clearHighlight();
            },
            () => {
                setIsPlaying(false);
                setIsPaused(false);
                clearHighlight();
            }
        );
    };

    // Handle skip to section on click
    const handleMessageClick = (e: React.MouseEvent) => {
        if (!isPlaying || !messageRef.current) return;

        let range: Range | null = null;
        const docObj = document as any;

        if (docObj.caretRangeFromPoint) {
            range = docObj.caretRangeFromPoint(e.clientX, e.clientY);
        } else if (docObj.caretPositionFromPoint) {
            const pos = docObj.caretPositionFromPoint(e.clientX, e.clientY);
            if (pos) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
            }
        }

        if (range && messageRef.current.contains(range.startContainer)) {
            const treeWalker = document.createTreeWalker(messageRef.current, NodeFilter.SHOW_TEXT);
            let charCount = 0;

            while (treeWalker.nextNode()) {
                const node = treeWalker.currentNode;
                if (node === range.startContainer) {
                    charCount += range.startOffset;
                    break;
                }
                charCount += node.textContent?.length || 0;
            }

            const textBefore = messageRef.current.textContent?.substring(0, charCount) || '';
            const matchStarts = [...textBefore.matchAll(/[.?!]\s+|\n+/g)];
            const sentenceStart = matchStarts.length > 0 ? matchStarts[matchStarts.length - 1].index! + matchStarts[matchStarts.length - 1][0].length : 0;

            startPlayback(sentenceStart);
        }
    };

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}>
            {!isUser && (
                <style dangerouslySetInnerHTML={{ __html: `::highlight(tts-highlight) { background-color: #bfdbfe; color: #1e3a8a; }` }} />
            )}
            <div
                className={`
          relative max-w-[80%] rounded-2xl px-4 py-3 shadow-sm
          ${isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200 group transition-all duration-300'
                    }
        `}
            >
                {/* Message content */}
                <div
                    ref={messageRef}
                    onClick={handleMessageClick}
                    className={`text-sm break-words ${isPlaying && !isUser ? 'cursor-pointer hover:[&_*]:text-blue-900' : ''}`}
                >
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

                {/* Timestamp & Playback Toggle */}
                <div className={`text-xs mt-1 flex items-center justify-between ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
                    <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                    {!isUser && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isPlaying && (
                                <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mr-1 animate-pulse">
                                    {isPaused ? 'Paused (Space)' : 'Playing (Click to jump)'}
                                </span>
                            )}
                            <button
                                onClick={() => startPlayback(0)}
                                className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${isPlaying ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-gray-700'}`}
                                title={isPlaying ? "Stop reading" : "Read aloud"}
                            >
                                {isPlaying ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <rect x="6" y="6" width="12" height="12" rx="2" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
