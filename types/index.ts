export interface TextItem {
    str: string;
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface PageText {
    pageNumber: number;
    text: string;
    items?: TextItem[];
}

export interface Chunk {
    chunkId: string;
    text: string;
    pageNumber: number;
    chunkIndex: number;
    rects?: { top: number; left: number; width: number; height: number }[];
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    pageNumber?: number;
    sourceChunks?: Chunk[];
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
