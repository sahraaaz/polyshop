'use client'

import Link from 'next/link'

export default function CatalogError({ reset }: { reset: () => void }) {
  return <main className="catalog-shell" role="alert">
    <h1>دریافت اطلاعات فعلاً ممکن نیست</h1>
    <p>کمی بعد دوباره تلاش کن.</p>
    <button type="button" onClick={reset}>تلاش دوباره</button>
    <p><Link href="/">بازگشت به Polymoly</Link></p>
  </main>
}
