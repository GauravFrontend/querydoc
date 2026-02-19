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
    pageNumber: number;
    text: string;
}
