import { adminHandlers } from '../../../../lib/admin-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(request: Request) { return adminHandlers.products(request) }
export function POST(request: Request) { return adminHandlers.save(request, undefined) }
