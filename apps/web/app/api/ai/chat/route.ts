import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// Helper to get API key from various possible .env files
function getApiKey() {
    const rootDir = process.cwd();
    // Try multiple levels to be sure
    const paths = [
        join(rootDir, '.env'),
        join(rootDir, '.env.local'),
        join(rootDir, 'pickleglass_web', '.env'),
        join(rootDir, '..', '.env'),
    ]

    for (const p of paths) {
        if (existsSync(p)) {
            try {
                const content = readFileSync(p, 'utf-8')
                const lines = content.split('\n')
                for (const line of lines) {
                    if (line.includes('OPENAI_API_KEY=')) {
                        const value = line.split('OPENAI_API_KEY=')[1]?.trim()
                        if (value) return value.replace(/["']/g, '')
                    }
                }
            } catch (e) {
                console.error(`Error reading ${p}:`, e)
            }
        }
    }
    return process.env.OPENAI_API_KEY
}

export async function POST(req: NextRequest) {
    try {
        const { messages, context } = await req.json()
        const apiKey = getApiKey()

        if (!apiKey) {
            console.error("No API key found in search paths")
            return NextResponse.json({ error: "OpenAI API Key not found in environment" }, { status: 500 })
        }

        const systemPrompt = `You are Claire, a helpful AI assistant. 
        You are assisting a user regarding a specific meeting/session.
        
        CONTEXT OF THE CALL:
        ${context}
        
        Answer based ON THE CONTEXT above. Be concise, professional, and friendly. 
        Use French as the primary language unless asked otherwise.
        Do not use emojis in your response.`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                stream: true,
            })
        })

        if (!response.ok) {
            const err = await response.text()
            console.error("OpenAI error response:", err)
            throw new Error(`OpenAI API error: ${err}`)
        }

        // Create a streaming response
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader()
                if (!reader) {
                    controller.close()
                    return
                }

                const decoder = new TextDecoder()
                try {
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        const chunk = decoder.decode(value)
                        const lines = chunk.split('\n')

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6).trim()
                                if (data === '[DONE]') {
                                    controller.close()
                                    return
                                }
                                try {
                                    const json = JSON.parse(data)
                                    const text = json.choices[0]?.delta?.content || ''
                                    if (text) {
                                        controller.enqueue(new TextEncoder().encode(text))
                                    }
                                } catch (e) {
                                    // Ignore parse errors for partial lines
                                }
                            }
                        }
                    }
                } catch (e) {
                    controller.error(e)
                } finally {
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })
    } catch (error: any) {
        console.error("AI Chat Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
