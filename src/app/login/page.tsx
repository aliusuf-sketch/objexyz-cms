'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/');
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold tracking-widest uppercase txt-heading mb-1">OBJEXYZ</div>
          <div className="text-xs tracking-widest uppercase" style={{ color: 'var(--accent)' }}>CMS OPERATIONS</div>
        </div>
        <form onSubmit={handleSubmit} className="rounded-lg p-8 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>ACCESS CODE</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm outline-none focus:ring-1"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', focusRingColor: 'var(--accent)' } as React.CSSProperties}
              placeholder="••••••••"
              autoFocus
            />
          </div>
          {error && <div className="text-xs" style={{ color: 'var(--danger)' }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded text-sm font-medium tracking-widest uppercase transition-colors"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {loading ? 'AUTHENTICATING...' : 'ENTER'}
          </button>
        </form>
        <div className="text-center mt-4 text-xs" style={{ color: 'var(--faint)' }}>
          OBJEXYZ STUDIO — LAHORE/KARACHI
        </div>
      </div>
    </div>
  );
}
