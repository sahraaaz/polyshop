import { checkoutHandlers } from '../../../../../lib/checkout-handlers'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(request: Request) { return checkoutHandlers.active(request) }
