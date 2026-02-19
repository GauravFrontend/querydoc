import { openDB } from 'idb';
import { Chunk, PageText } from '@/types';

const DB_NAME = 'querydoc_db';
const STORE_NAME = 'pdf_store';
const PDF_KEY = 'active_pdf';

export async function savePDF(file: File) {
    const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore(STORE_NAME);
        },
    });
    // Store as Blob + Name for restoration
    const blob = new Blob([file], { type: 'application/pdf' });
    await db.put(STORE_NAME, { blob, name: file.name }, PDF_KEY);
}

export async function getPDF(): Promise<File | null> {
    const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore(STORE_NAME);
        },
    });
    const data = await db.get(STORE_NAME, PDF_KEY);
    if (data && data.blob) {
        return new File([data.blob], data.name, { type: 'application/pdf' });
    }
    return null;
}

export async function clearStorage() {
    const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore(STORE_NAME);
        },
    });
    await db.clear(STORE_NAME);
    localStorage.removeItem('querydoc_state');
    localStorage.removeItem('querydoc_messages');
}

interface AppState {
    chunks: Chunk[];
    extractedPages: PageText[];
    selectedModel: string;
    currentPage: number;
}

export function saveState(state: AppState) {
    localStorage.setItem('querydoc_state', JSON.stringify(state));
}

export function getState(): AppState | null {
    const raw = localStorage.getItem('querydoc_state');
    return raw ? JSON.parse(raw) : null;
}
