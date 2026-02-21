/**
 * Query Groq Cloud API with streaming support
 */
export async function queryGroq(
    prompt: string,
    model: string,
    onStream: (text: string) => void
): Promise<string> {
    try {
        const response = await fetch('/api/groq', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                prompt,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Groq request failed');
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                if (line.includes('[DONE]')) continue;
                if (!line.startsWith('data: ')) continue;

                try {
                    const json = JSON.parse(line.replace('data: ', ''));
                    const content = json.choices[0]?.delta?.content || '';
                    if (content) {
                        fullResponse += content;
                        onStream(content);
                    }
                } catch (e) {
                    // Ignore parsing errors for partial chunks
                }
            }
        }

        return fullResponse;
    } catch (error) {
        console.error('Groq Error:', error);
        throw error;
    }
}

export function getGroqUsage() {
    if (typeof window === 'undefined') return 0;
    const usage = localStorage.getItem('groq_usage');
    return usage ? parseInt(usage) : 0;
}

export function incrementGroqUsage() {
    if (typeof window === 'undefined') return;
    const current = getGroqUsage();
    localStorage.setItem('groq_usage', (current + 1).toString());
}

export const GROQ_LIMIT = 5;
/**
 * Generate a smart summary of a document using Groq
 */
export async function generateSummary(text: string, model: string): Promise<string> {
    const prompt = `Below is the content of a document. Please provide a concise, structured summary.
If it's a RESUME, include: Name, Skills, Experience years, and key roles.
If it's a RESEARCH PAPER, include: Abstract/Objective, Key Findings, and Methodology.
If it's a CONTRACT, include: Parties, Key dates, and Obligations.
For any other doc: Main topic and 3 key points.

DOCUMENT CONTENT:
"
${text.substring(0, 3000)}
"

SUMMARY:`;

    return await queryGroq(prompt, model, () => { });
}
