import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const { email, firstName } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    await sendEmail(email, 'welcome', firstName || '')

    return NextResponse.json({ sent: true })
  } catch (err: any) {
    console.error('[email/welcome]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
