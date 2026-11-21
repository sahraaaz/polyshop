import { getCatalogStore } from '../../../../../server/catalog-service.mjs'
import { createCatalogHandlers } from '../../../../../server/catalog-http.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const handlers = createCatalogHandlers(getCatalogStore)

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return handlers.detail(slug)
}
