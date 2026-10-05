# VKU Study Room Booking App — Architecture Documentation

## 1. System Overview

The **VKU Study Room Booking App** is an academic cross-platform mobile application designed for students of Vietnam - Korea University of Information and Communication Technology (VKU) to discover, reserve, manage, and check in to campus study rooms in real time.

The project strictly follows a **Modular Dual-Mode Architecture**, allowing it to run either against a production **Supabase (PostgreSQL 15+)** backend with Realtime subscriptions, or completely standalone in **Mock Mode** with in-memory concurrent simulation and zero external credentials.

---

## 2. Architecture Diagram

```mermaid
graph TD
    subgraph UI ["Presentation Layer (React Native / Expo SDK 57)"]
        A[RoomListScreen - 60 FPS FlatList]
        B[RoomDetailScreen - 7-day Matrix]
        C[MyBookingsScreen - Filtered Tabs & QR Pass]
        D[ProfileScreen - Quota Meters & System Controls]
        L[LoginScreen & RegisterScreen - Minimalist Auth]
        M1[ConfirmBookingModal - 90s Soft Hold]
        M2[BookingPassModal - QR UUID Pass]
    end

    subgraph State ["Client State Management (Zustand 5.0)"]
        S1[useBookingStore - partialize & Safe AsyncStorage]
        S2[useNetworkStore - NetInfo & Offline Mode]
        S3[useAuthStore - Session & Identity Sync]
        S4[useLanguageStore - VN/EN i18n Dictionary]
    end

    subgraph Offline ["Offline & Outbox Synchronization Layer"]
        O1[outboxService - Atomic Queueing]
        O2[syncService - Sequential Queue Flusher]
        ND[SyncNotificationDelegate Interface]
    end

    subgraph Services ["Service Abstraction Layer"]
        RS[roomService: IRoomService]
        BS[bookingService: IBookingService]
        RTS[realtimeService: IRealtimeService]
        NS[notificationService: Expo Notifications]
        AUTH[authService: IAuthService]
    end

    subgraph Backends ["Dual-Engine Data Providers"]
        subgraph MockEngine ["Mock Mode Engine (In-Memory)"]
            M_ROOM[MockRoomService: 20 Rooms, 4 Buildings]
            M_BOOK[MockBookingService: Concurrency & Hold Engine]
            M_REAL[MockRealtimeService: Event Emitting Channel]
            M_AUTH[MockAuthService: In-Memory Evaluator Accounts]
        end

        subgraph CloudEngine ["Production Engine (Supabase Cloud)"]
            PG_ROOM[(Supabase Rooms Table)]
            PG_BOOK[(Supabase Bookings & Holds)]
            PG_STUDENT[(Supabase Students Table)]
            PG_RPC[RPC: book_slot with Advisory Lock]
            PG_REAL[Supabase Realtime Channel]
            PG_AUTH[Supabase Auth auth.users]
            PG_TRIG[DB Trigger: on_auth_user_created]
            SMTP_RELAY[Gmail SMTP Gateway Relay]
        end
    end

    %% UI Connections
    UI --> State
    UI --> Services
    M1 --> Services
    M2 --> NS

    %% State & Offline
    S1 --> O1
    O1 --> O2
    O2 --> BS
    O2 --> ND
    ND -.-> NS
    S2 --> O2
    S3 --> AUTH

    %% Services routing
    RS -->|ENV Switch| M_ROOM
    RS -->|ENV Switch| PG_ROOM
    BS -->|ENV Switch| M_BOOK
    BS -->|ENV Switch| PG_RPC
    RTS -->|ENV Switch| M_REAL
    RTS -->|ENV Switch| PG_REAL
    AUTH -->|ENV Switch| M_AUTH
    AUTH -->|ENV Switch| PG_AUTH

    %% Database Internal Sync
    PG_AUTH -->|AFTER INSERT| PG_TRIG
    PG_TRIG -->|SECURITY DEFINER| PG_STUDENT
    PG_AUTH --> SMTP_RELAY
```

---

## 3. Layered Design & Separation of Concerns

### 3.1 Presentation Layer (`src/screens`, `src/components`)
- **Strictly Functional & Declarative**: Built entirely with React 19 functional components and TypeScript strict types.
- **Component Memoization**: Components like `RoomCard`, `SlotCell`, `FilterChips`, and `DateSelector` use `React.memo` with custom shallow comparators where appropriate to avoid unnecessary re-renders.
- **Responsive Clamping**: `useResponsiveLayout` automatically computes multi-column layouts based on screen width, clamping calculations at `1140px` max container width with `flex: 1` columns to prevent horizontal overflow on desktop monitors.
- **Accessible & Touch-Friendly**: All interactive elements satisfy accessibility guidelines with explicit `accessibilityRole`, `accessibilityLabel`, and minimum 48x48 pt touch bounds.

