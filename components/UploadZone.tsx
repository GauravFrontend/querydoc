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
            alert('Please upload a PDF file'); // You might want to replace this with a toast later
        }
    }, [onFileSelect]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    }, [onFileSelect]);

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#FAFAFA] relative font-sans text-slate-900 selection:bg-blue-100">
            {/* Background Decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-blue-100/40 rounded-full blur-[120px] mix-blend-multiply opacity-70 animate-blob" />
                <div className="absolute -bottom-[20%] -left-[10%] w-[70vw] h-[70vw] bg-indigo-100/40 rounded-full blur-[120px] mix-blend-multiply opacity-70 animate-blob animation-delay-2000" />
                <div className="absolute top-[20%] left-[20%] w-[50vw] h-[50vw] bg-purple-100/40 rounded-full blur-[120px] mix-blend-multiply opacity-70 animate-blob animation-delay-4000" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 w-full max-w-5xl px-6 py-12 md:py-20 flex flex-col items-center gap-12">

                {/* Header Section */}
                <div className="text-center space-y-6 max-w-3xl mx-auto animate-fadeInUp">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm mb-4 transition-transform hover:scale-105 cursor-default">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">100% Local & Private AI</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                        Chat with your <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                            Documents
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
                        Transform static PDFs into interactive conversations. <br className="hidden md:block" />
                        Powered by local LLMs, your data never leaves your device.
                    </p>
                </div>

                {/* Main Upload Card */}
                <div className="w-full max-w-2xl mx-auto perspective-1000 animate-fadeInUp delay-100">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                            group relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-3 shadow-2xl shadow-slate-200/50 
                            border border-white/50 transition-all duration-500 ease-out
                            ${isDragging ? 'scale-105 shadow-blue-200/50 ring-4 ring-blue-100' : 'hover:shadow-xl hover:-translate-y-1'}
                        `}
                    >
                        <div className={`
                            relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-300
                            flex flex-col items-center justify-center py-16 px-8 text-center
                            ${isDragging
                                ? 'border-blue-500 bg-blue-50/50'
                                : 'border-slate-200 bg-slate-50/50 group-hover:bg-slate-50 group-hover:border-slate-300'
                            }
                        `}>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileInput}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                id="file-input"
                            />

                            {/* Animated Icon Container */}
                            <div className={`
                                w-24 h-24 rounded-3xl bg-white shadow-lg shadow-slate-200/60 flex items-center justify-center mb-8
                                transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-3
                            `}>
                                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {isDragging && (
                                    <div className="absolute inset-0 rounded-3xl ring-2 ring-blue-500 animate-ping opacity-20"></div>
                                )}
                            </div>

                            <div className="space-y-3 relative z-0">
                                <h3 className="text-xl font-bold text-slate-900">
                                    Drop your PDF here
                                </h3>
                                <p className="text-slate-500 font-medium">
                                    or <span className="text-blue-600 underline decoration-2 underline-offset-2 group-hover:text-blue-700">browse files</span> to upload
                                </p>
                                <p className="text-xs text-slate-400 pt-2 font-medium tracking-wide uppercase">
                                    PDF up to 20MB • Text-based
                                </p>
                            </div>
                        </div>

                        {/* Demo Badge */}
                        <div className="absolute -top-4 -right-4 bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-amber-200 rotate-12 z-20 border-2 border-white">
                            DEMO MODE: 5 PAGES
                        </div>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mx-auto pt-8 animate-fadeInUp delay-200">
                    <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">Private & Secure</h3>
                        <p className="text-sm text-slate-500 leading-snug">No cloud uploads. Your sensitive data stays on your machine.</p>
                    </div>

                    <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 text-indigo-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">Lightning Fast</h3>
                        <p className="text-sm text-slate-500 leading-snug">Powered by optimized local models for instant responses.</p>
                    </div>

                    <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-4 text-purple-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">Smart Citations</h3>
                        <p className="text-sm text-slate-500 leading-snug">Get accurate answers with direct references to source pages.</p>
                    </div>
                </div>

                {/* Footer space */}
                <div className="pb-8"></div>

            </div>

            <style jsx>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>
        </div>
    );
}
