# Plan: Theming System for @crichead/ui + Admin Settings Page

## Context
The mobile components in `packages/ui/src/mobile/` hardcode brand colors via a static `Colors` object in `theme.ts`. The web components (`Button`, `Card`) use hardcoded Tailwind classes. We need a **ThemeContext** so colors can be changed at runtime — enabling league owners to customize their branding (primaryColor, secondaryColor, logoUrl) via an admin settings page with live preview.

## Approach

The ThemeContext lives in `packages/ui` as a platform-agnostic React context. Mobile components read from it instead of the static `Colors` object. The web admin page provides a form + live preview panel showing mobile components updating in real-time.

---

## New Files

### 1. `packages/ui/src/ThemeContext.tsx` — Shared Theme Context

```typescript
export interface CricheadTheme {
  primaryColor: string;   // replaces electricGreen (#00FF41)
  secondaryColor: string; // replaces deepNavy (#0F172A)
  logoUrl: string;        // league logo URL
}

const defaultTheme: CricheadTheme = {
  primaryColor: '#00FF41',
  secondaryColor: '#0F172A',
  logoUrl: '',
};
```

- `ThemeContext` — React.createContext with default theme
- `ThemeProvider` — wraps children, accepts `theme` prop (partial overrides merged with defaults)
- `useTheme()` — hook that returns the current `CricheadTheme`
- No platform-specific imports (pure React) — works on both web and mobile

### 2. `packages/ui/src/mobile/useThemedColors.ts` — Derived Color Hook

A hook that merges the static `Colors` object with overrides from `ThemeContext`:
- `electricGreen` → `theme.primaryColor`
- `deepNavy` → `theme.secondaryColor`
- `success` → `theme.primaryColor`
- `buttonPrimary` → `theme.primaryColor`
- `scoreBackground` → `theme.secondaryColor`
- All other colors remain unchanged from `Colors`

Returns the full `Colors`-shaped object so components can do a drop-in replacement.

### 3. `apps/web/app/admin/settings/page.tsx` — Admin Settings Page

Three-column-ish layout:
- **Left**: Form with color pickers + logo URL input
  - Primary Color (color input, defaults `#00FF41`)
  - Secondary Color (color input, defaults `#0F172A`)
  - Logo URL (text input)
  - Save button (writes to Firestore `settings/theme` doc)
  - Reset to defaults button
- **Right**: Live preview panel wrapped in its own `<ThemeProvider>` using the form values
  - Shows: LiveScoreHeader, ScoreButton row, ExtraButton row, WicketButton, OverProgress
  - All rendered as React Native Web components (or HTML mockups styled with theme colors)

Since the mobile components use `react-native` imports and can't render in the Next.js web app directly, the preview will be **HTML/CSS mockups** that mirror the mobile component appearance using the theme colors from the form. This avoids adding react-native-web as a dependency.

### 4. `apps/web/app/admin/settings/ThemePreview.tsx` — Preview Component

A client component that receives `{ primaryColor, secondaryColor, logoUrl }` as props and renders HTML mockups of:
- A score header block (secondaryColor bg, primaryColor accent border + text)
- Score buttons (6 buttons: 0-5 in secondaryColor, 4 and 6 in primaryColor)
- Extra buttons (WD, NB, B, LB with primaryColor text)
- A wicket button (red — stays red, semantic color)
- Over progress dots (primaryColor for boundaries)
- Logo preview if logoUrl is set

---

## Modified Files

### 5. `packages/ui/src/mobile/ScoreButton.tsx`
- Import `useThemedColors` instead of static `Colors`
- Replace `Colors` usage → `const colors = useThemedColors();` then use `colors.deepNavy`, `colors.electricGreen`, etc.
- Switch from `StyleSheet.create` (static) to inline style objects that reference the dynamic `colors`

### 6. `packages/ui/src/mobile/LiveScoreHeader.tsx`
- Same pattern: `useThemedColors()` → dynamic colors

### 7. `packages/ui/src/mobile/ExtraButton.tsx`
- Same pattern: `useThemedColors()` → dynamic colors

### 8. `packages/ui/src/mobile/WicketButton.tsx`
- Same pattern: `useThemedColors()` → dynamic colors
- Note: WicketButton uses `Colors.error` (red) — this stays semantic, not themed

### 9. `packages/ui/src/mobile/OverProgress.tsx`
- Same pattern: `useThemedColors()` → dynamic colors

### 10. `packages/ui/src/mobile/index.ts`
- Add export for `useThemedColors`

### 11. `packages/ui/src/index.ts`
- Add export for `ThemeContext`, `ThemeProvider`, `useTheme`, `CricheadTheme`

### 12. `packages/ui/src/Button.tsx`
- Import `useTheme` from `ThemeContext`
- Replace hardcoded `bg-blue-600` etc. with inline `style` using `theme.primaryColor` for primary variant

### 13. `packages/ui/src/Card.tsx`
- Import `useTheme` from `ThemeContext`
- Replace `bg-white` with inline `style` using `theme.secondaryColor`-derived lighter shade for card background

---

## Key Design Decisions

1. **Static `Colors` object remains** — it serves as the default/fallback. `useThemedColors` merges it with context overrides.
2. **Mobile components switch from StyleSheet.create to useMemo'd styles** — `StyleSheet.create` runs once at module load time and can't use dynamic values. We'll compute styles in the component body with `useMemo`.
3. **Preview uses HTML mockups, not react-native-web** — avoids a heavy dependency. The mockups are simple divs styled to look like the mobile components.
4. **Firestore persistence** — the admin page saves theme to `settings/theme` doc. On load, it reads from Firestore. Future: league-level themes stored per league.

## Verification
1. `npm run build` — all packages compile
2. `npm test` — all 16 existing tests pass
3. Navigate to `/admin/settings` — form renders with default colors
4. Change primary color → preview updates instantly
5. Save → reload page → values persist from Firestore
6. Mobile app: wrap root in `<ThemeProvider>` → components pick up new colors
