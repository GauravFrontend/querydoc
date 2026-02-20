export interface TTSConfig {
    provider: 'browser' | 'cloud';
    speed: number;
    browserVoiceURI: string;
    cloudApiKey: string;
}

export const defaultTTSConfig: TTSConfig = {
    provider: 'browser',
    speed: 1.0,
    browserVoiceURI: '',
    cloudApiKey: '',
};

export function getTTSConfig(): TTSConfig {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('querydoc_tts_config');
        if (saved) return { ...defaultTTSConfig, ...JSON.parse(saved) };
    }
    return defaultTTSConfig;
}

export function saveTTSConfig(config: TTSConfig) {
    if (typeof window !== 'undefined') {
        localStorage.setItem('querydoc_tts_config', JSON.stringify(config));
    }
}

// Global state for tracking currently playing TTS
let currentUtterance: SpeechSynthesisUtterance | null = null;
let cloudAudio: HTMLAudioElement | null = null;

export function stopTTS() {
    if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
        if (currentUtterance) {
            currentUtterance.onend = null;
            currentUtterance.onerror = null;
        }
    }
    if (cloudAudio) {
        cloudAudio.pause();
        cloudAudio.currentTime = 0;
        cloudAudio = null;
    }
}

export function pauseTTS() {
    if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
    }
    if (cloudAudio) {
        cloudAudio.pause();
    }
}

export function resumeTTS() {
    if (typeof window !== 'undefined' && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
    if (cloudAudio) {
        cloudAudio.play();
    }
}

export async function playTTS(
    text: string,
    startIndex: number = 0,
    onBoundary?: (charIndex: number, charLength: number) => void,
    onEnd?: () => void,
    onError?: (err: Error) => void
) {
    stopTTS(); // Stop anything playing

    if (!text.trim()) return;

    const config = getTTSConfig();
    const textToSpeak = text.substring(startIndex); // Start from a specific point

    if (config.provider === 'cloud' && config.cloudApiKey) {
        try {
            // Using OpenAI TTS as the standard premium cloud provider
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.cloudApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: textToSpeak,
                    voice: 'alloy', // Can be configurable later
                    speed: config.speed
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Cloud TTS Failed');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            cloudAudio = new Audio(url);

            cloudAudio.playbackRate = config.speed;

            cloudAudio.onplay = () => {
                // Cloud TTS doesn't give word boundaries, so we just trigger start
                if (onBoundary) onBoundary(startIndex, text.length - startIndex);
            };

            cloudAudio.onended = () => {
                URL.revokeObjectURL(url);
                if (onEnd) onEnd();
            };

            cloudAudio.onerror = (e) => {
                if (onError) onError(new Error("Cloud Audio playback failed"));
            };

            await cloudAudio.play();

        } catch (e: any) {
            console.error("Cloud TTS Error:", e);
            if (onError) onError(e);
        }

    } else {
        // Fallback to Browser TTS
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = config.speed;

        // Find selected voice
        const voices = window.speechSynthesis.getVoices();
        if (config.browserVoiceURI) {
            const selectedVoice = voices.find(v => v.voiceURI === config.browserVoiceURI);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        utterance.onboundary = (e) => {
            if (e.name === 'word' || e.name === 'sentence') {
                // The charIndex from the event is relative to the text we gave it (textToSpeak)
                // So we add startIndex to get absolute offset in original string
                if (onBoundary) onBoundary(startIndex + e.charIndex, e.charLength || 10);
            }
        };

        utterance.onend = () => {
            if (onEnd) onEnd();
        };

        utterance.onerror = (e) => {
            // "interrupted" isn't a real error, it happens when we cancel
            if (e.error !== 'interrupted' && e.error !== 'canceled' && onError) {
                onError(new Error(`Speech synthesis error: ${e.error}`));
            }
        };

        currentUtterance = utterance;

        // Sometimes speech synthesis gets stuck, this clears the queue
        // But we already cancelled earlier. 
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 50);
    }
}
