import { adminHandlers } from '../../../../lib/admin-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function POST(request: Request) { return adminHandlers.login(request) }
