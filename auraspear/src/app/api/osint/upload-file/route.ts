import { NextResponse, type NextRequest } from 'next/server'
import { BACKEND_URL, backendClient } from '@/lib/backend-client'

export const dynamic = 'force-dynamic'

/**
 * File upload proxy — streams raw multipart/form-data body to the backend.
 * Cannot use proxyToBackend() because it reads body as text which corrupts multipart.
 */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value
  if (!accessToken) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized', messageKey: 'errors.auth.missingToken' },
      { status: 401 }
    )
  }

  const contentType = request.headers.get('content-type') ?? ''
  const rawBody = await request.arrayBuffer()

  try {
    const response = await backendClient.request({
      url: `${BACKEND_URL}/osint/upload-file`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
      },
      data: Buffer.from(rawBody),
      timeout: 120_000,
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024,
    })

    return NextResponse.json(response.data, { status: response.status })
  } catch {
    return NextResponse.json(
      { data: null, error: 'Upload failed', messageKey: 'errors.osint.queryFailed' },
      { status: 502 }
    )
  }
}
