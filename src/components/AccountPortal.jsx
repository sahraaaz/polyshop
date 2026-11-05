import { useMemo, useState } from 'react'

const format = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value) || 0)} تومان`

const emptyProduct = {
  title: '', category: 'سایر', price: '', stock: 1, color: '', blurb: '',
  source: 'student', discount: 0, tone: 'turquoise', art: 'book', badge: '',
}

function ProductForm({ session, initial, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...emptyProduct, ...initial }))
  const admin = session.role === 'admin'
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (!form.title.trim() || Number(form.price) <= 0 || Number(form.stock) < 0 || !form.blurb.trim()) return
    onSave({
      ...form,
      title: form.title.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      discount: Number(form.discount) || 0,
      seller: admin ? (form.source === 'official' ? 'بوفه' : form.seller || 'ثبت‌شده توسط مدیریت') : session.name,
      status: admin ? 'approved' : 'pending',
      subtitle: form.subtitle || 'BOOFEH Listing',
    })
  }

  return <div className="portal-form-wrap">
    <div className="portal-form-head"><div><span className="section-tag">NEW LISTING</span><h3>{initial ? 'ویرایش محصول' : admin ? 'افزودن محصول جدید' : 'ثبت آگهی جدید'}</h3></div><button type="button" onClick={onCancel}>بستن</button></div>
    <form className="product-form" onSubmit={submit}>
      {admin && <label className="wide">نوع فروشگاه<span>محصول کجا نمایش داده شود؟</span><select value={form.source} onChange={(e) => update('source', e.target.value)}><option value="official">فروشگاه رسمی بوفه</option><option value="student">بازار دانشجویی</option></select></label>}
      <label>نام محصول<input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="مثلاً کتاب کنترل پروژه" required/></label>
      <label>دسته‌بندی<input value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="کتاب و جزوه" required/></label>
      <label>قیمت (تومان)<input type="number" min="1000" step="1000" value={form.price} onChange={(e) => update('price', e.target.value)} required/></label>
      <label>موجودی<input type="number" min="0" value={form.stock} onChange={(e) => update('stock', e.target.value)} required/></label>
      <label>وضعیت یا رنگ<input value={form.color} onChange={(e) => update('color', e.target.value)} placeholder="سالم، بدون خط‌خوردگی"/></label>
      {admin && <label>تخفیف درصدی<input type="number" min="0" max="90" value={form.discount} onChange={(e) => update('discount', e.target.value)}/></label>}
      <label className="wide">توضیحات<textarea rows="4" value={form.blurb} onChange={(e) => update('blurb', e.target.value)} placeholder="وضعیت دقیق محصول و هر نکته‌ای که خریدار باید بداند..." required/></label>
      <div className="form-notice wide">{admin ? 'محصول مدیریتی بلافاصله منتشر می‌شود.' : 'آگهی بعد از بررسی مدیریت در بازار دانشجویی منتشر می‌شود.'}</div>
      <button className="portal-primary wide" type="submit">{initial ? 'ذخیره تغییرات' : admin ? 'افزودن و انتشار' : 'ارسال برای بررسی'}</button>
    </form>
  </div>
}

function ManageRow({ product, admin, onApprove, onEdit, onDelete }) {
  const finalPrice = Math.round(product.price * (1 - (product.discount || 0) / 100))
  return <article className="manage-row">
    <div className={`mini-art tone-${product.tone || 'turquoise'}`}>{product.art === 'book' ? 'BOOK' : product.art === 'calc' ? '123' : 'B!'}</div>
    <div className="manage-info"><div><span className={`status-pill ${product.status}`}>{product.status === 'pending' ? 'در انتظار بررسی' : 'منتشرشده'}</span><span>{product.source === 'official' ? 'فروشگاه رسمی' : 'بازار دانشجویی'}</span></div><h4>{product.title}</h4><p>{product.seller} · {product.category} · موجودی {new Intl.NumberFormat('fa-IR').format(product.stock)}</p></div>
    <div className="manage-price">{product.discount > 0 && <small>{format(product.price)}</small>}<strong>{format(finalPrice)}</strong>{product.discount > 0 && <b>{new Intl.NumberFormat('fa-IR').format(product.discount)}٪ تخفیف</b>}</div>
    {admin && <div className="manage-actions">{product.status === 'pending' && <button className="approve" onClick={() => onApprove(product.id)}>تأیید انتشار</button>}<button onClick={() => onEdit(product)}>ویرایش</button><button className="danger" onClick={() => onDelete(product.id)}>حذف</button></div>}
  </article>
}

export default function AccountPortal({ session, catalog, onClose, onLogout, onAdd, onUpdate, onApprove, onDelete }) {
  const admin = session.role === 'admin'
  const [tab, setTab] = useState(admin ? 'pending' : 'mine')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const items = useMemo(() => {
    if (!admin) return catalog.filter((p) => p.source === 'student' && p.seller === session.name)
    if (tab === 'pending') return catalog.filter((p) => p.status === 'pending')
    if (tab === 'official') return catalog.filter((p) => p.source === 'official')
    return catalog.filter((p) => p.source === 'student' && p.status === 'approved')
  }, [admin, catalog, session.name, tab])

  const save = (data) => {
    if (editing) onUpdate(editing.id, data)
    else onAdd(data)
    setEditing(null); setFormOpen(false)
  }

  return <div className="portal-modal" role="dialog" aria-modal="true" aria-labelledby="portal-title">
    <button className="overlay" aria-label="بستن پنل" onClick={onClose}/>
    <section className="portal-shell">
      <header className="portal-header"><div><span className="section-tag">{admin ? 'BOOFEH ADMIN' : 'MY BOOFEH'}</span><h2 id="portal-title">{admin ? 'پنل مدیریت' : `سلام ${session.name}`}</h2><p>{admin ? 'تأیید آگهی‌ها، مدیریت موجودی و تخفیف‌ها' : 'آگهی‌هایت را ثبت و وضعیت بررسی را دنبال کن.'}</p></div><div><button onClick={() => { setEditing(null); setFormOpen(true) }}>+ محصول جدید</button><button className="portal-logout" onClick={onLogout}>خروج</button><button className="portal-close" onClick={onClose} aria-label="بستن">×</button></div></header>
      {admin && <nav className="portal-tabs" aria-label="بخش‌های مدیریت"><button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>صف بررسی <b>{catalog.filter((p) => p.status === 'pending').length}</b></button><button className={tab === 'official' ? 'active' : ''} onClick={() => setTab('official')}>محصولات رسمی</button><button className={tab === 'student' ? 'active' : ''} onClick={() => setTab('student')}>بازار دانشجویی</button></nav>}
      <div className="portal-content">
        {formOpen || editing ? <ProductForm session={session} initial={editing} onCancel={() => { setFormOpen(false); setEditing(null) }} onSave={save}/> : <>
          <div className="portal-summary"><span><b>{new Intl.NumberFormat('fa-IR').format(items.length)}</b><small>{admin ? 'مورد در این بخش' : 'آگهی ثبت‌شده'}</small></span>{admin && <span><b>{new Intl.NumberFormat('fa-IR').format(catalog.filter((p) => p.status === 'pending').length)}</b><small>نیازمند بررسی</small></span>}<span><b>{new Intl.NumberFormat('fa-IR').format(catalog.filter((p) => p.status === 'approved').length)}</b><small>محصول منتشرشده</small></span></div>
          <div className="manage-list">{items.length ? items.map((product) => <ManageRow key={product.id} product={product} admin={admin} onApprove={onApprove} onEdit={(item) => setEditing(item)} onDelete={onDelete}/>) : <div className="portal-empty"><b>{admin ? 'این بخش فعلاً خالی است.' : 'هنوز آگهی‌ای ثبت نکردی.'}</b><p>{admin ? 'با تغییر تب، بقیه محصولات را ببین.' : 'محصولی داری که دیگر استفاده نمی‌کنی؟ همین حالا ثبتش کن.'}</p><button onClick={() => setFormOpen(true)}>ثبت محصول جدید</button></div>}</div>
        </>}
      </div>
    </section>
  </div>
}
