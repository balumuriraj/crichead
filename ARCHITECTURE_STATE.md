# ARCHITECTURE_STATE

Date: 2026-02-22
Repository: `balumuriraj/crichead`
Branch: `main`
Validation Mode: **Strict Hexagonal**

## 1) Pattern Definition

This system is a **Hexagonal Architecture (Ports & Adapters)** implementation.

- **Core (`packages/core`)** is the application and domain center.
- **Driver actors** (UI) interact with the core through input adapters/hooks.
- **Driven actors** (storage/APIs) are accessed through explicit output ports implemented by adapters.
- Dependency direction must point **inward** to ports, never from core to UI.

For package-level onboarding details (imports, scoring flow, API surface, and reading order), see [packages/core/README.md](packages/core/README.md).

## 2) Final Validation Status

### Summary

- **Shared Core boundary**: ✅ Mostly enforced
- **Thin UI boundary**: ❌ Not yet fully enforced (strict mode)
- **Driven actor isolation via ports**: ✅ Implemented in key flows
- **Driver actor isolation via input adapters**: ⚠️ Partially enforced
- **Zero leakage (Core importing UI)**: ✅ Confirmed
- **Zero leakage (UI contains no domain logic/domain coupling)**: ❌ Not yet true

### Evidence Snapshot

#### A. Core has zero imports from UI (**PASS**)

- No `@crichead/ui` imports were found under `packages/core/src/**`.

#### B. Driven actors isolated via ports (**PASS**)

Ports:
- `packages/core/src/application/ports/MatchRepository.ts`
- `packages/core/src/application/ports/DataProvider.ts`
- `packages/core/src/infrastructure/storage/StorageProvider.ts`

Adapters implementing/using ports:
- `apps/mobile/src/repositories/offlineMatchRepository.ts` (implements `MatchRepository`)
- `apps/web/app/matches/[id]/score/offlineMatchStore.ts` (implements `MatchRepository`)
- `packages/core/src/infrastructure/services/OfflineStorageDataProvider.ts` (implements `DataProvider`)
- `apps/web/app/Providers.tsx` (injects `DataProvider` via context)

#### C. Driver actor isolation (Thin UI) (**PARTIAL / FAIL in strict mode**)

Good:
- Input orchestration enters through `useScoringSession` (`@crichead/core/hooks`) in app scoring pages/hooks.

Violations / drift under strict policy:
- `packages/ui/src/web/OverProgress.tsx` imports `EventSchema` and `formatBallDisplay` from core.
- `packages/ui/src/mobile/theme.ts` re-exports tokens directly from core.
- `apps/mobile/src/hooks/useScoringState.ts` still contains rule-adjacent orchestration and mapping beyond pure rendering glue.
- `apps/web/app/match/[id]/page.tsx` duplicates scoring display derivations (`calculateRunRate`, `formatOvers`, offline helpers) in the page layer.

#### D. Core internal layering smells (not UI leakage, but hexagon hygiene risk)

- `packages/core/src/domain/scoring/index.ts` re-exports `application/actions/actions` (domain -> application coupling).
- `packages/core/src/domain/constants/navigation.ts` contains UI navigation labels/icons inside domain namespace.

## 3) The Thin UI Contract (Mandatory)

UI layers (`apps/web`, `apps/mobile`, `packages/ui`) are **Input Adapters only**.

### UI is allowed to:

- Collect user input and dispatch intent commands to core application interfaces/hooks.
- Render view models, state snapshots, and primitive formatting results already provided by core.
- Host framework wiring (routing, component composition, platform-specific visuals).

### UI is forbidden to:

- Re-implement scoring rules, innings/match state transitions, or cricket business invariants.
- Introduce business computation that can diverge between web and mobile.
- Depend on domain schema internals from `packages/ui` components.
- Bypass core ports for persistence/API side effects.

### Enforcement rule

If logic is required by both web and mobile, or changes match outcomes/statistics, it **must** live in `packages/core` (domain/application/shared utils), then be consumed by UI.

## 4) Dependency Graph (Allowed Import Directions)

