import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// Get backend URL dynamically from runtime config
function getBackendUrl(): string {
  try {
    // In Electron, config is in temp directory
    const tempDir = process.env.APPDATA || process.env.TEMP || '/tmp'
    const configPath = join(tempDir, 'runtime-config.json')
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    return config.API_URL || 'http://localhost:64952'
  } catch (error) {
    console.warn('Failed to read runtime config, using default:', error)
    return 'http://localhost:64952'
  }
}

const BACKEND_URL = process.env.pickleglass_API_URL || getBackendUrl()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const url = queryString 
      ? `${BACKEND_URL}/api/v1/knowledge/folders?${queryString}` 
      : `${BACKEND_URL}/api/v1/knowledge/folders`

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
    
    const response = await fetch(`${BACKEND_URL}/api/v1/knowledge/folders`, {
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
