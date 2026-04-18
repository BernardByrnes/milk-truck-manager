'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { classNames } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Income', href: '/income' },
  { name: 'Expenses', href: '/expenses' },
  { name: 'Reports', href: '/reports' },
];

export function TopBar({ phone }: { phone?: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center justify-between h-[60px]">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-lg font-semibold text-accent">
              Milk Truck Manager
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {navigation.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={classNames(
                    'text-sm font-medium transition-colors',
                    pathname === item.href ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {phone && <span className="text-sm text-text-secondary">{phone}</span>}
            <Link
              href="/api/auth/logout"
              className="text-sm text-text-secondary hover:text-danger transition-colors"
            >
              Logout
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-50">
      <div className="flex justify-around py-2">
        {navigation.map(item => (
          <Link
            key={item.name}
            href={item.href}
            className={classNames(
              'flex flex-col items-center py-2 px-3 text-xs font-medium transition-colors',
              pathname === item.href ? 'text-accent' : 'text-text-secondary'
            )}
          >
            <span className="text-lg mb-0.5">{getIcon(item.name)}</span>
            {item.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function getIcon(name: string): string {
  switch (name) {
    case 'Dashboard': return '📊';
    case 'Income': return '💰';
    case 'Expenses': return '📤';
    case 'Reports': return '📄';
    default: return '•';
  }
}