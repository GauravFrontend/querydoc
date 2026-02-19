import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { prompt, model } = await req.json();
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(error, { status: response.status });
        }

        // Return the stream directly to the client
        return new NextResponse(response.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('Groq Proxy Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
