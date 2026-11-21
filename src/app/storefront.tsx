'use client'

import dynamic from 'next/dynamic'

// The existing demo reads browser storage during initialization. Keep it isolated
// while the new catalog routes render on the server independently.
const App = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => <div className="catalog-shell" role="status">در حال بارگذاری Polymoly…</div>,
})

export default function Storefront() { return <App /> }
