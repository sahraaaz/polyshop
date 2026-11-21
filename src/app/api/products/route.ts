import { getCatalogStore } from '../../../../server/catalog-service.mjs'
import { createCatalogHandlers } from '../../../../server/catalog-http.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const handlers = createCatalogHandlers(getCatalogStore)

export function GET() { return handlers.list() }
