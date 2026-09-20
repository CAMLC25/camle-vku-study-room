-- ============================================================
-- VKU Real-time Study Room Booking App
-- PostgreSQL Database Schema & Functions (Supabase)
-- ============================================================

-- Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_code VARCHAR(20) UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    photo_url TEXT NOT NULL,
    building VARCHAR(1) NOT NULL CHECK (building IN ('A', 'B', 'C', 'V')),
    floor INT NOT NULL CHECK (floor >= 1),
    capacity INT NOT NULL CHECK (capacity BETWEEN 2 AND 20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL
);

-- 4. Room-Equipment Relationship Table
CREATE TABLE IF NOT EXISTS room_equipment (
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    PRIMARY KEY (room_id, equipment_id)
);

-- 5. Time Slots Table (07:30 to 17:00, 4 discrete 2-hour slots)
CREATE TABLE IF NOT EXISTS time_slots (
    slot_index INT PRIMARY KEY CHECK (slot_index BETWEEN 0 AND 3),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    label VARCHAR(20) NOT NULL
);

-- 6. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    slot_index INT NOT NULL REFERENCES time_slots(slot_index),
    idempotency_key UUID UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'conflicted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes on Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_student_date ON bookings (student_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_lookup ON bookings (room_id, booking_date, slot_index);

-- 7. PARTIAL UNIQUE INDEX - Guaranteeing at most one active booking per room/date/slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_slot
ON bookings (room_id, booking_date, slot_index)
WHERE status = 'active';

-- 8. Booking Holds Table (90-second soft hold for checkout modal)
CREATE TABLE IF NOT EXISTS booking_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    slot_index INT NOT NULL REFERENCES time_slots(slot_index),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted'))
);

CREATE INDEX IF NOT EXISTS idx_booking_holds_expiry ON booking_holds (expires_at);
CREATE INDEX IF NOT EXISTS idx_booking_holds_lookup ON booking_holds (room_id, booking_date, slot_index);

-- ============================================================
-- STORED PROCEDURES & BUSINESS LOGIC
-- ============================================================

