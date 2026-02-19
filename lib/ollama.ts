/**
 * Query Ollama with streaming support
 */
export async function queryOllama(
    prompt: string,
    model: string,
    onStream: (text: string) => void
): Promise<{ response: string; stats?: any }> {
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
            let errorMessage = `Ollama request failed: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // Ignore parsing error, use default statusText message
            }
            throw new Error(errorMessage);
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
                        return {
                            response: fullResponse,
                            stats: {
                                eval_count: json.eval_count,
                                prompt_eval_count: json.prompt_eval_count,
                                total_duration: json.total_duration,
                                load_duration: json.load_duration
                            }
                        };
                    }
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            }
        }

        return { response: fullResponse };
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
