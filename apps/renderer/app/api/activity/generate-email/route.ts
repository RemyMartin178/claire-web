import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function buildFallbackEmail(context: string, userName: string) {
    // Clean up markdown hashtags and extra symbols for the fallback
    const cleanContext = context.replace(/[#*_-]/g, '').replace(/\n\s*\n/g, '\n').trim()
    const title = cleanContext.substring(0, 60) || 'notre réunion'
    
    return {
        subject: `Suivi - ${title}`,
        body: `Bonjour,\n\nSuite à notre échange, je vous envoie ce récapitulatif concernant ${title}.\n\nCordialement,\n${userName}`
    }
}

export async function POST(req: NextRequest) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        console.error('[generate-email] OPENAI_API_KEY is not set')
        try {
            const { context = '', userName = 'Utilisateur' } = await req.json()
            return NextResponse.json(buildFallbackEmail(context, userName))
        } catch {
            return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
        }
    }

    let context = '', userName = ''
    try {
        const body = await req.json()
        context = (body.context || '').substring(0, 800)
        userName = body.userName || 'Utilisateur'
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: `You generate follow-up emails after meetings for Claire AI.
Claire listens to meetings and extracts insights, decisions, and requested actions.

Context: ${context}
Sender: ${userName}

Strict Rules:
1. LANGUAGE: Detect the language of the provided meeting context and write the email in that same language.
2. TONE: Professional, warm, natural, and minimal.
3. LENGTH: Maximum 2-4 sentences.
4. FORMAT: Plain text only. NO markdown, no lists, no symbols, no formatting characters (#, *, -, etc.).
5. NO ATTACHMENTS: The user may attach documents manually. NEVER mention attachments, files, or "ci-joint" in the email.
6. CONTENT LOGIC:
   - If a clear action/request was made (sending info, confirming something, following up): write a short action-based email.
   - If no clear action: write a concise summary email highlighting the main insight.
7. VARIETY: Vary greetings and closings.

Réponds UNIQUEMENT avec du JSON valide :
{"subject":"Subject (max 6 words)","body":"[Salutations]\\n[Main content].\\n[Closing],\\n${userName}"}`
                }],
                max_tokens: 350,
                temperature: 0.4,
                response_format: { type: 'json_object' }
            })
        })

        const rawText = await res.text()
        console.log('[generate-email] OpenAI status:', res.status)

        if (!res.ok) {
            console.error('[generate-email] OpenAI error:', rawText.substring(0, 300))
            if (res.status === 429 || res.status === 503) {
                return NextResponse.json(buildFallbackEmail(context, userName))
            }
            throw new Error(`OpenAI error ${res.status}`)
        }

        const data = JSON.parse(rawText)
        const result = JSON.parse(data.choices[0].message.content)

        return NextResponse.json({
            subject: result.subject || 'Suivi de notre réunion',
            body: result.body || ''
        })
    } catch (error: any) {
        console.error('[generate-email] Error:', error.message)
        return NextResponse.json(buildFallbackEmail(context, userName))
    }
}
