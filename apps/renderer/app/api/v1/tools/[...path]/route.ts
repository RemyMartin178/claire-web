import { readFileSync } from 'fs'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PROD_API_V1_BASE = 'https://backend-production-ba2c.up.railway.app/api/v1'
const FRONTEND_HOSTS = new Set([
  'app.clairia.app',
  'claire-web-production.up.railway.app',
])

function normalizeApiV1Base(value: string): string {
  const trimmed = value.replace(/\/+$/, '')
  if (/\/api\/v\d+$/i.test(trimmed)) return trimmed
  return `${trimmed}/api/v1`
}

function normalizeGoogleAuthUrl(value: string): string {
  return value.replace(
    /^https:\/\/accounts\.google\.com\/auth(?=[?#])/,
    'https://accounts.google.com/o/oauth2/v2/auth'
  )
}

function normalizeToolResponse(text: string, contentType: string | null): string {
  if (!contentType?.includes('application/json')) return text

  try {
    const payload = JSON.parse(text)
    const authUrlKeys = ['authUrl', 'auth_url', 'url', 'authorizationUrl', 'authorization_url']
    let changed = false

    for (const key of authUrlKeys) {
      if (typeof payload?.[key] === 'string') {
        payload[key] = normalizeGoogleAuthUrl(payload[key])
        changed = true
      }
    }

    if (changed) {
      return JSON.stringify(payload)
    }
  } catch {
    // Keep the backend response unchanged when it is not valid JSON.
  }

  return text
}

function getRuntimeApiBase(): string | null {
  const dirs = [
    process.env.TEMP,
    process.env.TMP,
    process.env.APPDATA,
  ].filter(Boolean) as string[]

  for (const dir of dirs) {
    try {
      const config = JSON.parse(readFileSync(join(dir, 'runtime-config.json'), 'utf-8'))
      if (config.API_URL) return normalizeApiV1Base(config.API_URL)
    } catch {
      // Try the next runtime config location.
    }
  }

  return null
}

function getBackendCandidates(): string[] {
  const configured =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.API_URL ||
    getRuntimeApiBase()

  return Array.from(new Set([
    configured ? normalizeApiV1Base(configured) : null,
    PROD_API_V1_BASE,
  ].filter(Boolean) as string[])).filter((candidate) => {
    try {
      return !FRONTEND_HOSTS.has(new URL(candidate).hostname)
    } catch {
      return true
    }
  })
}

function forwardHeaders(req: NextRequest): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
  }

  for (const key of ['authorization', 'cookie', 'x-user-id', 'x-claire-uid', 'x-firebase-token']) {
    const value = req.headers.get(key)
    if (value) headers[key] = value
  }

  return headers
}

async function proxyToolsRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  const subPath = params.path.map(part => encodeURIComponent(part)).join('/')
  const incomingUrl = new URL(req.url)
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text()
  let lastError: unknown = null

  for (const base of getBackendCandidates()) {
    try {
      const targetUrl = `${base}/tools/${subPath}${incomingUrl.search}`
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders(req),
        body,
        cache: 'no-store',
      })

      if (!response.ok && response.status >= 500 && base !== PROD_API_V1_BASE) {
        lastError = new Error(`Backend returned ${response.status}`)
        continue
      }

      const contentType = response.headers.get('content-type') || 'application/json'
      const text = normalizeToolResponse(await response.text(), contentType)
      return new NextResponse(text, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-store',
        },
      })
    } catch (error) {
      lastError = error
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Backend not available'
  return NextResponse.json({ error: message }, { status: 503 })
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyToolsRequest(req, context)
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyToolsRequest(req, context)
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyToolsRequest(req, context)
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyToolsRequest(req, context)
}
