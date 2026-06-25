import AppShell from '@/components/AppShell';

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
