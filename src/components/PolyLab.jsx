import { useMemo, useState } from 'react'

const fa = (value) => new Intl.NumberFormat('fa-IR').format(value)

export const labEquipment = [
  { id: 'printer-3d', icon: '3D', title: 'پرینتر سه‌بعدی', lab: 'آزمایشگاه ساخت و تولید', color: 'turquoise', status: 'آماده', capacity: 2, description: 'چاپ نمونه اولیه با PLA و PETG؛ فایل STL قبل از رزرو بررسی می‌شود.', needsTraining: false, slots: ['شنبه ۱۰–۱۲', 'شنبه ۱۴–۱۶', 'دوشنبه ۱۲–۱۴'] },
  { id: 'cnc', icon: 'CNC', title: 'دستگاه CNC', lab: 'کارگاه ماشین‌کاری', color: 'orange', status: 'نیازمند تأیید', capacity: 1, description: 'ماشین‌کاری قطعات سبک و پروژه‌های درسی زیر نظر مسئول آزمایشگاه.', needsTraining: true, slots: ['یکشنبه ۹–۱۱', 'سه‌شنبه ۱۳–۱۵'] },
  { id: 'laser', icon: 'LASER', title: 'برش لیزر', lab: 'آزمایشگاه نمونه‌سازی', color: 'pink', status: 'آماده', capacity: 1, description: 'برش پلکسی، مقوا و چوب نازک برای ماکت و نمونه‌های اولیه.', needsTraining: true, slots: ['شنبه ۱۲–۱۴', 'دوشنبه ۹–۱۱', 'چهارشنبه ۱۴–۱۶'] },
  { id: 'metrology', icon: 'QC', title: 'اندازه‌گیری و کنترل کیفیت', lab: 'آزمایشگاه ارزیابی کار و زمان', color: 'blue', status: 'آماده', capacity: 4, description: 'کولیس، میکرومتر و ابزارهای کنترل کیفیت برای پروژه‌های آموزشی.', needsTraining: false, slots: ['یکشنبه ۱۲–۱۴', 'سه‌شنبه ۹–۱۱', 'چهارشنبه ۱۰–۱۲'] },
]

const statusLabel = { pending: 'در انتظار بررسی', approved: 'تأییدشده', rejected: 'ردشده', cancelled: 'لغوشده' }

function BookingModal({ equipment, session, onClose, onBook }) {
  const [form, setForm] = useState({ slot: equipment.slots[0], purpose: '', material: '', duration: '۲ ساعت', trained: false })
  const [error, setError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    if (form.purpose.trim().length < 8) return setError('کاربرد یا پروژه را کمی کامل‌تر توضیح بده.')
    if (equipment.needsTraining && !form.trained) return setError('برای این دستگاه باید تأیید کنی که آموزش ایمنی را گذرانده‌ای.')
    onBook({ ...form, equipmentId: equipment.id, equipmentTitle: equipment.title, lab: equipment.lab, customer: session.name })
    onClose()
  }
  return <div className="modal-wrap lab-modal-wrap" role="dialog" aria-modal="true" aria-labelledby="lab-booking-title"><button className="overlay" aria-label="بستن" onClick={onClose}/><form className="lab-booking-modal" onSubmit={submit}><button type="button" className="lab-modal-close" onClick={onClose}>×</button><div className={`lab-machine-icon tone-${equipment.color}`}>{equipment.icon}</div><span>POLY LAB / BOOKING</span><h2 id="lab-booking-title">رزرو {equipment.title}</h2><p>{equipment.lab} · هر رزرو پس از بررسی مسئول آزمایشگاه قطعی می‌شود.</p><label>زمان آزاد<select value={form.slot} onChange={(event) => setForm({ ...form, slot: event.target.value })}>{equipment.slots.map((slot) => <option key={slot}>{slot}</option>)}</select></label><label>مدت استفاده<select value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })}><option>۱ ساعت</option><option>۲ ساعت</option><option>۳ ساعت</option></select></label><label className="wide">کاربرد یا نام پروژه<textarea rows="3" value={form.purpose} onChange={(event) => { setForm({ ...form, purpose: event.target.value }); setError('') }} placeholder="مثلاً ساخت نمونه اولیه برای درس طرح‌ریزی واحدهای صنعتی" required/></label><label className="wide">جنس یا ماده مصرفی<input value={form.material} onChange={(event) => setForm({ ...form, material: event.target.value })} placeholder="مثلاً PLA، پلکسی ۳ میلی‌متر یا آلومینیوم سبک"/></label>{equipment.needsTraining && <label className="lab-safety wide"><input type="checkbox" checked={form.trained} onChange={(event) => { setForm({ ...form, trained: event.target.checked }); setError('') }}/><span><b>آموزش ایمنی را گذرانده‌ام</b><small>اپراتور قبل از شروع دوباره شرایط را بررسی می‌کند.</small></span></label>}<div className="form-message error wide">{error}</div><button className="lab-confirm wide" type="submit">ارسال درخواست رزرو</button></form></div>
}

