'use client';

import { useState, useRef, useEffect } from 'react';

interface ModelSelectorProps {
    selectedModel: string;
    onModelChange: (model: string) => void;
}

const MODELS = [
    {
        id: 'gemma2:2b',
        name: 'Gemma 2B',
        info: '⚡ Very Fast • Best for quick summaries',
    },
    {
        id: 'qwen2.5:3b',
        name: 'Qwen 2.5 3B',
        info: '⚡ Fast • Balanced for daily use',
    },
    {
        id: 'qwen2.5:7b-instruct-q4_0',
        name: 'Qwen 2.5 7B',
        info: '🕒 Steady • Highest Accuracy',
    }
];

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[1];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all focus:outline-none active:scale-95"
            >
                <span className="text-sm font-bold text-gray-800">{currentModel.name}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-[100] overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Model</h3>
                    </div>
                    {MODELS.map((model) => (
                        <button
                            key={model.id}
                            onClick={() => {
                                onModelChange(model.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 transition-colors hover:bg-gray-50 flex flex-col ${selectedModel === model.id ? 'bg-blue-50/50' : ''
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`text-sm font-bold ${selectedModel === model.id ? 'text-blue-600' : 'text-gray-900'}`}>
                                    {model.name}
                                </span>
                                {selectedModel === model.id && (
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-[11px] text-gray-500 font-medium leading-none mt-1">
                                {model.info}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
