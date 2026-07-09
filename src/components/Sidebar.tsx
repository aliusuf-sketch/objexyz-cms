'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingCart, BarChart2,
  Clock, PlusCircle, LogOut, Factory, ListChecks, BookOpen
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { href: '/', label: 'DASHBOARD', icon: LayoutDashboard },
  { href: '/production', label: 'PRODUCTION', icon: Factory },
  { href: '/queue', label: 'SHIPPING QUEUE', icon: ListChecks },
  { href: '/catalogue', label: 'CATALOGUE', icon: BookOpen },
  { href: '/products', label: 'PRODUCTS', icon: Package },
  { href: '/orders', label: 'ORDERS', icon: ShoppingCart },
  { href: '/analytics', label: 'ANALYTICS', icon: BarChart2 },
  { href: '/eta-manager', label: 'ETA MANAGER', icon: Clock },
  { href: '/new-product', label: 'NEW PRODUCT', icon: PlusCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div
      className="fixed top-0 left-0 h-screen flex flex-col z-40"
      style={{ width: 240, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="text-lg font-bold tracking-widest uppercase txt-heading">OBJEXYZ</div>
        <div className="text-xs tracking-widest mt-0.5" style={{ color: 'var(--accent)' }}>CMS OPERATIONS</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-6 py-3 text-xs tracking-widest uppercase transition-colors"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                background: isActive ? 'var(--accent-bg-soft)' : 'transparent',
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t py-4 px-6 space-y-3" style={{ borderColor: 'var(--border)' }}>
        <div className="text-xs" style={{ color: 'var(--faint)' }}>
          hyzdg1-5f.myshopify.com
        </div>
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs tracking-widest uppercase transition-colors hover:opacity-70"
          style={{ color: 'var(--muted-2)' }}
        >
          <LogOut size={13} />
          LOGOUT
        </button>
      </div>
    </div>
  );
}
