import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.pickleglass_API_URL || 'http://localhost:64952'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const url = queryString 
      ? `${BACKEND_URL}/api/v1/knowledge?${queryString}` 
      : `${BACKEND_URL}/api/v1/knowledge`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error proxying to backend:', error)
    return NextResponse.json(
      { error: 'Backend not available' },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${BACKEND_URL}/api/v1/knowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error proxying to backend:', error)
    return NextResponse.json(
      { error: 'Backend not available' },
      { status: 503 }
    )
  }
}
