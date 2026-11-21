import { adminHandlers } from '../../../../../../lib/admin-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminHandlers.cancelOrder(request, (await params).id)
}
