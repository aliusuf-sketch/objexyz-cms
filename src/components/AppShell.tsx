import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f' }}>
      <Sidebar />
      <main style={{ marginLeft: 240, minHeight: '100vh', padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
}
