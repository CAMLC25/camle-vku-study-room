# VKU Real-time Study Room Booking App
### Cross-Platform Mobile Application Development (Mini-Project 2)
**Vietnam - Korea University of Information and Communication Technology (VKU)**

[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict_v6-blue.svg)](https://www.typescriptlang.org/)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK_57-black.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.86-61dafb.svg)](https://reactnative.dev/)
[![Database](https://img.shields.io/badge/PostgreSQL-15+_Supabase-3ecf8e.svg)](https://supabase.com/)
[![State Management](https://img.shields.io/badge/Zustand-5.0_Persist-orange.svg)](https://zustand-demo.pmnd.rs/)
[![Tests](https://img.shields.io/badge/Tests-100%25_Passing-brightgreen.svg)]()

---

## 1. Project Overview

The **VKU Real-time Study Room Booking App** is an academic cross-platform mobile application designed for students of Vietnam - Korea University of Information and Communication Technology (VKU) to discover, reserve, manage, and check in to campus study rooms and computer labs.

Built with a **Dual-Mode Modular Architecture**, the application can run either connected to a production **Supabase PostgreSQL 15+** database with realtime broadcast channels, or completely standalone in **Mock Mode** with simulated in-memory concurrency, soft holds, and zero credential dependencies.

### Key Highlights
- **20 Campus Study Rooms & Labs**: Distributed across Buildings A (Academic), B (Technology), C (Library), and V (VKU Friendship Tower).
- **7-Day Rolling Horizon**: 4 discrete 2-hour daily sessions (07:30–09:30, 09:30–11:30, 13:00–15:00, 15:00–17:00).
- **Server-Authoritative Concurrency**: Serialization via PostgreSQL transaction-level advisory locks + partial unique index `idx_bookings_active_slot`.
- **Idempotent Mutations**: Client-generated UUID tokens prevent duplicate slot reservations during network retries.
- **90-Second Soft Holds**: Holds reserved slots temporarily during checkout, automatically freeing them if abandoned.
- **Strict Academic Quotas**: Max 2 slots/day, 6 slots/week, and 3 simultaneous future bookings.
- **Offline Outbox Engine**: Sequential mutation flusher preserving causality; offline bookings are never falsely confirmed locally.
- **15-Minute Local Reminders**: Scheduled notifications via `expo-notifications` for confirmed bookings.
- **QR Booking Pass**: Secure check-in pass powered by `react-native-qrcode-svg` strictly embedding the booking UUID.
- **60 FPS FlatList Performance**: `React.memo`, `getItemLayout`, tuned windowing parameters, and `expo-image` disk caching.

---

## 2. In-Depth Technical Documentation

Comprehensive academic design specifications are organized in the [`docs/`](docs/) directory:

1. [**System Architecture (`docs/architecture.md`)**](docs/architecture.md): Layered component boundaries, Zustand state graph, service abstraction, and complete project file tree.
2. [**Concurrency Strategy (`docs/concurrency.md`)**](docs/concurrency.md): Race condition analysis (TOCTOU), 4-layer defense, PostgreSQL advisory locking, and error code 23505 handling.
3. [**Offline Outbox Engine (`docs/offline-outbox.md`)**](docs/offline-outbox.md): State machine, sequential execution protocol, network reconciliation, and deterministic conflict resolution.
4. [**Performance & Rendering (`docs/performance.md`)**](docs/performance.md): 60 FPS FlatList optimization benchmarks, virtualization tuning, and memory management.

---

## 3. Quick Start & Execution

### Running in Mock Mode (Default — Zero Configuration Required)
The app defaults to `APP_DATA_MODE=mock`. Evaluators can run the project immediately:

```bash
# 1. Install dependencies
npm install

# 2. Run the automated test suites
npm test

# 3. Start the Expo development server
npx expo start
```
*Press `w` in the terminal to launch the web preview, or scan the QR code using the Expo Go mobile app.*

### Running with Supabase Backend (Production Mode)
1. In your Supabase SQL Editor, execute [`supabase/schema.sql`](supabase/schema.sql), followed by [`supabase/seed.sql`](supabase/seed.sql).
2. Create `.env` in the root directory:
   ```env
   EXPO_PUBLIC_APP_DATA_MODE=supabase
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Start Expo with cleared cache: `npx expo start -c`

---

## 4. Automated Test Suites (`npm test`)

The project includes an end-to-end automated verification harness running under Node.js (`tsx`):

```bash
npm test
```

### Breakdown of Test Suites:
- **`npm run test:concurrency` ([`test/concurrency-test.ts`](test/concurrency-test.ts))**:
  - Simulates 2 simultaneous booking attempts for the same room & slot; verifies exactly 1 succeeds and 1 receives `SLOT_ALREADY_BOOKED`.
  - Verifies idempotency replay returns original booking without duplicates.
  - Verifies daily quota rejection on the 3rd slot attempt with `DAILY_QUOTA_EXCEEDED`.
  - Verifies 90-second soft hold status transitions (`AVAILABLE` $\rightarrow$ `HELD_BY_OTHER` $\rightarrow$ `AVAILABLE`).
- **`npm run test:outbox` ([`test/offline-outbox-conflict.test.ts`](test/offline-outbox-conflict.test.ts))**:
  - Verifies offline booking enters outbox strictly as `PENDING_SYNC` (no false local confirmation).
  - Simulates a peer booking the slot online while the student is offline.
  - Reconnects and verifies sequential flush marks the item as `CONFLICTED` with human explanation.
- **`npm run test:notifications` ([`test/notifications-qr.test.ts`](test/notifications-qr.test.ts))**:
  - Verifies exact 15-minute trigger calculation across all 4 discrete daily sessions.
  - Verifies past date triggers return `null` to avoid stale alert spam.
  - Verifies unconfirmed bookings (`PENDING_SYNC`) are rejected from scheduling reminders.
  - Verifies QR pass payload strictly embeds only the booking UUID without sensitive student data.

---

## 5. Step-by-Step Grading Scenarios for Evaluators

### Scenario 1: Discovery & Filtering (60 FPS Performance)
1. Open the **Rooms** tab.
2. Type `"lab"` in the search bar — the list filters instantly without lag.
3. Tap building chip **"B"** — only computer labs in Building B appear.
4. Scroll rapidly up and down — FlatList maintains a rock-solid 60 FPS without blank frames due to `ROOM_CARD_HEIGHT = 136px` and `getItemLayout`.

### Scenario 2: 7-Day Matrix & 90-Second Soft Hold
1. Tap any room (e.g., **A101 - Smart Seminar**).
2. Tap through the 7-day rolling horizon date bar.
3. Select an **Available (Green)** slot (e.g., Slot 1: 09:30 – 11:30).
4. The **Confirm Booking Modal** opens and initiates a live **90-second countdown**.
5. During this countdown, the slot is locked (`HELD_BY_OTHER`) for all other students.
6. Tap **"Confirm Reservation"** — the slot turns **Mine (Blue)** and moves into your bookings.

### Scenario 3: Quota Limits Enforcement
1. Book 2 slots on the same day for your student account.
2. In the **Profile** tab, observe the **Daily Quota** meter fill to `2 / 2 (100%)` and turn Red.
3. Attempt to book a 3rd slot on the same day.
4. The system immediately rejects the booking with an alert: `"Daily Quota Exceeded (Max 2 slots per day)"`.

### Scenario 4: Offline Booking & Outbox Synchronization
1. On the Room Detail screen, toggle **"Simulate Offline"** (top right of grading panel).
2. The persistent **Network Banner** appears: *"Offline Mode — Showing cached data"*.
3. Select an available slot and confirm booking.
4. Notice the booking is saved with an amber badge **"Sync Pending"** (`PENDING_SYNC`). The QR Pass button is disabled.
5. In the **Profile** tab, see `Outbox: 1 pending`.
6. Toggle **"Simulate Offline"** OFF (reconnecting to internet).
7. The sequential flusher triggers automatically: the booking transitions to **"Confirmed"**, 15-minute reminder is scheduled, and the QR Pass unlocks!

### Scenario 5: Offline Race Conflict Resolution
1. Toggle **"Simulate Offline"** ON.
2. Book Slot 2 in room V201.
3. Tap **"Simulate Peer Taking Slot"** in the grading test panel (simulates another student booking that slot on the server while you were offline).
4. Toggle **"Simulate Offline"** OFF.
5. The app reconciles sequentially, detects the conflict, marks the booking as **`CONFLICTED`** with message *"This slot was just taken by another student"*, and fires an immediate local conflict alert!

### Scenario 6: QR Booking Pass & Reset Demo State
1. Open the **My Bookings** tab and tap **"View QR Pass"** on any confirmed reservation.
2. High-contrast QR code displays with room name, session time, and student ID.
3. Open the **Profile** tab and tap **"Reset Demo State & Clear Cache"** to reset all storage and start a fresh test run.

---

## 6. Technology Stack & Dependencies

| Category | Package / Tool | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime** | `expo` | `~57.0.24` | Universal React Native platform |
| **Framework** | `react-native` | `0.86.3` | Mobile rendering engine |
| **UI Library** | `react` | `19.2.3` | Modern declarative component model |
| **Language** | `typescript` | `~6.0.3` | Strict type safety across the full stack |
| **Navigation** | `@react-navigation/*` | `^7.x` | Native Stack and Bottom Tabs navigation |
| **State** | `zustand` | `^5.0.15` | Atomic state store with `persist` middleware |
| **Storage** | `@react-native-async-storage/*` | `2.2.0` | Persistent local disk storage with memory fallback |
| **Media** | `expo-image` | `~57.0.5` | High-performance hardware-accelerated image caching |
| **Notifications** | `expo-notifications` | `~57.0.20` | Native push & local 15-minute schedule alerts |
| **Barcodes** | `react-native-qrcode-svg` | `^6.3.24` | Vector QR code rendering for student passes |
| **Network** | `@react-native-community/netinfo` | `12.0.1` | Real-time network state monitoring |
| **Backend** | `@supabase/supabase-js` | `^2.116.0` | PostgreSQL client and Realtime engine |

---

## 7. License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.
Designed and developed for the Cross-Platform Mobile Application Development Mini-Project at VKU.
