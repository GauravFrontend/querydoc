import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { PageText, Chunk } from '@/types';

// Configure the worker - use local worker file from public
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
}


/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(file: File): Promise<PageText[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: PageText[] = [];

    const pagesToProcess = Math.min(pdf.numPages, 5);
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

    return pages;
}

/**
 * Detect if PDF appears to be scanned (image-based)
 */
export function detectScannedPDF(pages: PageText[]): boolean {
    const totalText = pages.reduce((acc, page) => acc + page.text, '');
    return totalText.length < 100;
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
