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
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();

        const items = textContent.items.map((item: any) => {
            const tx = item.transform;
            // pdf.js uses bottom-left origin for y. Calculate approx top.
            const top = viewport.height - tx[5] - tx[3];
            return {
                str: item.str,
                left: tx[4],
                top: top,
                width: item.width || 10,
                height: tx[3] || 10
            };
        });

        const text = textContent.items
            .map((item: any) => item.str)
            .join(' ');

        pages.push({
            pageNumber: i,
            text: text.trim(),
            items
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
    console.log('Tesseract Worker created for language: eng');

    try {
        for (let i = 1; i <= pagesToProcess; i++) {
            console.log(`Processing Page ${i}...`);
            if (onProgress) onProgress({ page: i, total: pagesToProcess, status: 'rendering' });

            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
            console.log(`Page ${i} viewport scale 2.0: ${viewport.width}x${viewport.height}`);

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
                console.error(`Failed to get canvas context for page ${i}`);
                continue;
            }

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            console.log(`Rendering Page ${i} to canvas...`);
            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            if (onProgress) onProgress({ page: i, total: pagesToProcess, status: 'ocr' });

            console.log(`Running Tesseract recognize on Page ${i}...`);
            const { data } = await worker.recognize(canvas) as any;
            const { text, words } = data;
            const items = (words || []).map((w: any) => ({
                str: w.text,
                left: w.bbox.x0 / 2.0,
                top: w.bbox.y0 / 2.0,
                width: (w.bbox.x1 - w.bbox.x0) / 2.0,
                height: (w.bbox.y1 - w.bbox.y0) / 2.0,
            }));
            console.log(`Page ${i} OCR Result Length: ${text.length} characters`);

            pages.push({
                pageNumber: i,
                text: text.trim(),
                items
            });
        }
    } catch (ocrError) {
        console.error('CRITICAL: Error during OCR loop:', ocrError);
        throw ocrError;
    } finally {
        await worker.terminate();
        console.log('Tesseract Worker terminated');
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
        if (page.items && page.items.length > 0) {
            // Group text items by y-coordinate into lines
            // Items with similar y-coordinates (top) belong to the same line
            const Y_TOLERANCE = 5; // Pixels difference to still be considered same line

            // First sort items vertically then horizontally
            const sortedItems = [...page.items].sort((a, b) => {
                if (Math.abs(a.top - b.top) > Y_TOLERANCE) {
                    return a.top - b.top;
                }
                return a.left - b.left;
            });

            const lines: { top: number, height: number, items: any[], text: string }[] = [];
            let currentLine: any[] = [];
            let currentLineTop = sortedItems[0]?.top;
            let currentLineHeight = sortedItems[0]?.height || 10;

            for (const item of sortedItems) {
                if (Math.abs(item.top - currentLineTop) > Y_TOLERANCE) {
                    // New line
                    if (currentLine.length > 0) {
                        lines.push({
                            top: currentLineTop,
                            height: currentLineHeight,
                            items: currentLine,
                            text: currentLine.map(it => it.str).join(' ')
                        });
                    }
                    currentLine = [item];
                    currentLineTop = item.top;
                    currentLineHeight = item.height || 10;
                } else {
                    currentLine.push(item);
                    currentLineHeight = Math.max(currentLineHeight, item.height || 10);
                }
            }
            if (currentLine.length > 0) {
                lines.push({
                    top: currentLineTop,
                    height: currentLineHeight,
                    items: currentLine,
                    text: currentLine.map(it => it.str).join(' ')
                });
            }

            // Group lines into paragraphs
            const paragraphs: any[][] = []; // Array of arrays of items
            let currentParagraph: any[] = [];
            let lastLineTop = lines[0]?.top;

            for (const line of lines) {
                // If vertical gap is larger than 1.5x the typical line height, consider it a new paragraph
                const verticalGap = line.top - lastLineTop;
                const isNewParagraph = verticalGap > (line.height * 1.5);

                if (isNewParagraph && currentParagraph.length > 0) {
                    paragraphs.push(currentParagraph);
                    currentParagraph = [...line.items];
                } else {
                    currentParagraph.push(...line.items);
                }
                lastLineTop = line.top;
            }
            if (currentParagraph.length > 0) {
                paragraphs.push(currentParagraph);
            }

            // Convert paragraphs into chunks
            for (const paragraphItems of paragraphs) {
                const chunkText = paragraphItems.map(item => item.str).join(' ');

                // Skip very small chunks (e.g., single artifacts, page numbers) unless they are the only things
                if (chunkText.trim().length > 5) {
                    chunks.push({
                        chunkId: `chunk-${page.pageNumber}-${chunkIndex}`,
                        text: chunkText,
                        pageNumber: page.pageNumber,
                        chunkIndex: chunkIndex++,
                        rects: paragraphItems.map(it => ({ top: it.top, left: it.left, width: it.width, height: it.height }))
                    });
                }
            }
        } else {
            // Fallback to purely text-based chunking without rects
            const words = page.text.split(/\s+/);
            for (let i = 0; i < words.length; i += chunkSize - overlap) {
                const chunkWords = words.slice(i, i + chunkSize);
                const chunkText = chunkWords.join(' ');

                if (chunkText.trim().length > 0) {
                    chunks.push({
                        chunkId: `chunk-${page.pageNumber}-${chunkIndex}`,
                        text: chunkText,
                        pageNumber: page.pageNumber,
                        chunkIndex: chunkIndex++,
                    });
                }
            }
        }
    }

    return chunks;
}
