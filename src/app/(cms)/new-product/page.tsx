'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '', productType: '', status: 'DRAFT', tags: '',
    price8in: '', price16in: '', priceCustom: '', eta: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/shopify/create-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data?.data?.productCreate?.userErrors?.length) {
        setError(data.data.productCreate.userErrors.map((e: { message: string }) => e.message).join(', '));
      } else if (data?.data?.productCreate?.product) {
        setSuccess(`Product created: ${data.data.productCreate.product.title}`);
        setTimeout(() => router.push('/products'), 1500);
      } else {
        setError('Failed to create product');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  };

  const labelClass = 'block text-xs tracking-widest uppercase mb-1.5';
  const labelStyle = { color: 'var(--muted-2)' };
  const inputClass = 'w-full px-3 py-2 rounded text-sm outline-none';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">NEW PRODUCT</h1>
        <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>ADD TO OBJEXYZ CATALOG</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-lg p-6 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

          <div>
            <label className={labelClass} style={labelStyle}>PRODUCT TITLE *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. AH-64 Apache Helicopter"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>PRODUCT TYPE</label>
              <input
                type="text"
                value={form.productType}
                onChange={e => updateField('productType', e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. Military Aircraft"
              />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>STATUS</label>
              <select
                value={form.status}
                onChange={e => updateField('status', e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>VARIANT PRICES (PKR)</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'price8in', placeholder: '8in price' },
                { key: 'price16in', placeholder: '16in price' },
                { key: 'priceCustom', placeholder: 'Custom price' },
              ].map(({ key, placeholder }) => (
                <input
                  key={key}
                  type="number"
                  value={form[key as keyof typeof form]}
                  onChange={e => updateField(key, e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  placeholder={placeholder}
                />
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>ETA METAFIELD</label>
            <input
              type="text"
              value={form.eta}
              onChange={e => updateField('eta', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. 2-3 weeks"
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>TAGS (comma-separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => updateField('tags', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. military, helicopter, 1:72"
            />
          </div>

          {error && (
            <div className="text-xs rounded p-3" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs rounded p-3" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded text-sm font-medium tracking-widest uppercase transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {submitting ? 'CREATING...' : 'CREATE PRODUCT'}
          </button>
        </form>
      </div>
    </div>
  );
}
