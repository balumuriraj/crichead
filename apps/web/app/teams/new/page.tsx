'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createTeam } from '@crichead/core/firebase';

export default function NewTeamPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [homeGround, setHomeGround] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Team name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const ref = await createTeam(name.trim(), logoUrl.trim(), homeGround.trim());
      router.push(`/teams/${ref.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0F172A]">
      <header className="border-b border-[#334155] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-3 h-3 rounded-full bg-[#00FF41] animate-pulse-green" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                cric<span className="text-[#00FF41]">head</span>
              </h1>
            </Link>
          </div>
          <Link
            href="/teams"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Back to Teams
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-6">
        <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-6">CREATE TEAM</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-2">
              TEAM NAME *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder="e.g. Mumbai Indians"
              className="w-full px-4 py-3 rounded-lg bg-[#1E293B] border border-[#334155] text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF41]/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-2">
              LOGO URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl((e.target as HTMLInputElement).value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-3 rounded-lg bg-[#1E293B] border border-[#334155] text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF41]/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-2">
              HOME GROUND
            </label>
            <input
              type="text"
              value={homeGround}
              onChange={(e) => setHomeGround((e.target as HTMLInputElement).value)}
              placeholder="e.g. Wankhede Stadium"
              className="w-full px-4 py-3 rounded-lg bg-[#1E293B] border border-[#334155] text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF41]/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-lg bg-[#00FF41] text-[#0F172A] font-bold text-sm hover:bg-[#00FF41]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Team'}
          </button>
        </form>
      </div>
    </main>
  );
}
