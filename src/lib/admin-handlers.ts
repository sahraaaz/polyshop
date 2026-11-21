import { createAdminHandlers } from '../../server/admin-http.mjs'
import { getAdminStore } from '../../server/admin-service.mjs'
import { getCatalogStore } from '../../server/catalog-service.mjs'

export const adminHandlers = createAdminHandlers({ getAuthStore: getAdminStore, getCatalogStore })