### 3.2 State Management Layer (`src/store`)
- **Zustand with Selective Subscriptions**: Screens and components subscribe to fine-grained state slices via selector functions (e.g., `useBookingStore(state => state.myBookings)`), preventing wide tree re-renders.
- **Resilient Persistence**: `safeAsyncStorage` wraps `@react-native-async-storage/async-storage` with an in-memory `Map` fallback, ensuring uninterrupted operation during test runners (Node.js/`tsx`) and web previews.
- **Selective Hydration**: `partialize` ensures only long-lived entities (student credentials, cached rooms, cached availability, local bookings, outbox items) persist to disk, while ephemeral UI states (selected slot index, modals) reset cleanly.

### 3.3 Offline Outbox & Synchronization Layer (`src/services`)
- **Offline-First Contract**: When a student books offline, the request is immediately recorded into the persistent `outbox` with status `PENDING_SYNC`. **Crucially, offline bookings are NEVER marked as `CONFIRMED` locally.**
- **Sequential Queue Flushing**: `syncService.flushOutboxSequentially()` processes pending outbox items one-by-one using `for...of` loops and transactional delays (80ms). It **strictly avoids `Promise.all()`** to preserve deterministic causality.
- **Dependency Inversion**: Uses `SyncNotificationDelegate` to decouple notification delivery from the sync engine, maintaining 100% pure TypeScript testability under Node.js.

### 3.4 Hardware & Native OS Layer
- **Expo Notifications**: Schedules 15-minute advance reminders for `CONFIRMED` bookings and broadcasts instant system alerts when sync conflicts occur.
- **QR Code Engine**: `react-native-qrcode-svg` generates standard high-density 2D barcodes containing strictly the booking UUID.

### 3.5 Database & Backend Layer (`supabase/schema.sql`)
- **PostgreSQL 15+ Core**: Utilizes transaction isolation, Row Level Security (RLS), and database-level validation.
- **Advisory Locking**: `pg_advisory_xact_lock(hashtext(...))` serializes concurrent transactions requesting the exact same `(room_id, booking_date, slot_index)`.
- **Active Partial Unique Index**: `idx_bookings_active_slot` ensures hard integrity even in the event of hypothetical race conditions across distributed instances.

### 3.6 Authentication & Identity Synchronization Layer (`src/services/supabase/supabaseAuthService.ts`)
- **Dual-Schema Decoupling**: Supabase Auth operates within the isolated `auth.users` schema. The domain logic (`bookings`, `booking_holds`) references `public.students`.
- **Automated Database Trigger**: A PostgreSQL trigger `handle_new_user()` runs with `SECURITY DEFINER` on `AFTER INSERT ON auth.users`, atomically mapping `full_name`, `email`, and `student_id_code` into `public.students`.
- **Custom SMTP Gateway Relay**: Configured with a dedicated Gmail SMTP relay (`smtp.gmail.com:587`), overcoming the Free Tier's 2 emails/h limit and ensuring reliable verification token dispatch.
- **Deep-Link Auto-Activation**: Dynamic `emailRedirectTo: window.location.origin` paired with Supabase's `detectSessionInUrl: isWeb` reads hash tokens (`#access_token=...`) on arrival and automatically transitions users to the main application without requiring manual re-entry of passwords.

### 3.7 Anti-Abuse Rate Limiting, Session Hygiene & URL Sanitization
- **Three Tiered Rate-Limiting Boundaries**:
  1. *Sign-in & Sign-up Throttling*: Supabase Auth automatically enforces a sliding-window rate limit of **30 requests per 5 minutes per IP address**. Rapid, repeated login attempts trigger standard HTTP 429 (`rate limit exceeded`).
  2. *Token Verification Throttling*: Email confirmation token requests are capped at **20 requests per 5 minutes per IP address**, preventing brute-force token exhaustion.
  3. *SMTP Relay Throughput*: The production Gmail SMTP relay allows up to **500 transactional emails per 24 hours**, eliminating the Supabase Free Tier ceiling (2 emails/hr) while establishing a hard boundary against email flooding.
- **Strict Session Isolation & Zero Mock Leakage**:
  - In `supabaseAuthService.ts`, all production auth operations are strictly isolated from mock services. Unverified emails (`email_not_confirmed`) or invalid credentials produce strict server errors without falling back to local mock evaluator accounts.
- **URL Hash Sanitization & History State Cleaning**:
  - When returning from an email verification link, Supabase deposits `#access_token=...` into the address bar.
  - To prevent browser reloads from repeatedly re-detecting stale tokens or leaking sensitive credentials into browser history, `useAuthStore` executes `window.history.replaceState(null, '', window.location.pathname + window.location.search)` immediately upon session ingestion and on explicit user logout.

---

## 4. Directory & File Organization

