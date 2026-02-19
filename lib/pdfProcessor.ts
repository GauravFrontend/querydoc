import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { createWorker } from 'tesseract.js';
import { PageText, Chunk } from '@/types';

// Configure the worker - use local worker file from public
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
}


/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(file: File): Promise<{ pages: PageText[], totalPages: number }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: PageText[] = [];
    const totalPages = pdf.numPages;

    const pagesToProcess = Math.min(totalPages, 5);
    for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items
            .map((item: any) => item.str)
            .join(' ');

        pages.push({
            pageNumber: i,
            text: text.trim(),
        });
    }

    return { pages, totalPages };
}

/**
 * Perform OCR on a PDF that doesn't have text
 */
export async function extractTextFromPDFWithOCR(
    file: File,
    onProgress?: (progress: { page: number, total: number, status: string }) => void
): Promise<{ pages: PageText[], totalPages: number }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: PageText[] = [];
    const totalPages = pdf.numPages;

    const pagesToProcess = Math.min(totalPages, 5);
    const worker = await createWorker('eng');

    try {
        for (let i = 1; i <= pagesToProcess; i++) {
            if (onProgress) onProgress({ page: i, total: pagesToProcess, status: 'rendering' });

            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) continue;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            if (onProgress) onProgress({ page: i, total: pagesToProcess, status: 'ocr' });

            const { data: { text } } = await worker.recognize(canvas);

            pages.push({
                pageNumber: i,
                text: text.trim(),
            });
        }
    } finally {
        await worker.terminate();
    }

    return { pages, totalPages };
}

/**
 * Detect if PDF appears to be scanned (image-based)
 */
export function detectScannedPDF(pages: PageText[]): boolean {
    const totalText = pages.reduce((acc, page) => acc + page.text, '');

    // Check if total text is very low across the processed range
    if (totalText.length < 100) return true;

    // IMPORTANT: Check if any individual page is empty.
    // In handwritten scans, often one page fails completely while others have "garbage" text.
    const hasEmptyPage = pages.some(p => p.text.trim().length === 0);
    if (hasEmptyPage) return true;

    return false;
}

/**
 * Chunk text into overlapping segments
 */
export function chunkText(
    pages: PageText[],
    chunkSize: number = 500,
    overlap: number = 50
): Chunk[] {
    const chunks: Chunk[] = [];
    let chunkIndex = 0;

    for (const page of pages) {
        const words = page.text.split(/\s+/);

        for (let i = 0; i < words.length; i += chunkSize - overlap) {
            const chunkWords = words.slice(i, i + chunkSize);
            const chunkText = chunkWords.join(' ');

            if (chunkText.trim().length > 0) {
                chunks.push({
                    text: chunkText,
                    pageNumber: page.pageNumber,
                    chunkIndex: chunkIndex++,
                });
            }
        }
    }

    return chunks;
}
