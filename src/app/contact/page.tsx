import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'تماس با ما',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  const businessAddress = process.env.POLYMOLY_BUSINESS_ADDRESS?.trim()

  return (
    <main className="catalog-shell shop-information">
      <Link className="catalog-back" href="/">بازگشت به پلی‌مولی</Link>
      <h1>تماس با ما</h1>
      <p>پلی‌مولی یک کسب‌وکار مستقل دانشجویی است. پلی‌شاپ بخش فروشگاه پلی‌مولی است.</p>

      <section aria-labelledby="contact-details">
        <h2 id="contact-details">پشتیبانی پلی‌شاپ</h2>
        <dl className="shop-contact-details">
          <dt>تلفن</dt>
          <dd><a href="tel:+989304457587" dir="ltr">۰۹۳۰۴۴۵۷۵۸۷</a></dd>
          <dt>ایمیل</dt>
          <dd><a href="mailto:mohammadmahdi.sahran@gmail.com" dir="ltr">mohammadmahdi.sahran@gmail.com</a></dd>
          {businessAddress && <>
            <dt>نشانی کسب‌وکار</dt>
            <dd>{businessAddress}</dd>
          </>}
        </dl>
        <p>برای پیگیری، شکایت یا مرجوعی، شمارهٔ سفارش و شرح درخواست را از راه‌های بالا اعلام کنید.</p>
        <Link href="/store-policies">شرایط خرید، ارسال و مرجوعی</Link>
      </section>
    </main>
  )
}
