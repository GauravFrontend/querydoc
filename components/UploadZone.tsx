'use client';

import { useCallback, useState } from 'react';

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
}

export default function UploadZone({ onFileSelect }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            onFileSelect(file);
        } else {
            alert('Please upload a PDF file');
        }
    }, [onFileSelect]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    }, [onFileSelect]);

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4">
            <div className="max-w-2xl w-full text-center space-y-8">
                {/* Header */}
                <div className="space-y-3">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                        QueryDoc
                    </h1>
                    <p className="text-xl text-gray-600">
                        Ask questions to your documents privately - 100% local AI
                    </p>
                </div>

                {/* Upload Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
            relative border-3 border-dashed rounded-2xl p-16 transition-all duration-300
            ${isDragging
                            ? 'border-blue-500 bg-blue-50 scale-105'
                            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'
                        }
          `}
                >
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileInput}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="file-input"
                    />

                    <div className="space-y-6">
                        {/* Icon */}
                        <div className="flex justify-center">
                            <svg
                                className={`w-20 h-20 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                        </div>

                        {/* Text */}
                        <div className="space-y-2">
                            <p className="text-lg font-medium text-gray-700">
                                Drop your PDF here or{' '}
                                <label htmlFor="file-input" className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                                    choose a file
                                </label>
                            </p>
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-sm text-gray-500">
                                    Text-based PDFs only (no scanned documents)
                                </p>
                                <p className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Demo: Only the first 5 pages will be processed
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
                    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                        <div className="text-blue-600 font-semibold mb-1">🔒 Private</div>
                        <p className="text-sm text-gray-600">All processing happens locally</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                        <div className="text-blue-600 font-semibold mb-1">⚡ Fast</div>
                        <p className="text-sm text-gray-600">Powered by local AI models</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                        <div className="text-blue-600 font-semibold mb-1">📄 Smart</div>
                        <p className="text-sm text-gray-600">Get answers with page citations</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
