/**
 * Query Ollama with streaming support
 */
export async function queryOllama(
    prompt: string,
    model: string,
    onStream: (text: string) => void
): Promise<string> {
    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                prompt,
                stream: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.statusText}`);
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
                try {
                    const json = JSON.parse(line);

                    if (json.response) {
                        fullResponse += json.response;
                        onStream(json.response);
                    }

                    if (json.done) {
                        return fullResponse;
                    }
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            }
        }

        return fullResponse;
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error(
                `Cannot connect to Ollama. Please ensure Ollama is running at ${getBaseUrl()}`
            );
        }
        throw error;
    }
}

export const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('ollama_url');
        if (stored) return stored;
    }
    return process.env.NEXT_PUBLIC_OLLAMA_URL || 'https://unsymptomatical-nonperverted-jacinta.ngrok-free.dev';
};

console.log("http://localhost:11434")
/**
 * Check if Ollama is running
 */
export async function checkOllamaStatus(): Promise<boolean> {
    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/tags`);
        return response.ok;
    } catch {
        return false;
    }
}
