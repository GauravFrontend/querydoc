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
