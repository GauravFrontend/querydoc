'use client';

import { Message as MessageType } from '@/types';

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
                <div className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                </div>

                {/* Page number citation for assistant messages */}
                {!isUser && message.pageNumber && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Source: Page {message.pageNumber}</span>
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
