# @crichead/core

Framework-agnostic cricket domain and scoring engine used by both web and mobile apps.

## What this package is for

- Canonical domain model and event schema for scoring.
- Scoring derivation engine (`BallEvent[] -> DerivedMatchState`).
- Application orchestration (`ScoringSession`) that owns scoring state transitions.
- Port interfaces for persistence/query adapters.
- Optional React hooks under a separate subpath.

## Import model

Use the package as two entry points:

- `@crichead/core` for framework-free code (domain, session, actions, ports, utils).
- `@crichead/core/hooks` for React hooks and context.

This split is defined in `package.json` exports.

## Layer map

### 1) Domain (`src/domain`)

Source of truth for scoring rules and canonical types.

- `schema/ballEvent.ts`: Zod schema + `BallEvent` shape.
- `schema/matchConfig.ts`: config schema and parsing utilities.
- `scoring/derivedState.ts`: `getMatchStatus(...)` scoring derivation engine.
- `scoring/migrations.ts`: migration helpers for legacy ball/event shapes.
- `types/*`: shared match/player/innings/tournament document types.

### 2) Application (`src/application`)

Orchestration logic built on domain primitives.

- `ScoringSession.ts`: primary state machine for score/extra/wicket/penalty/undo flows.
- `actions/actions.ts`: event factory functions (`createScoreEvent`, etc.).
- `ports/MatchRepository.ts`: write-side persistence contract.
- `ports/DataProvider.ts`: read-side data query contract.
- `store/scoringStore.ts`: optional event store state.

### 3) Infrastructure (`src/infrastructure`)

Adapter implementations for app/runtime-specific backends.

- `services/OfflineStorageDataProvider.ts`: browser storage (`localStorage`) adapter for `DataProvider`.
- `storage/*`: storage provider contracts and offline storage helpers.

### 4) Presentation (`src/presentation`)

React-facing API (re-exported via `@crichead/core/hooks`).

- `hooks/useScoringSession.ts`: React wrapper over `ScoringSession`.
- `hooks/useScoringEngine.ts`: derived engine hook and UI-facing computed state.
- `hooks/useDataQueries.ts`: query hooks backed by `DataProviderContext`.
- `DataProviderContext.ts`: runtime provider injection.

### 5) Shared (`src/shared`)

Cross-app utilities and tokens.

- `utils/scoring.ts`, `player-stats.ts`, `league-logic.ts`, `ball-display.ts`.
- `tokens.ts` design tokens.

## Dependency direction (intended)

- `presentation -> application -> domain`
- `infrastructure -> application ports`
- `shared` can be consumed broadly

Notable edge: `src/domain/scoring/index.ts` currently re-exports `application/actions/actions.ts`, which slightly blurs pure domain boundaries.

## End-to-end scoring flow

Typical path when user taps a score button:

1. UI calls `handleScore(runs)` from `useScoringSession`.
2. `useScoringSession` forwards to `ScoringSession.handleScore(...)`.
3. `ScoringSession` creates an event via `createScoreEvent(...)`.
4. Session appends event with `addBall(...)`, updates transition flags, emits snapshot change.
5. Session persists through `MatchRepository.addBall(...)` (port boundary).
6. Derived state is recomputed via `getMatchStatus(...)` and exposed in hook `engineState`.

Related actions follow the same pattern:

- Extras: `handleExtra(type)` -> `createExtraEvent(...)`
- Wicket: `handleWicket(...)` -> `createWicketEvent(...)`
- Penalty: `handlePenalty(...)` -> `createPenaltyEvent(...)`
- Undo: `undoBall()` -> offline rollback + `MatchRepository.undoLastBall()`

## Public API cheat sheet

### From `@crichead/core`

- Domain types: `Match`, `Innings`, `Player`, `MatchDocument`, etc.
- Schema/scoring namespaces: `EventSchema`, `EventScoring`
- Session runtime: `ScoringSession`, `ScoringSessionConfig`, `ScoringSessionSnapshot`
- Event actions: `createScoreEvent`, `createExtraEvent`, `createWicketEvent`, `createPenaltyEvent`
- Ports: `MatchRepository`, `DataProvider`
- Infra helper: `createOfflineStorageDataProvider`
- Shared helpers/tokens: scoring utilities + design tokens

### From `@crichead/core/hooks`

- `useScoringSession`
- `useScoringEngine`
- `useTeamsQuery`, `usePlayersQuery`, `useTournamentQuery`, `useTournamentMatchesQuery`, `useTournamentsQuery`
- `DataProviderContext`, `useDataProvider`

## Wiring expectations

- You must provide a concrete `MatchRepository` implementation to `ScoringSession` / `useScoringSession`.
- You must wrap React trees using data-query hooks in `DataProviderContext.Provider`.
- The offline-storage adapter included here only implements `DataProvider` (read/query side), not `MatchRepository`.

## Key gotchas

1. Two scoring models co-exist:
   - Event-based scoring engine in `domain/scoring/*`.
   - Legacy/utility ball-based helpers in `shared/utils/scoring.ts`.
   Keep them conceptually separate.
2. `MatchConfig` naming appears in multiple places with different shapes.
3. Event IDs in action creators are time/random based, so deterministic tests should control or abstract ID generation.
4. Some infrastructure folders are placeholders for future adapters (`services`, `storage`).

## Suggested reading order

1. `src/index.ts`
2. `src/hooks.ts`
3. `src/domain/schema/ballEvent.ts`
4. `src/domain/scoring/derivedState.ts`
5. `src/application/actions/actions.ts`
6. `src/application/ScoringSession.ts`
7. `src/application/ports/MatchRepository.ts`
8. `src/presentation/hooks/useScoringSession.ts`
9. `src/presentation/hooks/useScoringEngine.ts`
10. `src/presentation/DataProviderContext.ts`
11. `src/infrastructure/services/OfflineStorageDataProvider.ts`
12. `src/__tests__/scoring.test.ts`

## Test coverage snapshot

- `src/__tests__/scoring.test.ts`: ball math, extras, overs formatting, run rate.
- `src/__tests__/league-logic.test.ts`: points table + NRR behavior.
- `src/domain/scoring/__tests__/derivedState.test.ts`: event scoring derivation + schema validations.

Current gaps: no direct tests for `ScoringSession`, presentation hooks, or data provider context behavior.