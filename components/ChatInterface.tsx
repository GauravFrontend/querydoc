'use client';

import { useState, useRef, useEffect } from 'react';
import { Message as MessageType, Chunk } from '@/types';
import Message from './Message';
import { queryOllama, checkOllamaStatus, getBaseUrl } from '@/lib/ollama';
import { findRelevantChunks, buildPrompt } from '@/lib/ragUtils';

interface ChatInterfaceProps {
    chunks: Chunk[];
    selectedModel: string;
}

export default function ChatInterface({ chunks, selectedModel }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

        // Check if Ollama is running
        const isOllamaRunning = await checkOllamaStatus();
        if (!isOllamaRunning) {
            const errorMessage: MessageType = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ Cannot connect to Ollama. Please ensure Ollama is running at ${getBaseUrl()}`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
            return;
        }

        setIsLoading(true);
        setStreamingContent('');

        // Dynamic import for toast
        const { toast } = await import('react-hot-toast');
        const loadingToast = toast.loading(`Waking up ${selectedModel}...`, {
            icon: '🧠',
        });

        try {
            // Find relevant chunks
            const relevantChunks = findRelevantChunks(question, chunks, 3);

            if (relevantChunks.length === 0) {
                throw new Error('No relevant content found in the document.');
            }

            // Build prompt
            const prompt = buildPrompt(question, relevantChunks);

            // Query Ollama with streaming
            let fullResponse = '';
            let hasReceivedFirstToken = false;

            await queryOllama(prompt, selectedModel, (chunk) => {
                if (!hasReceivedFirstToken) {
                    hasReceivedFirstToken = true;
                    toast.success(`${selectedModel} loaded!`, {
                        id: loadingToast,
                    });
                }
                fullResponse += chunk;
                setStreamingContent(fullResponse);
            });

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
            const errorMessage: MessageType = {
                id: (Date.now() + 3).toString(),
                role: 'assistant',
                content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
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
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>Ollama URL: {currentUrl}</span>
                </div>
                <button
                    onClick={handleUrlChange}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                    Change
                </button>
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
