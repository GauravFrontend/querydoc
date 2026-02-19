'use client';

interface ModelSelectorProps {
    selectedModel: string;
    onModelChange: (model: string) => void;
}

const MODELS = [
    { id: 'qwen2.5:3b', name: 'Qwen 2.5 (3B)' },
    { id: 'gemma2:2b', name: 'Gemma 2 (2B)' },
];

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
    return (
        <div className="relative">
            <select
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="
          appearance-none bg-white border-2 border-gray-200 rounded-lg
          px-4 py-2 pr-10 text-sm font-medium text-gray-700
          hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all cursor-pointer
        "
            >
                {MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                        {model.name}
                    </option>
                ))}
            </select>

            {/* Dropdown arrow */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}
