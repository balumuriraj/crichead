'use client';

import { useState, useEffect } from 'react';
import { getThemeSettings, saveThemeSettings } from '@crichead/core';
import ThemePreview from './ThemePreview';

const DEFAULTS = {
  primaryColor: '#00FF41',
  secondaryColor: '#0F172A',
  logoUrl: '',
};

export default function AdminSettingsPage() {
  const [primaryColor, setPrimaryColor] = useState(DEFAULTS.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULTS.secondaryColor);
  const [logoUrl, setLogoUrl] = useState(DEFAULTS.logoUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved theme
  useEffect(() => {
    getThemeSettings().then((settings) => {
      if (settings) {
        if (settings.primaryColor) setPrimaryColor(settings.primaryColor);
        if (settings.secondaryColor) setSecondaryColor(settings.secondaryColor);
        if (settings.logoUrl) setLogoUrl(settings.logoUrl);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await saveThemeSettings({ primaryColor, secondaryColor, logoUrl });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setPrimaryColor(DEFAULTS.primaryColor);
    setSecondaryColor(DEFAULTS.secondaryColor);
    setLogoUrl(DEFAULTS.logoUrl);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#00FF41] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-6">THEME SETTINGS</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Form */}
          <div className="bg-[#1E293B] rounded-2xl p-6 border border-[#334155]">
            <h3 className="text-sm font-bold text-white mb-6">Customize Colors</h3>

            <div className="space-y-5">
              {/* Primary Color */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-2">
                  PRIMARY COLOR
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor((e.target as HTMLInputElement).value)}
                    className="w-12 h-10 rounded-lg cursor-pointer border border-[#334155] bg-transparent"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor((e.target as HTMLInputElement).value)}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#0F172A] border border-[#334155] text-white font-mono text-sm focus:outline-none focus:border-[#00FF41]/50 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Used for accents, boundaries, and brand highlights</p>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-2">
                  SECONDARY COLOR
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor((e.target as HTMLInputElement).value)}
                    className="w-12 h-10 rounded-lg cursor-pointer border border-[#334155] bg-transparent"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor((e.target as HTMLInputElement).value)}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#0F172A] border border-[#334155] text-white font-mono text-sm focus:outline-none focus:border-[#00FF41]/50 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Used for backgrounds and button base colors</p>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 tracking-wider mb-2">
                  LOGO URL
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl((e.target as HTMLInputElement).value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0F172A] border border-[#334155] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#00FF41]/50 transition-colors"
                />
                <p className="text-[10px] text-gray-500 mt-1">League or organization logo</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-lg bg-[#00FF41] text-[#0F172A] font-bold text-sm hover:bg-[#00FF41]/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Theme'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-5 py-3 rounded-lg bg-[#0F172A] text-gray-400 font-semibold text-sm border border-[#334155] hover:border-gray-500 transition-colors"
                >
                  Reset
                </button>
              </div>

              {saved && (
                <p className="text-xs text-[#00FF41] text-center">Theme saved to Firestore</p>
              )}
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="bg-[#1E293B] rounded-2xl p-6 border border-[#334155]">
            <h3 className="text-sm font-bold text-white mb-6">Live Preview</h3>
            <ThemePreview
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              logoUrl={logoUrl}
            />
          </div>
        </div>
    </div>
  );
}
