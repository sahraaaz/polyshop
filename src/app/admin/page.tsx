import type { Metadata } from 'next'
import AdminPanel from './panel'
import './admin.css'

export const metadata: Metadata = { title: 'مدیریت Polyshop', robots: { index: false, follow: false } }
export default function AdminPage() { return <AdminPanel /> }
