import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ brief: null }, { status: 200 })
  }

  let title = '', organizerEmail = '', attendeeEmails: string[] = [], calendarDescription = ''
  try {
    const body = await req.json()
    title = body.title || ''
    organizerEmail = body.organizerEmail || ''
    attendeeEmails = Array.isArray(body.attendeeEmails) ? body.attendeeEmails : []
    calendarDescription = (body.calendarDescription || '').replace(/<[^>]*>/g, '').trim()
  } catch {
    return NextResponse.json({ brief: null }, { status: 400 })
  }

  // Build context for the LLM
  const domainHints = [...(organizerEmail ? [organizerEmail] : []), ...attendeeEmails]
    .map(e => e.split('@')[1])
    .filter(Boolean)
    .filter(d => !['gmail.com','yahoo.com','hotmail.com','outlook.com','live.com','icloud.com','protonmail.com','proton.me'].includes(d))
    .filter((d, i, arr) => arr.indexOf(d) === i)

  const context = [
    `Titre de la réunion : ${title}`,
    domainHints.length > 0 ? `Domaines des participants : ${domainHints.join(', ')}` : null,
    organizerEmail ? `Organisateur : ${organizerEmail}` : null,
    calendarDescription ? `Description Google Calendar : ${calendarDescription.substring(0, 300)}` : null,
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Tu génères une courte description d'une réunion à venir pour une notification, en une seule phrase (max 15 mots).
Règles :
- En français
- Factuel et contextuel (utilise le domaine email pour identifier la société)
- Pas de guillemets, pas de ponctuation finale excessive
- Exemples : "Entretien de stage chez Safran avec Valentin Burnichon", "Point hebdo avec l'équipe Microsoft", "Appel client avec Amazon Web Services"

${context}

Réponds uniquement avec la phrase, rien d'autre.`,
          },
        ],
        max_tokens: 60,
        temperature: 0.3,
      }),
    })

    if (!res.ok) return NextResponse.json({ brief: null })

    const data = await res.json()
    const brief = data.choices?.[0]?.message?.content?.trim() || null
    return NextResponse.json({ brief })
  } catch {
    return NextResponse.json({ brief: null })
  }
}
