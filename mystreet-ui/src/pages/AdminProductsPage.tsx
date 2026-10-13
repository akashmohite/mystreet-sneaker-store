import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage, productApi } from '../api/client'
import ProductImage from '../components/ProductImage'
import { EmptyState, ErrorBanner, Field, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import type { Product } from '../types'
import { formatPrice } from '../utils/format'
import { validateProductForm, type Errors, type ProductFormValues } from '../utils/validation'

const BLANK: ProductFormValues = { name: '', brand: '', description: '', price: '', sizesCsv: '7,8,9,10', stockQty: '10', imageUrl: '' }

const toForm = (p: Product): ProductFormValues => ({
  name: p.name, brand: p.brand, description: p.description, price: String(p.price),
  sizesCsv: p.sizesCsv, stockQty: String(p.stockQty), imageUrl: p.imageUrl,
})

export default function AdminProductsPage() {
  const { notify } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [values, setValues] = useState<ProductFormValues>(BLANK)
  const [errors, setErrors] = useState<Errors<ProductFormValues>>({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setProducts(await productApi.list()) }
    catch (e) { setError(getErrorMessage(e, 'We could not load products.')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const openNew = () => { setEditing('new'); setValues(BLANK); setErrors({}); setServerError('') }
  const openEdit = (p: Product) => { setEditing(p); setValues(toForm(p)); setErrors({}); setServerError('') }
  const close = () => setEditing(null)

  const set = (key: keyof ProductFormValues) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validateProductForm(values)
    setErrors(found)
    setServerError('')
    if (Object.keys(found).length) return

    const input = {
      name: values.name.trim(), brand: values.brand.trim(), description: values.description.trim(),
      price: Number(values.price), sizesCsv: values.sizesCsv, stockQty: Number(values.stockQty), imageUrl: values.imageUrl.trim(),
    }
    setSaving(true)
    try {
      if (editing === 'new') { await productApi.create(input); notify('Product created') }
      else if (editing) { await productApi.update(editing.id, input); notify('Product updated') }
      close()
      await load()
    } catch (err) {
      setServerError(getErrorMessage(err, 'Could not save the product.'))
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This removes it from the catalog.`)) return
    try {
      await productApi.remove(p.id)
      notify('Product deleted')
      await load()
    } catch (err) {
      notify(getErrorMessage(err, 'Could not delete the product.'), 'error')
    }
  }

  return (
    <section>
      <div className="page-head row">
        <h1>Manage products</h1>
        <button className="btn btn-primary" onClick={openNew}>Add product</button>
      </div>

      {editing && (
        <form className="card pad admin-form" onSubmit={onSubmit} noValidate aria-label="Product form">
          <h2 className="h-sm">{editing === 'new' ? 'Add product' : `Edit ${editing.name}`}</h2>
          {serverError && <ErrorBanner message={serverError} />}
          <div className="two-col">
            <Field label="Name" htmlFor="p-name" error={errors.name}>
              <input id="p-name" value={values.name} onChange={set('name')} maxLength={150} />
            </Field>
            <Field label="Brand" htmlFor="p-brand" error={errors.brand}>
              <input id="p-brand" value={values.brand} onChange={set('brand')} maxLength={80} />
            </Field>
          </div>
          <Field label="Description" htmlFor="p-desc" error={errors.description}>
            <textarea id="p-desc" rows={3} value={values.description} onChange={set('description')} maxLength={2000} />
          </Field>
          <div className="three-col">
            <Field label="Price (USD)" htmlFor="p-price" error={errors.price}>
              <input id="p-price" inputMode="decimal" value={values.price} onChange={set('price')} />
            </Field>
            <Field label="Sizes (comma separated)" htmlFor="p-sizes" error={errors.sizesCsv}>
              <input id="p-sizes" value={values.sizesCsv} onChange={set('sizesCsv')} placeholder="7,8,9,10" />
            </Field>
            <Field label="Stock quantity" htmlFor="p-stock" error={errors.stockQty}>
              <input id="p-stock" inputMode="numeric" value={values.stockQty} onChange={set('stockQty')} />
            </Field>
          </div>
          <Field label="Image URL (optional)" htmlFor="p-image" error={errors.imageUrl}>
            <input id="p-image" value={values.imageUrl} onChange={set('imageUrl')} placeholder="/sneakers/dunk-low.svg or https://…" />
          </Field>
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button>
            <button className="btn btn-ghost" type="button" onClick={close}>Cancel</button>
          </div>
        </form>
      )}

      {loading && <Spinner label="Loading products…" />}
      {!loading && error && <ErrorBanner message={error} onRetry={load} />}
      {!loading && !error && products.length === 0 && <EmptyState title="No products yet">Use “Add product” to create the first one.</EmptyState>}
      {!loading && !error && products.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Product</th><th>Brand</th><th>Price</th><th>Sizes</th><th>Stock</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td><div className="cell-product"><ProductImage src={p.imageUrl} alt={p.name} className="thumb" /><strong>{p.name}</strong></div></td>
                  <td data-label="Brand">{p.brand}</td>
                  <td data-label="Price">{formatPrice(p.price)}</td>
                  <td data-label="Sizes">{p.sizesCsv}</td>
                  <td data-label="Stock">{p.stockQty}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => onDelete(p)} aria-label={`Delete ${p.name}`}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
