-- ============================================================
-- VKU Real-time Study Room Booking App - Seed Data
-- ============================================================

-- 1. Time Slots
INSERT INTO time_slots (slot_index, start_time, end_time, label)
VALUES 
    (0, '07:30:00', '09:30:00', '07:30–09:30'),
    (1, '09:30:00', '11:30:00', '09:30–11:30'),
    (2, '13:00:00', '15:00:00', '13:00–15:00'),
    (3, '15:00:00', '17:00:00', '15:00–17:00')
ON CONFLICT (slot_index) DO UPDATE
SET start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    label = EXCLUDED.label;

-- 2. Equipment Types
INSERT INTO equipment (name)
VALUES 
    ('Projector'),
    ('Whiteboard'),
    ('High-spec PC'),
    ('AC')
ON CONFLICT (name) DO NOTHING;

-- 3. Default Students
INSERT INTO students (id, student_id_code, full_name, email)
VALUES
    ('00000000-0000-0000-0000-000000000001', '21IT001', 'Nguyen Van A', 'anv.21it@vku.udn.vn'),
    ('00000000-0000-0000-0000-000000000002', '21IT002', 'Tran Thi B', 'btt.21it@vku.udn.vn'),
    ('00000000-0000-0000-0000-000000000003', '21IT003', 'Le Van C', 'clv.21it@vku.udn.vn')
ON CONFLICT (student_id_code) DO NOTHING;

-- 4. 20 Study Rooms & Labs Across Buildings A, B, C, V
-- Building A: Academic Block
INSERT INTO rooms (id, name, photo_url, building, floor, capacity, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000101', 'A101 - Smart Seminar', 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800&q=80', 'A', 1, 16, true),
    ('a0000000-0000-0000-0000-000000000102', 'A102 - Group Pod Alpha', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80', 'A', 1, 6, true),
    ('a0000000-0000-0000-0000-000000000201', 'A201 - Innovation Lab', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', 'A', 2, 20, true),
    ('a0000000-0000-0000-0000-000000000202', 'A202 - Focus Study Room', 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&q=80', 'A', 2, 4, true),
    ('a0000000-0000-0000-0000-000000000301', 'A301 - Executive Meeting Room', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80', 'A', 3, 12, true),

-- Building B: Technology & Engineering Block
    ('b0000000-0000-0000-0000-000000000101', 'B101 - AI & Cloud Lab', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80', 'B', 1, 18, true),
    ('b0000000-0000-0000-0000-000000000102', 'B102 - Software Workshop', 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&q=80', 'B', 1, 10, true),
    ('b0000000-0000-0000-0000-000000000201', 'B201 - CyberSec Collaboration', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80', 'B', 2, 8, true),
    ('b0000000-0000-0000-0000-000000000202', 'B202 - Pair Programming Pod', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80', 'B', 2, 2, true),
    ('b0000000-0000-0000-0000-000000000301', 'B301 - Data Science Think Tank', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80', 'B', 3, 14, true),

-- Building C: Library & Quiet Study Complex
    ('c0000000-0000-0000-0000-000000000101', 'C101 - Quiet Research Pod', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80', 'C', 1, 4, true),
    ('c0000000-0000-0000-0000-000000000102', 'C102 - Thesis Collaboration', 'https://images.unsplash.com/photo-1497493292307-31c376b6e479?w=800&q=80', 'C', 1, 8, true),
    ('c0000000-0000-0000-0000-000000000201', 'C201 - Literature & Review', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80', 'C', 2, 6, true),
    ('c0000000-0000-0000-0000-000000000202', 'C202 - Academic Hub', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80', 'C', 2, 12, true),
    ('c0000000-0000-0000-0000-000000000301', 'C301 - Honors Seminar Hall', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80', 'C', 3, 20, true),

-- Building V: VKU Friendship Tower
    ('d0000000-0000-0000-0000-000000000101', 'V101 - Global Startup Studio', 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80', 'V', 1, 16, true),
    ('d0000000-0000-0000-0000-000000000102', 'V102 - Agile Sprint Room', 'https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?w=800&q=80', 'V', 1, 8, true),
    ('d0000000-0000-0000-0000-000000000201', 'V201 - Cross-Platform Lab', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80', 'V', 2, 15, true),
    ('d0000000-0000-0000-0000-000000000202', 'V202 - Design Sprint Pod', 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&q=80', 'V', 2, 4, true),
    ('d0000000-0000-0000-0000-000000000301', 'V301 - VR / Multimedia Studio', 'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=800&q=80', 'V', 3, 12, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Link Room Equipment
INSERT INTO room_equipment (room_id, equipment_id)
SELECT r.id, e.id
FROM rooms r
CROSS JOIN equipment e
WHERE 
    -- Every room has AC
    e.name = 'AC'
    -- Seminar / Large rooms get Projector
    OR (e.name = 'Projector' AND r.capacity >= 8)
    -- Collaboration rooms get Whiteboard
    OR (e.name = 'Whiteboard' AND r.name NOT LIKE '%Pod%')
    -- Computer & AI Labs get High-spec PC
    OR (e.name = 'High-spec PC' AND (r.name LIKE '%Lab%' OR r.name LIKE '%Studio%' OR r.name LIKE '%Programming%'))
ON CONFLICT DO NOTHING;
