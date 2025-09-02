import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getDb() {
  if (!getApps().length) {
    initializeApp()
  }
  return getFirestore()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getDb()
    await db.collection('events').add(body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}


