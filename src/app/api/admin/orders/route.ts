import { adminHandlers } from '../../../../lib/admin-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(request: Request) { return adminHandlers.orders(request) }
