import { LayoutDashboard, Trophy, Users, Paintbrush } from 'lucide-react';
import Link from 'next/link';

const QUICK_LINKS = [
  {
    label: 'Tournament Manager',
    description: 'Create and manage tournaments, schedules, and standings',
    href: '/admin/tournaments',
    Icon: Trophy,
  },
  {
    label: 'Team / Player Database',
    description: 'Manage teams, rosters, and player profiles',
    href: '/admin/teams',
    Icon: Users,
  },
  {
    label: 'White-Label Settings',
    description: 'Customize colors, logo, and branding',
    href: '/admin/settings',
    Icon: Paintbrush,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        {/* @ts-expect-error React 18/19 mismatch */}
        <LayoutDashboard size={22} className="text-electric-green" />
        <h1 className="text-xl font-bold text-white">Dashboard Home</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group bg-navy-800 border border-navy-700 rounded-2xl p-5 hover:border-electric-green/30 transition-colors"
          >
            {/* @ts-expect-error React 18/19 mismatch */}
            <link.Icon size={24} className="text-electric-green mb-3" />
            <h3 className="text-sm font-bold text-white mb-1 group-hover:text-electric-green transition-colors">
              {link.label}
            </h3>
            <p className="text-xs text-gray-500">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
