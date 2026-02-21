'use client';

import { ManagedDocument } from '@/types';

interface DocumentSidebarProps {
    documents: ManagedDocument[];
    activeDocumentId: string | null;
    onSelect: (docId: string) => void;
    onDelete: (docId: string) => void;
    onUploadNew: () => void;
}

export default function DocumentSidebar({
    documents,
    activeDocumentId,
    onSelect,
    onDelete,
    onUploadNew
}: DocumentSidebarProps) {
    return (
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full transition-all">
            <div className="p-4 border-b border-gray-200 bg-white">
                <button
                    onClick={onUploadNew}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Document
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                <h3 className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">My Collection ({documents.length})</h3>
                {documents.map((doc) => (
                    <div
                        key={doc.id}
                        className={`group relative rounded-xl p-3 cursor-pointer transition-all border ${activeDocumentId === doc.id
                                ? 'bg-white border-blue-200 shadow-sm'
                                : 'border-transparent hover:bg-gray-100'
                            }`}
                        onClick={() => onSelect(doc.id)}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${activeDocumentId === doc.id ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${activeDocumentId === doc.id ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {doc.name}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{doc.chunks.length} chunks • Page {doc.currentPage}</p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(doc.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Vector Store Active
                </div>
            </div>
        </div>
    );
}
