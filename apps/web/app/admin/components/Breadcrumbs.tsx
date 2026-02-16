'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const LABEL_MAP: Record<string, string> = {
  admin: 'Admin',
  settings: 'White-Label Settings',
  tournaments: 'Tournament Manager',
  teams: 'Team / Player Database',
  dashboard: 'Dashboard',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Build cumulative paths for each segment
  const crumbs = segments.map((segment, index) => ({
    label: LABEL_MAP[segment] ?? decodeURIComponent(segment),
    href: '/' + segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1,
  }));

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      <Link
        href="/admin"
        className="text-gray-500 hover:text-white transition-colors"
      >
        <Home size={14} />
      </Link>

      {crumbs.slice(1).map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-gray-600" />
          {crumb.isLast ? (
            <span className="text-gray-300 font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-gray-500 hover:text-white transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
