import Link from 'next/link'

export default function NotFound() {
  return <main className="catalog-shell"><h1>صفحه پیدا نشد</h1><p>آدرس موردنظر در دسترس نیست.</p><Link href="/">بازگشت به Polymoly</Link></main>
}
