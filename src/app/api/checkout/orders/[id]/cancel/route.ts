import { checkoutHandlers } from '../../../../../../lib/checkout-handlers'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return checkoutHandlers.cancel(request, (await params).id)
}