```
vku-study-room/
├── App.tsx                        # Root application entry & notification setup
├── app.json                       # Expo configuration & app manifest
├── wrangler.jsonc                 # Cloudflare Workers Static Assets deployment config
├── docs/                          # Academic documentation & specifications
│   ├── architecture.md            # System architecture (this document)
│   ├── concurrency.md             # Concurrency, advisory lock & soft holds
│   ├── offline-outbox.md          # Offline queue & deterministic sync
│   ├── performance.md             # 60 FPS FlatList & memory optimization
│   └── REPORT.md                  # Comprehensive academic submission report
├── src/
│   ├── components/                # Atomic UI components
│   │   ├── BookingCard.tsx        # Card display with status badges
│   │   ├── BookingPassModal.tsx   # QR code student pass modal
│   │   ├── ConfirmBookingModal.tsx# 90s soft-hold booking modal
│   │   ├── DateSelector.tsx       # 7-day rolling horizon date picker
│   │   ├── EmptyState.tsx         # Graphic empty & error states
│   │   ├── FilterChips.tsx        # Filter chips for buildings & capacity
│   │   ├── NetworkBanner.tsx      # Offline status banner with timestamp
│   │   ├── RoomCard.tsx           # Fixed-height 60 FPS room card
│   │   ├── SearchBar.tsx          # Fast keyword filter bar
│   │   ├── SlotCell.tsx           # Color-coded slot block with status
│   │   └── SlotGrid.tsx           # Matrix of 4 daily slots
│   ├── config/
│   │   └── environment.ts         # Dual-mode switch & credentials
│   ├── hooks/
│   │   ├── useNetworkStatus.ts    # NetInfo listener with manual offline toggle
│   │   ├── useResponsiveLayout.ts # Container-capped adaptive grid calculation
│   │   ├── useRoomAvailability.ts # Realtime availability subscription
│   │   └── useRooms.ts            # TanStack Query hook with caching
│   ├── i18n/
│   │   └── translations.ts        # English & Vietnamese language dictionaries
│   ├── navigation/
│   │   ├── MainTabs.tsx           # Bottom navigation tabs (Rooms, My Bookings, Profile)
│   │   ├── RootNavigator.tsx      # Native Stack navigator (Auth + Main + Modals)
│   │   └── types.ts               # Type-safe React Navigation routes
│   ├── screens/
│   │   ├── LoginScreen.tsx        # Minimalist, email-first authentication
│   │   ├── RegisterScreen.tsx     # Student registration form
│   │   ├── MyBookingsScreen.tsx   # Filtered booking management
│   │   ├── ProfileScreen.tsx      # Quota meters & demo reset controls
│   │   ├── RoomDetailScreen.tsx   # Room schedule & booking orchestrator
│   │   └── RoomListScreen.tsx     # 60 FPS room discovery screen
│   ├── services/                  # Business logic & data access
│   │   ├── authService.ts         # Active authentication router
│   │   ├── bookingService.ts      # Active booking service router
│   │   ├── notificationService.ts # Local push notification manager
│   │   ├── outboxService.ts       # Offline outbox queue manager
│   │   ├── realtimeService.ts     # Realtime broadcast router
│   │   ├── roomService.ts         # Room list service router
│   │   ├── syncService.ts         # Sequential outbox flusher
│   │   ├── types.ts               # Service interfaces
│   │   ├── mock/                  # Standalone mock implementation
│   │   └── supabase/              # Production Supabase PostgreSQL client & auth
│   ├── store/
│   │   ├── useAuthStore.ts        # Session & authentication store
│   │   ├── useBookingStore.ts     # Primary application store (Zustand)
│   │   ├── useLanguageStore.ts    # User language preference store
│   │   └── useNetworkStore.ts     # Network & sync state store
│   ├── types/                     # TypeScript domain models
│   │   ├── auth.ts                # User, Session & Auth parameters
│   │   ├── booking.ts             # Booking, Hold & Status types
│   │   ├── navigation.ts          # Type-safe React Navigation routes
│   │   ├── quota.ts               # VKU quota definitions & limits
│   │   ├── room.ts                # Room & Filter interfaces
│   │   ├── slot.ts                # 4 discrete daily slot definitions
│   │   └── sync.ts                # Outbox item definitions
│   └── utils/
│       ├── availability.ts        # Deterministic slot priority resolver
│       ├── date.ts                # Date formatting & 15m trigger calculation
│       ├── errors.ts              # Error mapper (Postgres 23505 -> SLOT_ALREADY_BOOKED)
│       └── idempotency.ts         # UUID v4 idempotency token generator
├── supabase/
│   ├── schema.sql                 # DDL, advisory lock stored procedure, RLS
│   └── seed.sql                   # 20 university study rooms across 4 buildings
└── test/                          # Automated verification test suites
    ├── auth-service.test.ts       # Auth integration, sessions & demo accounts
    ├── concurrency-test.ts        # Advisory lock, 23505, Quota & Hold tests
    ├── notifications-qr.test.ts   # 15m notification triggers & QR security
    ├── offline-outbox-conflict.test.ts # Outbox sequential sync & conflict tests
    └── setup.ts                   # Test environment bootstrap
```
