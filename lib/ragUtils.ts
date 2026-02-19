import { Chunk } from '@/types';

/**
 * Simple keyword-based relevance scoring
 */
function calculateRelevance(question: string, chunk: string): number {
    const questionWords = question.toLowerCase().split(/\s+/);
    const chunkLower = chunk.toLowerCase();

    let score = 0;
    for (const word of questionWords) {
        if (word.length > 3) { // Only count meaningful words
            const occurrences = (chunkLower.match(new RegExp(word, 'g')) || []).length;
            score += occurrences;
        }
    }

    return score;
}

/**
 * Find the most relevant chunks for a question
 */
export function findRelevantChunks(
    question: string,
    chunks: Chunk[],
    topK: number = 3
): Chunk[] {
    const scoredChunks = chunks.map(chunk => ({
        chunk,
        score: calculateRelevance(question, chunk.text),
    }));

    // Sort by score descending
    scoredChunks.sort((a, b) => b.score - a.score);

    // Return top K chunks
    return scoredChunks.slice(0, topK).map(item => item.chunk);
}

/**
 * Build a prompt with context for the LLM
 */
export function buildPrompt(question: string, chunks: Chunk[]): string {
    const contextParts = chunks.map((chunk, index) =>
        `[Page ${chunk.pageNumber}]\n${chunk.text}`
    );

    const context = contextParts.join('\n\n---\n\n');

    return `You are a document analysis assistant. Answer questions based ONLY on the provided text. Include the page number where you found the information.

Context from document:
${context}

Question: ${question}

Answer:`;
}
