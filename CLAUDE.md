# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Crichead** is a cricket scoring ecosystem — a TypeScript monorepo with a Next.js web app, an Expo React Native mobile app, and shared packages.

## Commands

All commands can be run from the repo root via Turbo, or inside individual packages.

### Root (Turbo)
```bash
npm run dev          # Start all dev servers in parallel
npm run build        # Build all packages/apps
npm run lint         # Type-check all packages
npm run format       # Prettier format all TS/TSX/MD files
```

### Web App (`apps/web`)
```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # tsc --noEmit
```

### Mobile App (`apps/mobile`)
```bash
npm run dev          # Expo start (opens Expo Go or simulator)
npm run ios          # expo start --ios
npm run android      # expo start --android
npx expo start --clear --ios 
```

### Core Package (`packages/core`)
```bash
npm run test         # vitest run (single pass)
npm run test:watch   # vitest (watch mode)
npm run test:ui      # vitest --ui (browser UI)
npm run build        # tsc (compile to dist/)
```

## Architecture

### Monorepo Layout

```
apps/
  web/        - Next.js 15 (React 18, Tailwind CSS)
  mobile/     - Expo 52 / React Native 0.76 (Expo Router, tab navigation)
packages/
  core/       - Shared types, scoring logic, offline data hooks
  ui/         - Shared UI components with platform-specific variants
```

### Shared Core Package (`@crichead/core`)

All domain logic lives here — the apps consume it. Key modules:

For package-level onboarding (architecture map, scoring flow, public API, and reading order), see [packages/core/README.md](packages/core/README.md).

- **`src/types/`** — Canonical data model: `Match`, `Innings`, `Ball`, `Player`, `Team`, `Tournament`, `MatchDocument`
- **`src/utils/scoring.ts`** — Innings stats calculation, over formatting (`formatOvers`), run rate
- **`src/utils/ball-display.ts`** — Format a `Ball` for display
- **`src/utils/player-stats.ts`** — Per-player batting/bowling aggregates
- **`src/utils/league-logic.ts`** — Points table, tournament standings

### Offline Data Model

Offline storage is the primary runtime storage for now.

A match document (`MatchDocument`) contains innings summaries and player selection state. Ball-by-ball events are maintained in offline match repositories used by web/mobile scoring flows.

### Web App (`@crichead/web`)

Next.js App Router. Key routes:
- `/` — Live/finished matches list
- `/teams` — Team management
- `/matches/new` and `/matches/quick` — Match creation flows
- `/matches/[id]/score` — Live scoring page
- `/admin` — Admin dashboard

Uses offline storage-backed providers for now.

### Mobile App (`@crichead/mobile`)

Expo Router with file-based routing. Match flow screens:
`MatchDetails → SelectTeams → Toss → SelectRoster → Scoring`

Tab navigation for: Home, Tournaments, Profile.

### Design System

Design tokens live in `packages/core/src/tokens.ts`:
- Primary accent: `#00FF41` (electric green)
- Background: `#0F172A` (deep navy)
- Semantic colors for success/warning/error/info

`@crichead/ui` exports platform-aware components — some have separate web and native implementations.

## Testing

Tests live in `packages/core/src/__tests__/`. Run with `npm run test` inside `packages/core` or `turbo run test` from root. No tests exist in the web or mobile apps currently.
