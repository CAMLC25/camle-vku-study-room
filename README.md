# VKU Real-time Study Room Booking App
### Cross-Platform Mobile Application Development (Mini-Project 2)
**Vietnam - Korea University of Information and Communication Technology (VKU)**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Cloudflare_Workers-F38020.svg?logo=cloudflare)](https://camle-vku-study-room.lecam.workers.dev)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict_v6-blue.svg)](https://www.typescriptlang.org/)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK_57-black.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.86-61dafb.svg)](https://reactnative.dev/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.0_Server_State-FF4154.svg)](https://tanstack.com/query)
[![Reanimated](https://img.shields.io/badge/Reanimated-Layout_Animations-8B5CF6.svg)](https://docs.swmansion.com/react-native-reanimated/)
[![State Management](https://img.shields.io/badge/Zustand-5.0_Persist-orange.svg)](https://zustand-demo.pmnd.rs/)
[![Database](https://img.shields.io/badge/PostgreSQL-15+_Supabase-3ecf8e.svg)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Tests-100%25_Passing-brightgreen.svg)]()

---

> 🚀 **Live Production Web Deployment**: [https://camle-vku-study-room.lecam.workers.dev](https://camle-vku-study-room.lecam.workers.dev)  
> 📄 **Official Submission Report (Word Docx)**: [`docs/MINI_PROJECT_2_REPORT.docx`](docs/MINI_PROJECT_2_REPORT.docx)  
> 📝 **Official Submission Report (Markdown)**: [`docs/REPORT.md`](docs/REPORT.md)  

---

## 1. Project Overview

The **VKU Real-time Study Room Booking App** is an academic cross-platform mobile application engineered for students of Vietnam - Korea University of Information and Communication Technology (VKU) to discover, reserve, manage, and check in to campus study rooms and computer labs.

Adhering strictly to the **VKU Cross-Platform Mobile App Development curriculum (Week 5 & Week 6)**, the application combines modern **React Navigation 7** type-safe navigation, dual **Zustand + TanStack Query** state management, **React Native Reanimated 3/4** layout animations, and an enterprise-grade **PostgreSQL Concurrency Engine**.

### Key Architectural Highlights
* **20 Campus Study Rooms & Labs**: Pre-seeded across Buildings A (Academic), B (Technology), C (Library), and V (VKU Friendship Innovation Tower).
* **7-Day Rolling Horizon**: 4 discrete 2-hour daily sessions (07:30–09:30, 09:30–11:30, 13:00–15:00, 15:00–17:00).
* **Server State & Caching via TanStack Query**: Automatic 5-minute background caching (`staleTime`), garbage collection (`gcTime`), and pull-to-refresh FlatList.
* **Client State & Session via Zustand**: Persistent offline store in `@react-native-async-storage/async-storage` (`vku-booking-storage`).
* **90-Second Soft Holds**: Holds reserved slots temporarily during checkout, automatically freeing them if abandoned or cancelled without blocking the UI.
* **Server-Authoritative Concurrency**: Serialization via PostgreSQL transaction-level advisory locks + partial unique index `idx_bookings_active_slot`.
* **Offline Outbox Engine**: Sequential mutation flusher preserving causality; offline bookings are queued as `PENDING_SYNC` and never falsely confirmed locally.
* **15-Minute Local Reminders**: Scheduled notifications via `expo-notifications` for confirmed bookings.
* **QR Booking Pass**: Secure check-in pass powered by `react-native-qrcode-svg` strictly embedding the booking UUID.
* **60 FPS FlatList Performance**: Staggered spring animations via `FadeInDown.springify()`, `React.memo`, `getItemLayout`, and `expo-image` disk caching.

---

## 2. Feature Implementation Checklist (Grading Rubric Alignment)

| # | Feature Area | Weight | Status | Implementation Details |
|:---:|---|:---:|:---:|---|
| 1 | **UI/UX & Animations** | 25% | ✅ Complete | Polished design system, adaptive columns via `useResponsiveLayout`, and staggered card entrance animations using `FadeInDown.delay(index * 60).springify()`. |
| 2 | **Core Features** | 30% | ✅ Complete | Instant search, multi-parameter filter chips (Building, Capacity, Equipment), 7-day slot selector, 90s countdown modal, and QR check-in pass. |
| 3 | **Navigation Architecture** | 15% | ✅ Complete | Root Stack nesting Main Bottom Tabs (`BrowseRooms`, `MyBookings`, `Profile`). Full TypeScript type safety via `RootStackParamList` and `MainTabParamList`. |
| 4 | **State Management** | 15% | ✅ Complete | **Zustand + TanStack Query**: Client state in `useBookingStore` with `AsyncStorage` persistence; Server state cached via `QueryClientProvider` and `useRooms()`. |
| 5 | **Code Quality & Testing** | 15% | ✅ Complete | Strict TypeScript (0 errors on `npx tsc --noEmit`), modular custom hooks, and 4 automated test suites passing 100% (`npm test`). |

---

## 3. Tech Stack & Dependencies

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Expo SDK 57 (Managed) + React Native 0.86 | Modern cross-platform runtime |
| **Language** | TypeScript (Strict Mode) | Complete compile-time type verification |
| **Navigation** | React Navigation 7 (Stack + Tabs) | Native-stack and bottom tabs routing |
| **Server State** | TanStack Query 5 (`@tanstack/react-query`) | API caching, stale-while-revalidate & refetch |
| **Client State** | Zustand 5 + `persist` middleware | Volatile UI state, active holds & session |
| **Authentication** | Supabase Auth + Google OAuth 2.0 | Real email registration, JWT session, Google SSO |
| **Local Storage** | `@react-native-async-storage/async-storage` | Offline state persistence (`vku-booking-storage`) |
| **Animations** | React Native Reanimated (`react-native-reanimated`) | 60/120 FPS UI-thread layout & spring animations |
| **Backend / DB** | Supabase (PostgreSQL 15+) | RLS, Advisory Locking & Realtime channels |
| **Hosting** | Cloudflare Workers Static Assets | Production edge deployment |

---

## 4. Quick Start & Execution

### Running in Standalone Mock Mode (Default)
The app defaults to `APP_DATA_MODE=mock`, allowing evaluators to run immediately without configuring credentials:

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suites
npm test

# 3. Start Expo development server
npx expo start
```
* Press `w` to open the web version in your browser.
* Scan the terminal QR code with the **Expo Go** mobile app on Android or iOS.

### Running with Supabase Backend (Production Mode)
1. In your Supabase SQL Editor, execute [`supabase/schema.sql`](supabase/schema.sql), followed by [`supabase/seed.sql`](supabase/seed.sql).
2. Configure `.env` in the root directory:
   ```env
   EXPO_PUBLIC_APP_DATA_MODE=supabase
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Start Expo with cache cleared: `npx expo start -c`

---

## 5. Automated Verification Harness (`npm test`)

The test suite runs under Node.js (`tsx`) and exercises every concurrency and integrity invariant:

```bash
npm test
```

### Test Coverage Highlights:
1. `npm run test:concurrency`: Simulates simultaneous slot booking race conditions, idempotency key replay attacks, daily quota enforcement (max 2 slots/day), and soft hold release.
2. `npm run test:outbox`: Simulates offline reservation queuing, sequential background synchronization, and conflict marking.
3. `npm run test:notifications`: Validates 15-minute reminder calculation triggers and QR booking pass token purity.
4. `npm run test:auth`: Validates authentication sessions, demo student switching, and credential validation.

---

## 6. Detailed Technical Documentation

Further in-depth technical documentation can be found in the [`docs/`](docs/) directory:
* [**Mini-Project Technical Report (PDF Template)**](docs/REPORT.md)
* [**System Architecture (`docs/architecture.md`)**](docs/architecture.md)
* [**Concurrency Strategy (`docs/concurrency.md`)**](docs/concurrency.md)
* [**Offline Outbox Engine (`docs/offline-outbox.md`)**](docs/offline-outbox.md)
* [**Performance Benchmarks (`docs/performance.md`)**](docs/performance.md)
