import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/api/_lib/auth', () => ({
  verifyFirebaseToken: vi.fn(),
  checkRateLimit: vi.fn(),
}))

const authMock = await import('@/app/api/_lib/auth')

function request(init: RequestInit = {}) {
  return new Request('https://renderer.clairia.app/test', init) as any
}

describe('AssemblyAI token route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.ASSEMBLYAI_API_KEY
    vi.mocked(authMock.verifyFirebaseToken).mockResolvedValue({ uid: 'user_1' })
    vi.mocked(authMock.checkRateLimit).mockReturnValue(true)
  })

  it('rejects unauthenticated callers', async () => {
    vi.mocked(authMock.verifyFirebaseToken).mockResolvedValue(null)
    const { GET } = await import('@/app/api/token/assemblyai/route')

    const response = await GET(request())

    expect(response.status).toBe(401)
  })

  it('returns a short-lived AssemblyAI token', async () => {
    process.env.ASSEMBLYAI_API_KEY = 'assembly-key'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'stream-token' }),
    }))
    const { GET } = await import('@/app/api/token/assemblyai/route')

    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ token: 'stream-token', expires_in: 600 })
    expect(fetch).toHaveBeenCalledWith(
      'https://streaming.assemblyai.com/v3/token?expires_in_seconds=600',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('Recall SDK upload route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.RECALL_API_KEY
    delete process.env.RECALL_API_URL
    vi.mocked(authMock.verifyFirebaseToken).mockResolvedValue({ uid: 'user_1' })
    vi.mocked(authMock.checkRateLimit).mockReturnValue(true)
  })

  it('fails closed when Recall is not configured', async () => {
    const { POST } = await import('@/app/api/recall/sdk-upload/route')

    const response = await POST(request({ method: 'POST', body: '{}' }))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Recall not configured')
  })

  it('creates an SDK upload token with authenticated metadata', async () => {
    process.env.RECALL_API_KEY = 'recall-key'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'upload_1', upload_token: 'upload-token', recording_id: 'rec_1', status: 'pending' }),
    }))
    const { POST } = await import('@/app/api/recall/sdk-upload/route')

    const response = await POST(request({
      method: 'POST',
      body: JSON.stringify({ metadata: { sessionId: 'session_1' } }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.upload_token).toBe('upload-token')
    expect(fetch).toHaveBeenCalledWith(
      'https://us-west-2.recall.ai/api/v1/sdk_upload/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Token recall-key' }),
      }),
    )
  })
})