```text
Driver Side (outside hexagon)

apps/web, apps/mobile
    -> @crichead/core/hooks (input adapters)
    -> @crichead/core (domain/application API surface)
    -> @crichead/ui (pure presentation components)

packages/ui
    -> (should be design-system/presentation only)
    -> MUST NOT depend on domain logic or schema internals

Hexagon Center

packages/core/presentation (hooks/context)
    -> packages/core/application

packages/core/application
    -> packages/core/domain
    -> packages/core/application/ports (depends on abstractions)

packages/core/infrastructure
    -> packages/core/application/ports (implements abstractions)
   -> external systems (offline storage/AsyncStorage/API)

packages/core/domain
    -> (no application/presentation/infrastructure imports)

Forbidden Directions

packages/core/** -> apps/** or packages/ui/**
packages/core/domain/** -> packages/core/application/**
packages/ui/** -> packages/core/domain/** (strict mode)
apps/** -> direct DB/API writes that bypass core ports
```

## 5) Driver and Driven Actors Mapping

### Driver Actors (Input)

- Web UI routes/components in `apps/web/app/**`
- Mobile screens/hooks/components in `apps/mobile/src/**`
- Shared visual components in `packages/ui/src/**`

Input adapters:
- `packages/core/src/presentation/hooks/useScoringSession.ts`
- `packages/core/src/presentation/DataProviderContext.ts`

### Driven Actors (Output)

- Browser offline storage (`localStorage`)
- Mobile offline persistence (`AsyncStorage`-style offline store wrappers)
- Future remote backends (REST)

Output ports:
- `MatchRepository`
- `DataProvider`
- `StorageProvider`

Output adapters:
- `apps/mobile/src/repositories/offlineMatchRepository.ts`
- `apps/web/app/matches/[id]/score/offlineMatchStore.ts`
- `packages/core/src/infrastructure/services/OfflineStorageDataProvider.ts`
- `packages/core/src/infrastructure/storage/offlineMatchService.ts`

## 6) Zero Leakage Confirmation

### Confirmed

- **Core -> UI leakage:** none detected in imports (PASS).

### Not yet achieved

- **UI contains no domain logic/coupling:** strict target is not met yet (FAIL), due to direct core domain/helper coupling in `packages/ui` and rule-adjacent computations in app code.

## 7) Remediation Backlog (Priority Order)

1. **Decouple `packages/ui` from core domain exports**
   - Remove direct imports of `EventSchema` and `formatBallDisplay` from `packages/ui/src/web/OverProgress.tsx`.
   - Replace with UI-agnostic prop contracts (already-formatted labels, primitive state flags).

2. **Move page-level scoring derivations into core view-model utilities**
   - Consolidate logic currently duplicated in `apps/web/app/match/[id]/page.tsx`.

3. **Constrain app hook orchestration to adapter glue only**
   - Reduce rule-adjacent logic in `apps/mobile/src/hooks/useScoringState.ts` by pushing deterministic decisions to core application services.

4. **Repair core internal layer purity**
   - Remove domain-to-application re-export in `packages/core/src/domain/scoring/index.ts`.
   - Relocate `domain/constants/navigation.ts` to presentation/shared UI-agnostic area.

## 8) Guidance for Future Agents: Pre-flight Checklist

Before adding any feature, every AI/code agent must complete this checklist:

1. **Boundary placement decision (mandatory)**
   - Is this logic business/domain, application orchestration, or UI rendering?
   - If it changes scoring/state/standings outcomes, place it in `packages/core`.

2. **Port-first design for side effects (mandatory)**
   - Any DB/API/storage interaction must occur behind a port interface in `packages/core/src/application/ports` (or `infrastructure/storage` for storage abstraction).
   - Add/extend adapter implementations in app/infrastructure layers only.

3. **Dependency direction check (mandatory)**
   - Verify no new import from `packages/core` to `apps/*` or `packages/ui/*`.
   - Verify `packages/core/domain/*` stays independent of application/presentation/infrastructure.

4. **Thin UI check (mandatory)**
   - UI components/screens/hooks must not encode business rules.
   - UI must consume core-provided intents/view-models instead of computing outcomes.

5. **Cross-platform duplication check (mandatory)**
   - If logic appears in both web and mobile, extract to core immediately.

6. **Adapter contract check (mandatory)**
   - Driver adapters call core interfaces/hooks.
   - Driven adapters implement core ports.
   - No bypass paths.

7. **Evidence check before merge (mandatory)**
   - Run targeted import scans for forbidden directions.
   - Update `ARCHITECTURE_STATE.md` when boundaries materially change.

## 9) Operational Gate

New features should be considered architecture-compliant only if all are true:

- No forbidden import directions are introduced.
- No domain logic is added to UI layers.
- All new side effects are accessed through explicit ports/adapters.
- Web and mobile behavior derives from shared core logic for business-critical outcomes.
