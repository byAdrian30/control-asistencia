-- ==============================================================
-- SCHEMA CONTROL DE ASISTENCIA - TIENDA (COCINA Y SALÓN)
-- ==============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE EMPLEADOS
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT DEFAULT '', -- PIN de 4 dígitos (se graba en el primer ingreso)
    has_custom_pin BOOLEAN DEFAULT FALSE,
    role TEXT DEFAULT 'Colaborador',
    area TEXT NOT NULL DEFAULT 'Salón', -- 'Cocina' o 'Salón'
    avatar_color TEXT DEFAULT '#3b82f6',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE MALLA HORARIA
-- day_of_week: 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clock_out TIMESTAMPTZ,
    auto_closed BOOLEAN DEFAULT FALSE,
    minutes_late INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON attendance(clock_in);

-- 4. POLÍTICAS RLS (Acceso directo para celular de tienda)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica empleados" ON employees FOR SELECT USING (true);
CREATE POLICY "Actualizar PIN empleado" ON employees FOR UPDATE USING (true);
CREATE POLICY "Lectura publica horarios" ON schedules FOR SELECT USING (true);
CREATE POLICY "Lectura publica asistencias" ON attendance FOR SELECT USING (true);
CREATE POLICY "Insertar marcacion" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizar marcacion salida" ON attendance FOR UPDATE USING (true);

-- 5. CARGA DE LOS 19 COLABORADORES REALES
INSERT INTO employees (id, name, code, has_custom_pin, role, area, avatar_color) VALUES
-- Cocina
('emp-cocina-1', 'Alexander Genaro Campos Huanani', '', FALSE, 'Jefe de Cocina', 'Cocina', '#ef4444'),
('emp-cocina-2', 'Doris Yanela Rojas Chilcon', '', FALSE, '2do Jefe de Cocina', 'Cocina', '#f97316'),
('emp-cocina-3', 'Brad Hans Perez Diaz', '', FALSE, 'Salteado', 'Cocina', '#eab308'),
('emp-cocina-4', 'Mayleb Vanne Castro Estrada', '', FALSE, 'Makis', 'Cocina', '#10b981'),
('emp-cocina-5', 'Michel Anderson Carhuanco Martinez', '', FALSE, 'Frituras (Part Time)', 'Cocina', '#06b6d4'),
('emp-cocina-6', 'Nayeli Chavez Alvarez', '', FALSE, 'Frituras', 'Cocina', '#6366f1'),
('emp-cocina-7', 'Renzo Fabio Bustamante Mora', '', FALSE, 'Makis, Ramen, Frituras, Salteado', 'Cocina', '#8b5cf6'),
('emp-cocina-8', 'Rosa Naomi Tarrillo Vilchez', '', FALSE, 'Ramen (Lic. Maternidad)', 'Cocina', '#ec4899'),
('emp-cocina-9', 'Rossy Lisseth Ramos Milian', '', FALSE, 'Ramen, Frituras', 'Cocina', '#f43f5e'),
-- Salón
('emp-salon-1', 'Adrian Smith Barranzuela Cordova', '', FALSE, 'Líder de Tienda', 'Salón', '#3b82f6'),
('emp-salon-2', 'Angela Cintia Baldera Cienjuegos', '', FALSE, 'Jefe de Salón', 'Salón', '#8b5cf6'),
('emp-salon-3', 'Marjorie Fiorella Gallardo Chévez', '', FALSE, 'Cajero/a', 'Salón', '#10b981'),
('emp-salon-4', 'Alessandro Del Piero Maco Raymundo', '', FALSE, 'Juguetería, Atención', 'Salón', '#06b6d4'),
('emp-salon-5', 'Axl Ali Llontop Cieza', '', FALSE, 'Juguetería, Caja, Atención', 'Salón', '#f59e0b'),
('emp-salon-6', 'Leandro Emmanuel Heredia Carbonel', '', FALSE, 'Juguetería, Atención', 'Salón', '#14b8a6'),
('emp-salon-7', 'Manuel Renato Torres Mendoza', '', FALSE, 'Juguetería, Atención', 'Salón', '#6366f1'),
('emp-salon-8', 'Raquel Abigail Perez Ramirez', '', FALSE, 'Nuevo - Atención', 'Salón', '#e11d48'),
('emp-salon-9', 'Tatiana Escobar', '', FALSE, 'Nuevo PT - Atención', 'Salón', '#d97706'),
('emp-salon-10', 'Yurikho Ruiz Huaman', '', FALSE, 'Atención', 'Salón', '#0284c7')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    area = EXCLUDED.area,
    avatar_color = EXCLUDED.avatar_color;
