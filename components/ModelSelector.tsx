'use client';

import { useState, useRef, useEffect } from 'react';
import { getTTSConfig, saveTTSConfig, TTSConfig } from '@/lib/tts';

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
    },
    {
        id: 'llama-3.1-70b-versatile',
        name: 'G Cloud: Llama 70B',
        info: '☁️ Best Quality • For complex questions',
        isCloud: true,
    },
    {
        id: 'llama-3.1-8b-instant',
        name: 'G Cloud: Llama 8B',
        info: '☁️ Quick Answers • Ultra-fast',
        isCloud: true,
    },
    {
        id: 'mixtral-8x7b-32768',
        name: 'G Cloud: Mixtral 8x7B',
        info: '☁️ Balanced • Great for long context',
        isCloud: true,
    },
    {
        id: 'gemma2-9b-it',
        name: 'G Cloud: Gemma 9B',
        info: '☁️ Fast • Solid logic',
        isCloud: true,
    }
];

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[1];

    // TTS State
    const [ttsConfig, setTtsConfig] = useState<TTSConfig>(() => getTTSConfig());
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const loadVoices = () => {
            const vcs = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en')); // Show EN mostly
            setVoices(vcs);
        };
        loadVoices();
        if (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const updateTTS = (updates: Partial<TTSConfig>) => {
        const newConf = { ...ttsConfig, ...updates };
        setTtsConfig(newConf);
        saveTTSConfig(newConf);
    };

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

                    {/* Audio Settings Section */}
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                            Voice Reader
                        </h3>

                        {/* Top Toggles */}
                        <div className="flex bg-gray-200/50 rounded-lg p-0.5 mb-3 text-xs w-full font-medium">
                            <button
                                onClick={() => updateTTS({ provider: 'browser' })}
                                className={`flex-1 py-1.5 rounded-md transition-all ${ttsConfig.provider === 'browser' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Local
                            </button>
                            <button
                                onClick={() => updateTTS({ provider: 'cloud' })}
                                className={`flex-1 flex gap-1 justify-center items-center py-1.5 rounded-md transition-all ${ttsConfig.provider === 'cloud' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Cloud ☁️
                            </button>
                        </div>

                        {ttsConfig.provider === 'cloud' && (
                            <div className="mb-3">
                                <label className="text-[10px] font-bold text-gray-500 mb-1 block">OpenAI API Key (Stored Locally)</label>
                                <input
                                    type="password"
                                    placeholder="sk-..."
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={ttsConfig.cloudApiKey}
                                    onChange={(e) => updateTTS({ cloudApiKey: e.target.value })}
                                />
                            </div>
                        )}

                        {ttsConfig.provider === 'browser' && voices.length > 0 && (
                            <div className="mb-3 flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500">System Voice</label>
                                <select
                                    className="w-full text-xs px-2 py-1.5 bg-white border border-gray-200 rounded-lg outline-none"
                                    value={ttsConfig.browserVoiceURI}
                                    onChange={(e) => updateTTS({ browserVoiceURI: e.target.value })}
                                >
                                    <option value="">Default OS Voice</option>
                                    {voices.map(v => (
                                        <option key={v.voiceURI} value={v.voiceURI}>{v.name.substring(0, 30)}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Speed Slider */}
                        <div className="flex items-center gap-3">
                            <label className="text-[10px] font-bold text-gray-500 whitespace-nowrap">Speed: {ttsConfig.speed}x</label>
                            <input
                                type="range"
                                min="0.5" max="2" step="0.1"
                                value={ttsConfig.speed}
                                onChange={(e) => updateTTS({ speed: parseFloat(e.target.value) })}
                                className="w-full accent-blue-500"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
