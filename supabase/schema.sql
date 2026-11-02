-- ==============================================================
-- SCHEMA CONTROL DE ASISTENCIA - SHIMAYA RAMEN MALL AVENTURA
-- 16 COLABORADORES OFICIALES (8 Cocina, 8 Salón)
-- ==============================================================

-- 1. TABLA DE EMPLEADOS
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    slug TEXT,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    has_custom_pin BOOLEAN DEFAULT FALSE,
    role TEXT DEFAULT 'Colaborador',
    area TEXT NOT NULL DEFAULT 'Salón', -- 'Cocina' o 'Salón'
    avatar_color TEXT DEFAULT '#3b82f6',
    active BOOLEAN DEFAULT TRUE,
    registered_device_id TEXT,
    registered_device_name TEXT,
    registered_device_at TIMESTAMPTZ,
    biometric_enrolled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE MALLA HORARIA
CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    tolerance_minutes INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE ASISTENCIA
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clock_out TIMESTAMPTZ,
    auto_closed BOOLEAN DEFAULT FALSE,
    minutes_late INT DEFAULT 0,
    notes TEXT,
    clock_in_lat DOUBLE PRECISION,
    clock_in_lng DOUBLE PRECISION,
    clock_in_distance_meters INT,
    clock_out_lat DOUBLE PRECISION,
    clock_out_lng DOUBLE PRECISION,
    device_id TEXT,
    device_name TEXT,
    verified_by_gps BOOLEAN DEFAULT TRUE,
    verified_by_device BOOLEAN DEFAULT TRUE,
    verified_by_biometrics BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON attendance(clock_in);

-- 4. POLÍTICAS RLS (Acceso público seguro para celulares y panel)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo employees" ON employees;
CREATE POLICY "Permitir todo employees" ON employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo schedules" ON schedules;
CREATE POLICY "Permitir todo schedules" ON schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo attendance" ON attendance;
CREATE POLICY "Permitir todo attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);

-- 5. CARGA DE LOS 16 COLABORADORES OFICIALES
INSERT INTO employees (id, slug, name, code, has_custom_pin, role, area, avatar_color, active) VALUES
-- Cocina (8)
('emp-cocina-2', 'doris-rojas', 'Doris Yanela Rojas Chilcon', '1010', TRUE, '2do Jefe de Cocina', 'Cocina', '#f97316', TRUE),
('emp-cocina-3', 'brad-perez', 'Brad Hans Perez Diaz', '1206', TRUE, 'Salteado', 'Cocina', '#eab308', TRUE),
('emp-cocina-4', 'mayleb-castro', 'Mayleb Vanne Castro Estrada', '1111', TRUE, 'Makis', 'Cocina', '#10b981', TRUE),
('emp-cocina-5', 'michel-carhuanco', 'Michel Anderson Carhuanco Martinez', '9214', TRUE, 'Frituras (Part Time)', 'Cocina', '#06b6d4', TRUE),
('emp-cocina-6', 'nayeli-chavez', 'Nayeli Chavez Alvarez', '1717', TRUE, 'Frituras', 'Cocina', '#6366f1', TRUE),
('emp-cocina-7', 'renzo-bustamante', 'Renzo Fabio Bustamante Mora', '1709', TRUE, 'Makis, Ramen, Frituras, Salteado', 'Cocina', '#8b5cf6', TRUE),
('emp-cocina-8', 'rosa-tarrillo', 'Rosa Naomi Tarrillo Vilchez', '1001', TRUE, 'Ramen (Lic. Maternidad)', 'Cocina', '#ec4899', TRUE),
('emp-cocina-9', 'rossy-ramos', 'Rossy Lisseth Ramos Milian', '1002', TRUE, 'Ramen, Frituras', 'Cocina', '#f43f5e', TRUE),
-- Salón (8)
('emp-salon-2', 'angela-baldera', 'Angela Cintia Baldera Cienjuegos', '1209', TRUE, 'Jefe de Salón', 'Salón', '#8b5cf6', TRUE),
('emp-salon-3', 'marjorie-gallardo', 'Marjorie Fiorella Gallardo Chévez', '1234', TRUE, 'Cajero/a', 'Salón', '#10b981', TRUE),
('emp-salon-4', 'alessandro-del-piero', 'Alessandro Del Piero Maco Raymundo', '2007', TRUE, 'Juguetería, Atención', 'Salón', '#06b6d4', TRUE),
('emp-salon-5', 'axl-llontop', 'Axl Ali Llontop Cieza', '0000', TRUE, 'Juguetería, Caja, Atención', 'Salón', '#f59e0b', TRUE),
('emp-salon-6', 'leandro-heredia', 'Leandro Emmanuel Heredia Carbonel', '', FALSE, 'Juguetería, Atención', 'Salón', '#14b8a6', TRUE),
('emp-salon-7', 'manuel-torres', 'Manuel Renato Torres Mendoza', '', FALSE, 'Juguetería, Atención', 'Salón', '#6366f1', TRUE),
('emp-salon-9', 'tatiana-escobar', 'Tatiana Escobar', '', FALSE, 'Nuevo PT - Atención', 'Salón', '#d97706', TRUE),
('emp-salon-10', 'yurikho-ruiz', 'Yurikho Ruiz Huaman', '', FALSE, 'Atención', 'Salón', '#0284c7', TRUE)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    role = EXCLUDED.role,
    area = EXCLUDED.area,
    avatar_color = EXCLUDED.avatar_color,
    active = EXCLUDED.active;
