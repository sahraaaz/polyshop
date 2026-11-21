import { createCheckoutHandlers } from '../../server/checkout-http.mjs'
import { getCatalogStore } from '../../server/catalog-service.mjs'
export const checkoutHandlers = createCheckoutHandlers({ getStore: getCatalogStore })
