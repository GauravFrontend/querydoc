import { Chunk } from '@/types';

/**
 * Improved relevance scoring
 * 1. Support partial matching for words > 3 chars (fuzzy root matching)
 * 2. Counts how many unique query words appear in the chunk
 */
function calculateRelevance(question: string, chunk: string): number {
    const questionWords = question.toLowerCase()
        .replace(/[?.,!]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2);

    const chunkLower = chunk.toLowerCase();

    let score = 0;
    let uniqueMatches = 0;

    for (const word of questionWords) {
        // Try exact match first
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const exactMatchRegex = new RegExp(escapedWord, 'g');
        const exactOccurrences = (chunkLower.match(exactMatchRegex) || []).length;

        if (exactOccurrences > 0) {
            uniqueMatches++;
            score += Math.min(exactOccurrences, 3) * 2; // Exact matches worth more
        } else if (word.length > 4) {
            // Try matching a "root" (e.g. "purchased" matches "purchase")
            // Simple root: strip last 2-3 chars if they are common suffixes
            const root = word.replace(/(ing|ed|s|es)$/, '');
            if (root.length > 3) {
                const escapedRoot = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const rootOccurrences = (chunkLower.match(new RegExp(escapedRoot, 'g')) || []).length;
                if (rootOccurrences > 0) {
                    uniqueMatches += 0.5; // Partial unique match
                    score += Math.min(rootOccurrences, 2);
                }
            }
        }
    }

    // Significant boost for matching more unique words (or roots)
    score += (uniqueMatches * 15);

    return score;
}

/**
 * Find the most relevant chunks for a question, ensuring document diversity if possible.
 * Now history-aware to handle follow-up questions like "who is he?"
 */
export function findRelevantChunks(
    question: string,
    chunks: Chunk[],
    topK: number = 10,
    history?: { role: string, content: string }[]
): Chunk[] {
    // 1. Expand search query using history for follow-ups
    let expandedQuery = question.toLowerCase();

    if (history && history.length > 0) {
        // Look at the last 2 user messages for context keywords
        const contextKeywords = history
            .filter(m => m.role === 'user')
            .slice(-2)
            .map(m => m.content.toLowerCase().replace(/[?.,!]/g, ' '))
            .join(' ')
            .split(/\s+/)
            .filter(w => w.length > 4); // Only meaningful context words

        // Add unique keywords from history not already in the question
        const questionWords = new Set(expandedQuery.split(/\s+/));
        const uniqueHistoryWords = [...new Set(contextKeywords)].filter(w => !questionWords.has(w));

        // Append context but keep it secondary (fewer words to avoid dilution)
        expandedQuery += ' ' + uniqueHistoryWords.slice(0, 5).join(' ');
    }

    const scoredChunks = chunks.map(chunk => ({
        chunk,
        score: calculateRelevance(expandedQuery, chunk.text),
    }));

    // Sort by score descending
    scoredChunks.sort((a, b) => b.score - a.score);

    // Filter out 0-score chunks and take top candidates
    const candidates = scoredChunks.filter(item => item.score > 0);

    if (candidates.length === 0) return [];

    // ensure diversity if we have multiple documents
    const selectedChunks: Chunk[] = [];
    const docCounts: Record<string, number> = {};

    for (const item of candidates) {
        if (selectedChunks.length >= topK) break;

        const docId = item.chunk.documentId || 'unknown';
        // Cap chunks per document to ensure variety in top results
        if ((docCounts[docId] || 0) < Math.ceil(topK * 0.7)) {
            selectedChunks.push(item.chunk);
            docCounts[docId] = (docCounts[docId] || 0) + 1;
        }
    }

    return selectedChunks;
}

/**
 * Build a prompt with context and history for the LLM
 */
export function buildPrompt(question: string, chunks: Chunk[], history?: { role: string, content: string }[]): string {
    const contextParts = chunks.map((chunk, index) =>
        `[Document: ${chunk.documentName || 'Unknown'}, Page ${chunk.pageNumber}]\n${chunk.text}`
    );

    const context = contextParts.join('\n\n---\n\n');

    let historyText = '';
    if (history && history.length > 0) {
        historyText = 'Previous Conversation:\n' + history.map(m => `${m.role === 'user' ? 'Question' : 'Answer'}: ${m.content}`).join('\n') + '\n\n';
    }

    return `You are a professional document analysis assistant. 
You are provided with excerpts from one or more documents. 
Review the provided context and conversation history to answer the final question accurately.

CRITICAL GUIDELINES:
1. Answer based ONLY on the provided document text.
2. If multiple documents are mentioned, cross-reference them to find connections (e.g., if one document mentions a person and another mentions an action they took).
3. Always cite the document name and page numbers used in your answer.
4. If the answer is not in the context, say you don't have enough information.

---
DOCUMENT CONTEXT:
${context}
---

${historyText}Final Question: ${question}

Answer:`;
}
