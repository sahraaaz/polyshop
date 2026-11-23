const ENAMAD_FILENAMES = new Set(['29362838.txt', '۲۹۳۶۲۸۳۸.txt'])

async function handleVerification(
  _request: Request,
  context: { params: Promise<{ verification: string }> },
) {
  const { verification } = await context.params

  if (!ENAMAD_FILENAMES.has(verification)) {
    return new Response(null, { status: 404 })
  }

  return new Response(null, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  })
}

export const GET = handleVerification
export const HEAD = handleVerification
