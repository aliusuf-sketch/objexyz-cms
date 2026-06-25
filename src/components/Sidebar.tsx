'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingCart, BarChart2,
  Clock, PlusCircle, LogOut
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'DASHBOARD', icon: LayoutDashboard },
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
      style={{ width: 240, background: '#1a1a1a', borderRight: '1px solid #2a2a2a' }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: '#2a2a2a' }}>
        <div className="text-lg font-bold tracking-widest uppercase text-white">OBJEXYZ</div>
        <div className="text-xs tracking-widest mt-0.5" style={{ color: '#4a7c3f' }}>CMS OPERATIONS</div>
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
                color: isActive ? '#4a7c3f' : '#888888',
                borderLeft: isActive ? '2px solid #4a7c3f' : '2px solid transparent',
                background: isActive ? 'rgba(74,124,63,0.08)' : 'transparent',
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t py-4 px-6 space-y-3" style={{ borderColor: '#2a2a2a' }}>
        <div className="text-xs" style={{ color: '#444' }}>
          hyzdg1-5f.myshopify.com
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs tracking-widest uppercase transition-colors hover:text-white"
          style={{ color: '#555' }}
        >
          <LogOut size={13} />
          LOGOUT
        </button>
      </div>
    </div>
  );
}
