import Link from 'next/link'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { isIndexable, siteUrl } from '../lib/site'
import '../styles.css'
import '../mobile.css'
import '../components/Arcade.css'
import '../components/Game2048.css'
import './catalog.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Polymoly | دنیای دانشجویی امیرکبیر', template: '%s | Polymoly' },
  description: 'پلی‌مولی؛ مرچ دانشگاه صنعتی امیرکبیر، فروشگاه Polyshop و دنیای دانشجویی.',
  robots: { index: isIndexable, follow: isIndexable },
  openGraph: {
    title: 'Polymoly | دنیای دانشجویی امیرکبیر',
    description: 'مرچ دانشگاه، ایده‌های دانشجویی و سرگرمی در پلی‌مولی.',
    siteName: 'Polymoly',
    locale: 'fa_IR',
    type: 'website',
  },
}

export const viewport: Viewport = { themeColor: '#32d6c6' }

const enamadSealHtml = "<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=8836836&Code=b5XkTiYvLVrABL3SbjICH95JBcEqgvh5'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=8836836&Code=b5XkTiYvLVrABL3SbjICH95JBcEqgvh5' alt='' style='cursor:pointer' code='b5XkTiYvLVrABL3SbjICH95JBcEqgvh5'></a>"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        {process.env.CHECKOUT_ENABLED !== 'true' && (
          <aside className="site-preview-notice">نسخهٔ آزمایشی — ثبت سفارش و پرداخت آنلاین هنوز فعال نیست.</aside>
        )}
        <div id="root">{children}</div>
        <nav className="shop-information-links" aria-label="اطلاعات فروشگاه">
          <Link href="/store-policies">شرایط خرید، ارسال و مرجوعی</Link>
          <Link href="/contact">تماس با ما</Link>
          <span className="enamad-seal" dangerouslySetInnerHTML={{ __html: enamadSealHtml }} />
        </nav>
      </body>
    </html>
  )
}