-- A. Helper: Calculate Student Quota Usage
CREATE OR REPLACE FUNCTION get_student_quota(
    p_student_id UUID,
    p_booking_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_daily_count INT;
    v_weekly_count INT;
    v_active_future_count INT;
    v_max_daily INT := 2;
    v_max_weekly INT := 6;
    v_max_future INT := 3;
BEGIN
    -- 1. Daily usage on requested date
    SELECT COUNT(*) INTO v_daily_count
    FROM bookings
    WHERE student_id = p_student_id
      AND booking_date = p_booking_date
      AND status = 'active';

    -- 2. Weekly usage (rolling 7 days around date)
    SELECT COUNT(*) INTO v_weekly_count
    FROM bookings
    WHERE student_id = p_student_id
      AND booking_date BETWEEN (p_booking_date - INTERVAL '3 days')::DATE AND (p_booking_date + INTERVAL '3 days')::DATE
      AND status = 'active';

    -- 3. Active future bookings (date >= today)
    SELECT COUNT(*) INTO v_active_future_count
    FROM bookings
    WHERE student_id = p_student_id
      AND booking_date >= CURRENT_DATE
      AND status = 'active';

    RETURN jsonb_build_object(
        'student_id', p_student_id,
        'daily_usage', v_daily_count,
        'weekly_usage', v_weekly_count,
        'active_future_count', v_active_future_count,
        'daily_remaining', GREATEST(0, v_max_daily - v_daily_count),
        'weekly_remaining', GREATEST(0, v_max_weekly - v_weekly_count),
        'active_future_remaining', GREATEST(0, v_max_future - v_active_future_count)
    );
END;
$$;

-- B. Create or Refresh Soft Hold (90-second TTL)
CREATE OR REPLACE FUNCTION create_slot_hold(
    p_room_id UUID,
    p_booking_date DATE,
    p_slot_index INT,
    p_student_id UUID,
    p_duration_seconds INT DEFAULT 90
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lock_key BIGINT;
    v_now TIMESTAMPTZ := NOW();
    v_existing_booking UUID;
    v_existing_hold_id UUID;
    v_other_hold_id UUID;
    v_new_hold_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Deterministic advisory lock key for resource
    v_lock_key := ('x' || substr(md5(p_room_id::text || ':' || p_booking_date::text || ':' || p_slot_index::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 1. Check if already confirmed active booking
    SELECT id INTO v_existing_booking
    FROM bookings
    WHERE room_id = p_room_id
      AND booking_date = p_booking_date
      AND slot_index = p_slot_index
      AND status = 'active'
    LIMIT 1;

    IF v_existing_booking IS NOT NULL THEN
        RAISE EXCEPTION 'SLOT_ALREADY_BOOKED';
    END IF;

    -- 2. Check if held by another student and unexpired
    SELECT id INTO v_other_hold_id
    FROM booking_holds
    WHERE room_id = p_room_id
      AND booking_date = p_booking_date
      AND slot_index = p_slot_index
      AND status = 'active'
      AND student_id <> p_student_id
      AND expires_at > v_now
    LIMIT 1;

    IF v_other_hold_id IS NOT NULL THEN
        RAISE EXCEPTION 'SLOT_HELD_BY_OTHER';
    END IF;

    -- 3. Mark any past expired holds for this slot as expired
    UPDATE booking_holds
    SET status = 'expired'
    WHERE room_id = p_room_id
      AND booking_date = p_booking_date
      AND slot_index = p_slot_index
      AND status = 'active'
      AND expires_at <= v_now;

    v_expires_at := v_now + (p_duration_seconds || ' seconds')::INTERVAL;

    -- 4. Check if current student already holds it: refresh hold
    SELECT id INTO v_existing_hold_id
    FROM booking_holds
    WHERE room_id = p_room_id
      AND booking_date = p_booking_date
      AND slot_index = p_slot_index
      AND student_id = p_student_id
      AND status = 'active'
    LIMIT 1;

    IF v_existing_hold_id IS NOT NULL THEN
        UPDATE booking_holds
        SET expires_at = v_expires_at
        WHERE id = v_existing_hold_id;

        RETURN jsonb_build_object(
            'id', v_existing_hold_id,
            'room_id', p_room_id,
            'booking_date', p_booking_date,
            'slot_index', p_slot_index,
            'student_id', p_student_id,
            'created_at', v_now,
            'expires_at', v_expires_at,
            'status', 'active'
        );
    END IF;

    -- 5. Insert new hold
    INSERT INTO booking_holds (
        room_id,
        booking_date,
        slot_index,
        student_id,
        created_at,
        expires_at,
        status
    )
    VALUES (
        p_room_id,
        p_booking_date,
        p_slot_index,
        p_student_id,
        v_now,
        v_expires_at,
        'active'
    )
    RETURNING id INTO v_new_hold_id;

    RETURN jsonb_build_object(
        'id', v_new_hold_id,
        'room_id', p_room_id,
        'booking_date', p_booking_date,
        'slot_index', p_slot_index,
        'student_id', p_student_id,
        'created_at', v_now,
        'expires_at', v_expires_at,
        'status', 'active'
    );
END;
$$;

-- C. SINGLE CENTRAL BOOKING FUNCTION: book_slot()
-- Executes atomic advisory locking, horizon check, idempotency check, quota checks, hold conversion, and insertion
CREATE OR REPLACE FUNCTION book_slot(
    p_student_id UUID,
    p_room_id UUID,
    p_booking_date DATE,
    p_slot_index INT,
    p_idempotency_key UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lock_key BIGINT;
    v_existing_booking RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_quota_info JSONB;
    v_new_booking RECORD;
    v_room_name TEXT;
    v_building TEXT;
    v_floor INT;
BEGIN
    -- 1. Acquire transaction-level advisory lock specifically for this room/date/slot
    v_lock_key := ('x' || substr(md5(p_room_id::text || ':' || p_booking_date::text || ':' || p_slot_index::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 2. Idempotency Check: if key already exists, return existing booking
    SELECT b.*, r.name AS room_name, r.building, r.floor
    INTO v_existing_booking
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    WHERE b.idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_replay', true,
            'booking', row_to_json(v_existing_booking)
        );
    END IF;

    -- 3. Validate Student exists
    IF NOT EXISTS (SELECT 1 FROM students WHERE id = p_student_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'STUDENT_NOT_FOUND',
            'error_message', 'Student account not found.'
        );
    END IF;

    -- 4. Validate Booking Horizon (0 to +6 days from current date)
    IF p_booking_date < CURRENT_DATE OR p_booking_date > (CURRENT_DATE + INTERVAL '6 days')::DATE THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'OUTSIDE_BOOKING_HORIZON',
            'error_message', 'Booking date must be within the allowed 7-day rolling window.'
        );
    END IF;

    -- 5. Validate Slot Index
    IF p_slot_index < 0 OR p_slot_index > 3 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_SLOT_INDEX',
            'error_message', 'Time slot index must be 0, 1, 2, or 3.'
        );
    END IF;

    -- 6. Enforce Server-Side Quotas
    v_quota_info := get_student_quota(p_student_id, p_booking_date);

    IF (v_quota_info->>'daily_remaining')::INT <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DAILY_QUOTA_EXCEEDED',
            'error_message', 'You have reached your daily booking limit (maximum 2 slots per day).'
        );
    END IF;

    IF (v_quota_info->>'weekly_remaining')::INT <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'WEEKLY_QUOTA_EXCEEDED',
            'error_message', 'You have reached your weekly booking limit (maximum 6 slots per week).'
        );
    END IF;

    IF (v_quota_info->>'active_future_remaining')::INT <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ACTIVE_BOOKING_LIMIT_EXCEEDED',
            'error_message', 'You have reached the maximum allowed active future bookings (maximum 3 bookings).'
        );
    END IF;

    -- 7. Availability Check: Existing active booking
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE room_id = p_room_id
          AND booking_date = p_booking_date
          AND slot_index = p_slot_index
          AND status = 'active'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'SLOT_ALREADY_BOOKED',
            'error_message', 'This slot was just taken by another student.'
        );
    END IF;

    -- 8. Soft Hold Check: Check if slot is held by another student (ignoring expired holds)
    IF EXISTS (
        SELECT 1 FROM booking_holds
        WHERE room_id = p_room_id
          AND booking_date = p_booking_date
          AND slot_index = p_slot_index
          AND student_id <> p_student_id
          AND status = 'active'
          AND expires_at > v_now
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'SLOT_HELD_BY_OTHER',
            'error_message', 'This slot is currently held by another student.'
        );
    END IF;

    -- 9. Insert Active Booking (with 23505 exception trap)
    BEGIN
        SELECT name, building, floor INTO v_room_name, v_building, v_floor
        FROM rooms WHERE id = p_room_id;

        INSERT INTO bookings (
            room_id,
            student_id,
            booking_date,
            slot_index,
            idempotency_key,
            status,
            created_at,
            updated_at
        )
        VALUES (
            p_room_id,
            p_student_id,
            p_booking_date,
            p_slot_index,
            p_idempotency_key,
            'active',
            v_now,
            v_now
        )
        RETURNING * INTO v_new_booking;

        -- 10. Convert any hold held by this student
        UPDATE booking_holds
        SET status = 'converted'
        WHERE room_id = p_room_id
          AND booking_date = p_booking_date
          AND slot_index = p_slot_index
          AND student_id = p_student_id
          AND status = 'active';

        RETURN jsonb_build_object(
            'success', true,
            'is_replay', false,
            'booking', jsonb_build_object(
                'id', v_new_booking.id,
                'room_id', v_new_booking.room_id,
                'room_name', v_room_name,
                'building', v_building,
                'floor', v_floor,
                'student_id', v_new_booking.student_id,
                'booking_date', v_new_booking.booking_date,
                'slot_index', v_new_booking.slot_index,
                'idempotency_key', v_new_booking.idempotency_key,
                'status', v_new_booking.status,
                'created_at', v_new_booking.created_at,
                'updated_at', v_new_booking.updated_at
            )
        );
    EXCEPTION
        WHEN unique_violation THEN
            -- PostgreSQL error code 23505 mapping
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'SLOT_ALREADY_BOOKED',
                'error_message', 'This slot was just taken by another student.'
            );
    END;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_holds ENABLE ROW LEVEL SECURITY;

-- Read policies (Public / Anon can view catalog and availability)
CREATE POLICY "Public read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Public read equipment" ON equipment FOR SELECT USING (true);
CREATE POLICY "Public read room_equipment" ON room_equipment FOR SELECT USING (true);
CREATE POLICY "Public read time_slots" ON time_slots FOR SELECT USING (true);
CREATE POLICY "Public read bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Public read booking_holds" ON booking_holds FOR SELECT USING (true);
CREATE POLICY "Public read students" ON students FOR SELECT USING (true);

-- Mutations must proceed via RPC functions book_slot / create_slot_hold
-- Direct booking insert policy for authenticated or anon through service
CREATE POLICY "Service booking mutations" ON bookings FOR ALL USING (true);
CREATE POLICY "Service hold mutations" ON booking_holds FOR ALL USING (true);

-- ============================================================
-- REALTIME PUBLICATION SETUP
-- ============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
        ALTER PUBLICATION supabase_realtime ADD TABLE booking_holds;
    END IF;
END;
$$;
