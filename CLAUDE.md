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
```

### Core Package (`packages/core`)
```bash
npm run test         # vitest run (single pass)
npm run test:watch   # vitest (watch mode)
npm run test:ui      # vitest --ui (browser UI)
npm run build        # tsc (compile to dist/)
```

### Seed Scripts (`scripts/`)
```bash
node scripts/seed-match.mjs        # Create a test match in Firestore
node scripts/seed-two-teams.mjs    # Create two test teams
node scripts/add-test-ball.mjs     # Add a test ball to a match
```

## Architecture

### Monorepo Layout

```
apps/
  web/        - Next.js 15 (React 18, Tailwind CSS, Firebase Admin SDK)
  mobile/     - Expo 52 / React Native 0.76 (Expo Router, tab navigation)
packages/
  core/       - Shared types, scoring logic, Firebase client, hooks
  ui/         - Shared UI components with platform-specific variants
scripts/      - Firestore seed/read utilities (Node.js ESM)
```

### Shared Core Package (`@crichead/core`)

All domain logic lives here — the apps consume it. Key modules:

- **`src/types/`** — Canonical data model: `Match`, `Innings`, `Ball`, `Player`, `Team`, `Tournament`, `FirestoreMatchDoc`
- **`src/utils/scoring.ts`** — Innings stats calculation, over formatting (`formatOvers`), run rate
- **`src/utils/ball-display.ts`** — Format a `Ball` for display
- **`src/utils/player-stats.ts`** — Per-player batting/bowling aggregates
- **`src/utils/league-logic.ts`** — Points table, tournament standings
- **`src/firebase/client.ts`** — Client-side Firebase init + helpers (safe to bundle)
- **`src/firebase/admin.ts`** — Firebase Admin SDK (Next.js API routes only — never import in client code)
- **`src/hooks/useMatchSync.ts`** — Real-time Firestore match subscription

### Firebase / Data Model

Firestore is the primary database. Client and Admin SDKs are deliberately separated:
- Import from `@crichead/core/firebase/client` in components and hooks
- Import from `@crichead/core/firebase/admin` only inside Next.js API routes / Server Components

A match document (`FirestoreMatchDoc`) contains embedded innings, and each innings embeds an array of `Ball` objects.

### Web App (`@crichead/web`)

Next.js App Router. Key routes:
- `/` — Live/finished matches list
- `/teams` — Team management
- `/matches/new` and `/matches/quick` — Match creation flows
- `/matches/[id]/score` — Live scoring page
- `/admin` — Admin dashboard

Uses Firebase Admin SDK for server-side data fetching (API routes and Server Components).

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

## Environment Variables

Copy `.env.example` to `.env.local` in `apps/web`. Required vars:

```
NEXT_PUBLIC_FIREBASE_*   # Client-side Firebase config
FIREBASE_PROJECT_ID      # Admin SDK project
GOOGLE_APPLICATION_CREDENTIALS  # Path to serviceAccountKey.json
```

## Testing

Tests live in `packages/core/src/__tests__/`. Run with `npm run test` inside `packages/core` or `turbo run test` from root. No tests exist in the web or mobile apps currently.
