export interface PageText {
    pageNumber: number;
    text: string;
}

export interface Chunk {
    text: string;
    pageNumber: number;
    chunkIndex: number;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    pageNumber?: number;
    timestamp: Date;
    stats?: {
        eval_count: number;
        prompt_eval_count: number;
        total_duration: number;
        load_duration?: number;
    };
}

export interface HighlightArea {
    id: string;
    pageNumber: number;
    text: string;
    rects: { top: number; left: number; width: number; height: number }[];
    color?: string;
}

export interface SelectionData {
    text: string;
    rects: DOMRect[];
    pageNumber: number;
}
