'use client';

import { useState, useRef, useEffect } from 'react';
import { Message as MessageType, Chunk } from '@/types';
import Message from './Message';
import { queryOllama, checkOllamaStatus, getBaseUrl } from '@/lib/ollama';
import { queryGroq, getGroqUsage, incrementGroqUsage, GROQ_LIMIT } from '@/lib/groq';
import { findRelevantChunks, buildPrompt } from '@/lib/ragUtils';

interface ChatInterfaceProps {
    chunks: Chunk[];
    selectedModel: string;
    onModelChange?: (model: string) => void;
}

export default function ChatInterface({ chunks, selectedModel, onModelChange }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [isCloudMode, setIsCloudMode] = useState(
        selectedModel.includes('llama') ||
        selectedModel.includes('mixtral') ||
        selectedModel.includes('gemma2-9b')
    );
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsCloudMode(
            selectedModel.includes('llama') ||
            selectedModel.includes('mixtral') ||
            selectedModel.includes('gemma2-9b')
        );
    }, [selectedModel]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    // Restore messages on mount
    useEffect(() => {
        const saved = localStorage.getItem('querydoc_messages');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Convert string dates back to Date objects
                const formatted = parsed.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));
                setMessages(formatted);
            } catch (e) {
                console.error('Failed to parse saved messages:', e);
            }
        }
    }, []);

    // Save messages on change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('querydoc_messages', JSON.stringify(messages));
        }
    }, [messages]);

    const processQuestion = async (question: string) => {
        if (!question.trim() || isLoading) return;

        // Add user message
        const userMessage: MessageType = {
            id: Date.now().toString(),
            role: 'user',
            content: question,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        let effectiveModel = selectedModel;
        let effectiveIsCloud = isCloudMode;

        // Check if Ollama is running if we are NOT in cloud mode
        if (!effectiveIsCloud) {
            const isOllamaRunning = await checkOllamaStatus();
            if (!isOllamaRunning) {
                // Fallback to Groq if local is down
                const usage = getGroqUsage();
                if (usage >= GROQ_LIMIT) {
                    const errorMessage: MessageType = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: `❌ Local model is offline and Cloud Backup limit (5/5) has been reached. Please check your Ollama connection at ${getBaseUrl()}`,
                        timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    return;
                }

                // Switch to cloud mode automatically
                effectiveModel = 'llama-3.1-8b-instant';
                effectiveIsCloud = true;
                if (onModelChange) onModelChange('llama-3.1-8b-instant');

                const fallbackMessage: MessageType = {
                    id: (Date.now() + 1.1).toString(),
                    role: 'assistant',
                    content: `⚠️ Note: Local Ollama is offline. Automatically switched to Cloud Backup (Llama 8B). (Requests left: ${GROQ_LIMIT - usage})`,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, fallbackMessage]);
            }
        }

        // If in cloud mode, check usage limit
        if (effectiveIsCloud) {
            const usage = getGroqUsage();
            if (usage >= GROQ_LIMIT) {
                const limitMessage: MessageType = {
                    id: (Date.now() + 1.2).toString(),
                    role: 'assistant',
                    content: `❌ Cloud Backup limit reached (${GROQ_LIMIT}/${GROQ_LIMIT}). Please switch back to local models or check your Ollama connection.`,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, limitMessage]);
                return;
            }
        }

        setIsLoading(true);
        setStreamingContent('');

        // Dynamic import for toast
        const { toast } = await import('react-hot-toast');
        const loadingToast = toast.loading(`${effectiveIsCloud ? 'Cloud' : 'Local'} AI is thinking...`, {
            id: effectiveIsCloud ? '☁️' : '🧠',
        });

        try {
            // Find relevant chunks
            const relevantChunks = findRelevantChunks(question, chunks, 3);

            if (relevantChunks.length === 0) {
                throw new Error('No relevant content found in the document.');
            }

            // Get recent history
            const history = messages.slice(-4).map(m => ({
                role: m.role,
                content: m.content
            }));

            // Build prompt
            const prompt = buildPrompt(question, relevantChunks, history);

            // Query logic
            let fullResponse = '';
            let hasReceivedFirstToken = false;

            if (effectiveIsCloud) {
                await queryGroq(prompt, effectiveModel, (chunk: string) => {
                    if (!hasReceivedFirstToken) {
                        hasReceivedFirstToken = true;
                        toast.success(`Cloud AI responding!`, { id: loadingToast });
                    }
                    fullResponse += chunk;
                    setStreamingContent(fullResponse);
                });
                incrementGroqUsage();
            } else {
                await queryOllama(prompt, effectiveModel, (chunk: string) => {
                    if (!hasReceivedFirstToken) {
                        hasReceivedFirstToken = true;
                        toast.success(`${effectiveModel} loaded!`, { id: loadingToast });
                    }
                    fullResponse += chunk;
                    setStreamingContent(fullResponse);
                });
            }

            // Add assistant message
            const assistantMessage: MessageType = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: fullResponse,
                pageNumber: relevantChunks[0].pageNumber,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
            setStreamingContent('');
        } catch (error) {
            toast.error('Failed to get answer', { id: loadingToast });
            let displayError = error instanceof Error ? error.message : 'An unknown error occurred';

            if (displayError.toLowerCase().includes('memory')) {
                displayError += '\n\n💡 Tip: This model might be too heavy for your system. Try switching to "Gemma 2B" or "Groq Cloud" in the selector above.';
            }

            const errorMessage: MessageType = {
                id: (Date.now() + 3).toString(),
                role: 'assistant',
                content: displayError,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
            setStreamingContent('');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle "Ask AI" from PDF selection
    useEffect(() => {
        const handleAskAI = (event: any) => {
            const prompt = event.detail;
            if (prompt) {
                setInput(''); // Clear input box immediately
                processQuestion(prompt);
            }
        };

        window.addEventListener('ask-ai', handleAskAI);
        return () => window.removeEventListener('ask-ai', handleAskAI);
    }, [chunks, messages, selectedModel, isCloudMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const question = input.trim();
        setInput('');
        await processQuestion(question);
    };

    const [currentUrl, setCurrentUrl] = useState('');

    useEffect(() => {
        setCurrentUrl(getBaseUrl());
    }, []);

    const handleUrlChange = () => {
        const newUrl = window.prompt('Enter Ollama API URL (e.g., https://your-ngrok-url.ngrok-free.app):', currentUrl);
        if (newUrl) {
            localStorage.setItem('ollama_url', newUrl);
            setCurrentUrl(newUrl);
            setMessages(prev => prev.filter(m => !m.content.includes('Cannot connect to Ollama')));
        } else if (newUrl === '') {
            localStorage.removeItem('ollama_url');
            setCurrentUrl(getBaseUrl());
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Status Header */}
            <div className="bg-white border-b px-4 py-2 flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center gap-2">
                    {isCloudMode ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="font-medium text-blue-600">Groq Cloud Active • {getGroqUsage()}/{GROQ_LIMIT} Used</span>
                        </>
                    ) : (
                        <>
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="truncate max-w-[150px] sm:max-w-none">Ollama URL: {currentUrl}</span>
                        </>
                    )}
                </div>
                {!isCloudMode && (
                    <button
                        onClick={handleUrlChange}
                        className="text-blue-600 hover:text-blue-800 hover:underline shrink-0"
                    >
                        Change
                    </button>
                )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center space-y-2">
                            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-base font-medium">Ask a question about your document</p>
                            <p className="text-xs">I'll search through the PDF and provide answers with page citations.</p>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <Message key={message.id} message={message} />
                ))}

                {/* Streaming message */}
                {streamingContent && (
                    <div className="flex justify-start mb-4">
                        <div className="max-w-[80%] rounded-2xl px-4 py-3 shadow-sm bg-white text-gray-800 border border-gray-200">
                            <div className="text-sm whitespace-pre-wrap break-words">
                                {streamingContent}
                                <span className="inline-block w-2 h-4 bg-blue-600 ml-1 animate-pulse" />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-gray-200 bg-white p-4">
                <form
                    onSubmit={handleSubmit}
                    className="relative flex flex-col bg-white border-2 border-gray-200 rounded-2xl focus-within:border-blue-500/50 transition-all shadow-sm"
                >
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e as any);
                            }
                        }}
                        placeholder="Ask a question about this document..."
                        disabled={isLoading}
                        rows={1}
                        style={{ maxHeight: '340px' }}
                        className="
                            w-full px-4 py-3 bg-transparent resize-none
                            focus:outline-none disabled:cursor-not-allowed
                            min-h-[50px] overflow-y-auto custom-scrollbar
                            text-sm
                        "
                        ref={(el) => {
                            if (el) {
                                el.style.height = 'auto';
                                el.style.height = `${Math.min(el.scrollHeight, 340)}px`;
                            }
                        }}
                    />

                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-3 pb-3">
                        <div className="flex items-center gap-2">
                            {/* Fast/Quality Toggle Demo */}
                            <div className="flex items-center p-0.5 bg-gray-100 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => onModelChange?.('gemma2:2b')}
                                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${!isCloudMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Fast
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onModelChange?.('llama-3.1-8b-instant')}
                                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${isCloudMode ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'}`}
                                >
                                    Quality
                                </button>
                            </div>

                            <button type="button" className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>

                            <button type="button" className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="
                                p-2.5 bg-blue-600 text-white rounded-xl font-medium
                                hover:bg-blue-700 active:scale-95
                                disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
                                transition-all
                            "
                        >
                            {isLoading ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
