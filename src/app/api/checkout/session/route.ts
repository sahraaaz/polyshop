import { checkoutHandlers } from '../../../../lib/checkout-handlers'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function POST(request: Request) { return checkoutHandlers.session(request) }