export default function PolyLab({ session, bookings, onRequireLogin, onBook, onCancelBooking, onBack }) {
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('همه')
  const visible = filter === 'همه' ? labEquipment : labEquipment.filter((item) => item.title.includes(filter))
  const myBookings = useMemo(() => session?.role === 'admin' ? bookings : bookings.filter((item) => item.customer === session?.name), [bookings, session])
  const reserve = (equipment) => { if (!session || session.role !== 'customer') return onRequireLogin(); setSelected(equipment) }

  return <section className="polylab-page" id="polylab"><div className="lab-hero"><button onClick={onBack}>→ برگشت به فروشگاه</button><div><span>POLY LAB / MAKE SOMETHING REAL</span><h1>از ایده تا<br/><em>نمونه واقعی.</em></h1><p>دستگاه و فضای آزمایشگاه‌های دانشکده را ببین، زمان آزاد پیدا کن و درخواست رزرو بفرست.</p><div className="lab-hero-stats"><span><b>{fa(labEquipment.length)}</b> تجهیز فعال</span><span><b>{fa(labEquipment.reduce((sum, item) => sum + item.slots.length, 0))}</b> بازه آزاد</span><span><b>✓</b> تأیید مسئول آزمایشگاه</span></div></div><div className="lab-blueprint"><i/><i/><i/><span>CNC</span><b>3D</b><small>BUILD / TEST / REPEAT</small></div></div>
    <div className="lab-toolbar"><div><span>فضاها و تجهیزات</span><h2>چی می‌خوای بسازی؟</h2></div><div>{['همه', 'پرینتر', 'CNC', 'لیزر', 'کنترل کیفیت'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
    <div className="lab-equipment-grid">{visible.map((equipment) => <article className="lab-equipment-card" key={equipment.id}><div className={`lab-card-visual tone-${equipment.color}`}><span>{equipment.icon}</span><small>{equipment.lab}</small></div><div className="lab-card-copy"><div><span className={equipment.status === 'آماده' ? 'ready' : 'review'}>● {equipment.status}</span><small>ظرفیت هم‌زمان: {fa(equipment.capacity)} نفر</small></div><h3>{equipment.title}</h3><p>{equipment.description}</p><div className="lab-slots">{equipment.slots.slice(0, 2).map((slot) => <span key={slot}>{slot}</span>)}{equipment.slots.length > 2 && <span>+{fa(equipment.slots.length - 2)}</span>}</div><button onClick={() => reserve(equipment)}>دیدن زمان‌ها و رزرو</button></div></article>)}</div>
    <section className="lab-bookings"><header><div><span>MY LAB BOOKINGS</span><h2>{session?.role === 'admin' ? 'همه درخواست‌های آزمایشگاه' : 'رزروهای من'}</h2></div>{!session && <button onClick={onRequireLogin}>ورود برای رزرو</button>}</header>{myBookings.length ? <div>{myBookings.map((booking) => <article key={booking.id}><span className={`lab-booking-status ${booking.status}`}>{statusLabel[booking.status]}</span><div><b>{booking.equipmentTitle}</b><small>{booking.lab}</small></div><div><b>{booking.slot}</b><small>{booking.duration} · {booking.material || 'بدون ماده مصرفی'}</small></div><p>{booking.purpose}</p>{booking.status === 'pending' && session?.role === 'customer' && <button onClick={() => onCancelBooking(booking.id)}>لغو درخواست</button>}</article>)}</div> : <div className="lab-empty"><span>⌁</span><b>هنوز رزروی نداری</b><p>یک دستگاه را انتخاب کن و اولین درخواستت را بفرست.</p></div>}</section>
    <section className="lab-rules"><div><span>01</span><b>آموزش و ایمنی</b><p>استفاده از CNC و لیزر فقط پس از آموزش و با حضور مسئول آزمایشگاه انجام می‌شود.</p></div><div><span>02</span><b>مواد مصرفی</b><p>هزینه مواد مصرفی و امکان تأمین آن پیش از تأیید رزرو مشخص می‌شود.</p></div><div><span>03</span><b>لغو به‌موقع</b><p>اگر برنامه‌ات عوض شد، درخواست را لغو کن تا زمان برای دانشجوی دیگری آزاد شود.</p></div></section>
    {selected && <BookingModal equipment={selected} session={session} onClose={() => setSelected(null)} onBook={onBook}/>}</section>
}
