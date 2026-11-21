const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

function unavailable() {
  return Response.json({ error: 'catalog_unavailable' }, { status: 503, headers: { ...headers, 'Retry-After': '30' } })
}

// Only read handlers exist. Storage failures must not disclose paths or SQL.
export function createCatalogHandlers(getStore) {
  return {
    list() {
      try { return Response.json({ products: getStore().listPublicProducts() }, { headers }) }
      catch { return unavailable() }
    },
    detail(id) {
      if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(id)) {
        return Response.json({ error: 'product_not_found' }, { status: 404, headers })
      }
      try {
        const product = getStore().getPublicProduct(id)
        return product ? Response.json({ product }, { headers }) : Response.json({ error: 'product_not_found' }, { status: 404, headers })
      } catch { return unavailable() }
    },
  }
}
