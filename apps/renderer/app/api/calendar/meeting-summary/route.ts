import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function cleanCalendarDescription(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/[^\s]*/g, '')
    .replace(/R[eé]union Microsoft Teams[\s\S]*?(?=\n\n|$)/gi, '')
    .replace(/Join.*?meeting[\s\S]*?(?=\n\n|$)/gi, '')
    .replace(/Code secret[^\n]*/gm, '')
    .replace(/Num[eé]ro de r[eé]union[^\n]*/gm, '')
    .replace(/Besoin d.aide[^\n]*/gm, '')
    .replace(/R[eé]f[eé]rence syst[eè]me[^\n]*/gm, '')
    .replace(/Participer par t[eé]l[eé]phone[\s\S]*?(?=\n\n|$)/gi, '')
    .replace(/_+/g, '')
    .replace(/\s{3,}/g, ' ')
    .trim()
    .substring(0, 400)
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ paragraph: null })

  let title = '', organizerEmail = '', attendeeEmails: string[] = []
  let calendarDescription = '', dateLabel = '', rangeLabel = '', duration = ''
  try {
    const body = await req.json()
    title = body.title || ''
    organizerEmail = body.organizerEmail || ''
    attendeeEmails = Array.isArray(body.attendeeEmails) ? body.attendeeEmails : []
    calendarDescription = cleanCalendarDescription(body.calendarDescription || '')
    dateLabel = body.dateLabel || ''
    rangeLabel = body.rangeLabel || ''
    duration = body.duration || ''
  } catch {
    return NextResponse.json({ paragraph: null }, { status: 400 })
  }

  const personalDomains = ['gmail.com','yahoo.com','hotmail.com','outlook.com','live.com','icloud.com','protonmail.com','proton.me']
  const allEmails = [...(organizerEmail ? [organizerEmail] : []), ...attendeeEmails]
  const professionalDomains = allEmails
    .map(e => e.split('@')[1]?.toLowerCase())
    .filter((d): d is string => Boolean(d) && !personalDomains.includes(d))
    .filter((d, i, arr) => arr.indexOf(d) === i)

  const context = [
    `Titre : ${title}`,
    `Date : ${dateLabel}, ${rangeLabel} (${duration})`,
    professionalDomains.length > 0 ? `Domaines professionnels des participants : ${professionalDomains.join(', ')}` : null,
    organizerEmail ? `Organisateur : ${organizerEmail}` : null,
    attendeeEmails.length > 0 ? `Participants : ${attendeeEmails.join(', ')}` : null,
    calendarDescription ? `Contexte additionnel : ${calendarDescription}` : null,
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Tu génères un court résumé descriptif d'une réunion à venir pour un assistant IA.
Règles :
- En français, 2-3 phrases, un seul paragraphe fluide
- Identifie l'entreprise à partir du domaine email (ex: safrangroup.com → Safran, groupe industriel aéronautique et défense)
- Indique qui est impliqué, de quelle organisation, et l'objectif probable de la réunion
- Ton neutre et factuel, pas de guillemets autour des noms propres
- Pas de liste, pas de puces

${context}

Réponds uniquement avec le paragraphe.`,
        }],
        max_tokens: 160,
        temperature: 0.4,
      }),
    })

    if (!res.ok) return NextResponse.json({ paragraph: null })
    const data = await res.json()
    const paragraph = data.choices?.[0]?.message?.content?.trim() || null
    return NextResponse.json({ paragraph })
  } catch {
    return NextResponse.json({ paragraph: null })
  }
}
