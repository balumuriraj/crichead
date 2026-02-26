# Crichead: System Design & Architecture Overview

## Executive Summary
**Crichead** is a cross-platform cricket scoring and management application built using a **Monorepo Architecture** powered by Turborepo. The system separates its core business logic, shared UI components, and platform-specific applications (Mobile and Web) into distinct packages and apps.

## High-Level Architecture

```mermaid
graph TD
    subgraph Apps
        MobileApp["📱 Mobile App (Expo / React Native)"]
        WebApp["💻 Web App (Next.js)"]
    end

    subgraph Packages["Shared Packages"]
        UI["🎨 @crichead/ui (Shared Components)"]
        Core["🧠 @crichead/core (Business Logic & State)"]
    end

    subgraph Backend["Storage Services"]
        LocalStore["Local Storage / AsyncStorage"]
        FutureRemote["Future Remote API"]
    end

    MobileApp --> UI
    MobileApp --> Core
    WebApp --> UI
    WebApp --> Core
    Core --> LocalStore
    Core --> FutureRemote
```

## System Components

### 1. Monorepo Structure (Turborepo)
The project is structured as a single monorepo to maximize code sharing and maintain consistency across clients.
- **`apps/mobile`**: The iOS and Android mobile application.
- **`apps/web`**: The web-based dashboard or client interface.
- **`packages/core`**: The central brain of the application.
- **`packages/ui`**: A centralized design system and shared component library.

### 2. Frontend Applications

#### Mobile App (`apps/mobile`)
- **Framework**: React Native with **Expo**.
- **Navigation**: Uses **Expo Router** for file-based routing (e.g., `(tabs)`, `match` routes).
- **Responsibilities**: Provides the primary, on-the-go interface for users to score matches locally, view live matches, and interact with device hardware (e.g., haptics).

#### Web App (`apps/web`)
- **Framework**: **Next.js** (React).
- **Styling**: Tailwind CSS.
- **Responsibilities**: Likely serves as an administrative dashboard, web-based viewer for live scores, or a portal for users who prefer desktop access.

### 3. Shared Packages

#### Core Logic (`packages/core`)
This package encapsulates all non-visual business logic, making the apps effectively "thin clients". It follows a strict **Layered Architecture** to enforce separation of concerns and maximize testability:

For a detailed package-level guide (imports, scoring flow, boundaries, and reading order), see [packages/core/README.md](packages/core/README.md).

- **Domain Layer (`src/domain`)**: Contains pure business logic, interfaces, schemas (via **Zod**), and the headless scoring engine (`src/domain/scoring`). This layer has zero dependencies on external libraries or infrastructure.
- **Application Layer (`src/application`)**: Orchestrates the domain logic. Contains the global **Zustand** store (`src/application/store`) and application-specific semantic actions (`src/application/actions`).
- **Infrastructure Layer (`src/infrastructure`)**: Implements external services, primarily local storage adapters used by query and scoring flows.
- **Presentation Layer (`src/presentation`)**: Contains custom React Native/React hooks (`src/presentation/hooks` like `useScoringEngine`) that bridge core state and infrastructure to UI components.
- **Shared (`src/shared`)**: General utilities and design tokens (`tokens.ts`) used across layers.

#### Shared UI (`packages/ui`)
- Contains cross-platform UI components. While the exact primitive depends on the implementation (e.g., React Native Web or separate component trees), this ensures a consistent look and feel (colors, typography via `tokens.ts`) across Mobile and Web.

### 4. Backend (Offline-first)
- **Primary Storage**: Local device/browser storage stores structured data like `MatchDocument`, `Team`, and `Player` profiles.
- **Future Option**: Remote API backends can be added later through existing port abstractions.

## Key Design Patterns

1. **Headless Architecture & "Thin" Clients**
   By pulling the `useScoringState` and scoring engine out of the React Native app and into `@crichead/core`, the business logic can be independently unit-tested (via Vitest) and immediately reused on the Next.js web platform without rewriting code.

2. **Event-Driven Scoring Updates**
   Cricket scoring is complex (undo actions, extras, wickets). The scoring engine uses an event-stream approach, parsing sequential match events to derive the current state, ensuring determinism and easier local-to-live syncing.

3. **Strict Typings & Schemas**
    End-to-end type safety maps TypeScript interfaces to Zod schemas. This ensures that a `MatchDocument` conforms exactly to app expectations, preventing runtime `undefined` errors.

4. **Layered Architecture in `@crichead/core`**
    The core package is structured into Domain (pure logic), Application (state), Infrastructure (storage adapters), and Presentation (React hooks) layers. This strictly unidirectional dependency graph ensures that core cricket scoring rules (Domain) can be unit-tested in isolation without mocking storage or UI frameworks.
