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
            // Escape special regex characters to avoid "Invalid regular expression" errors
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const occurrences = (chunkLower.match(new RegExp(escapedWord, 'g')) || []).length;
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
 * Build a prompt with context and history for the LLM
 */
export function buildPrompt(question: string, chunks: Chunk[], history?: { role: string, content: string }[]): string {
    const contextParts = chunks.map((chunk, index) =>
        `[Page ${chunk.pageNumber}]\n${chunk.text}`
    );

    const context = contextParts.join('\n\n---\n\n');

    let historyText = '';
    if (history && history.length > 0) {
        historyText = 'Previous Conversation:\n' + history.map(m => `${m.role === 'user' ? 'Question' : 'Answer'}: ${m.content}`).join('\n') + '\n\n';
    }

    return `You are a professional document analysis assistant. 
Review the provided context and conversation history to answer the final question accurately. 
Answer based ONLY on the provided document text. 
If the question is a follow-up, use the history to understand the context.
Always cite the page numbers used.

---
DOCUMENT CONTEXT:
${context}
---

${historyText}Final Question: ${question}

Answer:`;
}
