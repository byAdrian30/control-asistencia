-- ==============================================================
-- SCHEMA CONTROL DE ASISTENCIA - TIENDA
-- Compatible con Supabase PostgreSQL
-- ==============================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE EMPLEADOS
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- PIN de 4 dígitos (ej: '1024')
    role TEXT DEFAULT 'Personal de Tienda',
    avatar_color TEXT DEFAULT '#3b82f6',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE MALLA HORARIA (HORARIOS POR EMPLEADO)
-- day_of_week: 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL, -- ej: '09:00:00'
    end_time TIME NOT NULL,   -- ej: '18:00:00'
    tolerance_minutes INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE MARCACIONES DE ASISTENCIA
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clock_out TIMESTAMPTZ,
    auto_closed BOOLEAN DEFAULT FALSE,
    minutes_late INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON attendance(clock_in);
CREATE INDEX IF NOT EXISTS idx_attendance_open ON attendance(employee_id) WHERE clock_out IS NULL;

-- 5. TABLA DE CONFIGURACIONES DEL SISTEMA
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. POLÍTICAS DE ACCESO (Row Level Security - RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para modo Kiosko en tienda (anon key)
CREATE POLICY "Permitir lectura publica de empleados activos"
    ON employees FOR SELECT USING (active = true);

CREATE POLICY "Permitir lectura publica de horarios"
    ON schedules FOR SELECT USING (true);

CREATE POLICY "Permitir lectura publica de asistencias del dia"
    ON attendance FOR SELECT USING (true);

CREATE POLICY "Permitir registrar entrada/salida publica"
    ON attendance FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizar salida publica"
    ON attendance FOR UPDATE USING (true);

CREATE POLICY "Permitir lectura de configuraciones"
    ON system_settings FOR SELECT USING (true);

-- 7. FUNCIÓN PARA AUTO-DESLOGUEAR A LA 1:00 AM
-- Busca turnos no cerrados de jornadas anteriores o abiertas por más de 12 horas
CREATE OR REPLACE FUNCTION auto_close_unclosed_attendances()
RETURNS INT AS $$
DECLARE
    closed_count INT;
BEGIN
    UPDATE attendance
    SET 
        clock_out = clock_in + INTERVAL '8 hours', -- O la hora fijada de cierre
        auto_closed = TRUE,
        notes = COALESCE(notes || ' | ', '') || 'Cierre automático a la 1:00 AM (Sin marcación de salida)'
    WHERE 
        clock_out IS NULL
        AND clock_in < (NOW() - INTERVAL '4 hours');

    GET DIAGNOSTICS closed_count = ROW_COUNT;
    RETURN closed_count;
END;
$$ LANGUAGE plpgsql;

-- 8. DATOS INICIALES DE PRUEBA (OPCIONAL)
INSERT INTO employees (name, code, role, avatar_color)
VALUES 
    ('Carlos Mendoza', '1001', 'Vendedor Tienda', '#10b981'),
    ('Lucía Ramírez', '1002', 'Cajera Principal', '#6366f1'),
    ('Mateo Salazar', '1003', 'Atención al Cliente', '#f59e0b'),
    ('Andrea Vargas', '1004', 'Supervisora de Turno', '#ec4899')
ON CONFLICT (code) DO NOTHING;

-- Configuración por defecto
INSERT INTO system_settings (key, value)
VALUES 
    ('general', '{"store_name": "Tienda Central", "admin_pin": "1234", "telegram_bot_token": "", "telegram_chat_id": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
