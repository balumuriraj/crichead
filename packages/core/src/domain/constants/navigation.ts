/**
 * Shared navigation labels and icon names for Web and Mobile.
 *
 * Centralising these here means renaming "Tournaments" → "Leagues" (etc.)
 * propagates to both apps automatically.
 *
 * Icon names reference Lucide icon identifiers so each platform can resolve
 * them with its own Lucide package (lucide-react / lucide-react-native).
 */

export interface NavEntry {
  /** Display label shown in sidebar / tab bar */
  label: string;
  /** Lucide icon name (PascalCase) */
  icon: string;
}

export const NAVIGATION_MAP = {
  // ── Mobile tabs ──────────────────────────────
  home: {
    label: 'Home',
    icon: 'Home',
  },
  tournaments: {
    label: 'Tournaments',
    icon: 'Trophy',
  },
  profile: {
    label: 'Profile',
    icon: 'User',
  },

  // ── Web admin sidebar ────────────────────────
  adminDashboard: {
    label: 'Dashboard Home',
    icon: 'LayoutDashboard',
  },
  tournamentManager: {
    label: 'Tournament Manager',
    icon: 'Trophy',
  },
  teamDatabase: {
    label: 'Team / Player Database',
    icon: 'Users',
  },
  whiteLabelSettings: {
    label: 'White-Label Settings',
    icon: 'Paintbrush',
  },
} as const satisfies Record<string, NavEntry>;

export type NavigationKey = keyof typeof NAVIGATION_MAP;
