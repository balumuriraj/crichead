'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Trophy,
  Users,
  Paintbrush,
  X,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard Home', href: '/admin', icon: LayoutDashboard },
  { label: 'Tournament Manager', href: '/admin/tournaments', icon: Trophy },
  { label: 'Team / Player Database', href: '/admin/teams', icon: Users },
  { label: 'White-Label Settings', href: '/admin/settings', icon: Paintbrush },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 bg-navy-800 border-r border-navy-700
          transform transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-navy-700">
          <Link href="/admin" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-2.5 h-2.5 rounded-full bg-electric-green animate-pulse-green" />
            <span className="text-lg font-bold text-white tracking-tight">
              cric<span className="text-electric-green">head</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Admin label */}
        <div className="px-5 pt-5 pb-2">
          <span className="text-[10px] font-bold text-gray-500 tracking-widest">
            ADMIN PANEL
          </span>
        </div>

        {/* Navigation links */}
        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-electric-green/10 text-electric-green'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
