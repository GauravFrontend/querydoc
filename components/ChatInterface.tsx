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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!input.trim() || isLoading) return;

        const question = input.trim();
        setInput('');

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

                // Switch to cloud mode automatically - use the fastest Llama model for fallback
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
            icon: effectiveIsCloud ? '☁️' : '🧠',
        });

        try {
            // Find relevant chunks
            const relevantChunks = findRelevantChunks(question, chunks, 3);

            if (relevantChunks.length === 0) {
                throw new Error('No relevant content found in the document.');
            }

            // Build prompt
            const prompt = buildPrompt(question, relevantChunks);

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

            // Suggest switching models if it's a memory issue
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

    const [currentUrl, setCurrentUrl] = useState('');

    useEffect(() => {
        setCurrentUrl(getBaseUrl());
    }, []);

    const handleUrlChange = () => {
        const newUrl = window.prompt('Enter Ollama API URL (e.g., https://your-ngrok-url.ngrok-free.app):', currentUrl);
        if (newUrl) {
            localStorage.setItem('ollama_url', newUrl);
            setCurrentUrl(newUrl);
            // Clear previous error messages if any
            setMessages(prev => prev.filter(m => !m.content.includes('Cannot connect to Ollama')));
        } else if (newUrl === '') {
            // Reset to default
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
                            <p className="text-lg font-medium">Ask a question about your document</p>
                            <p className="text-sm">I'll search through the PDF and provide answers with page citations.</p>
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
                            <div className="whitespace-pre-wrap break-words">
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
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about this document..."
                        disabled={isLoading}
                        className="
              flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              transition-all
            "
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="
              px-6 py-3 bg-blue-600 text-white rounded-xl font-medium
              hover:bg-blue-700 active:scale-95
              disabled:bg-gray-300 disabled:cursor-not-allowed
              transition-all
            "
                    >
                        {isLoading ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            'Send'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
