import { openDB } from 'idb';
import { ManagedDocument } from '@/types';

const DB_NAME = 'querydoc_db';
const STORE_NAME = 'pdf_store';

export async function savePDF(id: string, file: File) {
    const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore(STORE_NAME);
        },
    });
    // Store as Blob + Name for restoration
    const blob = new Blob([file], { type: 'application/pdf' });
    await db.put(STORE_NAME, { blob, name: file.name }, id);
}

export async function getPDF(id: string): Promise<File | null> {
    const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore(STORE_NAME);
        },
    });
    const data = await db.get(STORE_NAME, id);
    if (data && data.blob) {
        return new File([data.blob], data.name, { type: 'application/pdf' });
    }
    return null;
}

export async function deletePDF(id: string) {
    const db = await openDB(DB_NAME, 1);
    await db.delete(STORE_NAME, id);
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
    documents: Omit<ManagedDocument, 'file'>[];
    activeDocumentId: string | null;
    selectedModel: string;
}

export function saveState(state: AppState) {
    localStorage.setItem('querydoc_state', JSON.stringify(state));
}

export function getState(): AppState | null {
    const raw = localStorage.getItem('querydoc_state');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}
