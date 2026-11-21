import { adminHandlers } from '../../../../../lib/admin-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return adminHandlers.save(request, (await params).slug)
}
