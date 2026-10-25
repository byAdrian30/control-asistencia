export interface Employee {
  id: string;
  name: string;
  code: string; // PIN de 4 dígitos (vacío si es primera vez)
  has_custom_pin: boolean; // false si aún no ha grabado su contraseña
  role: string;
  area: 'Cocina' | 'Salón';
  avatar_color?: string;
  active: boolean;
  created_at?: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  clock_in: string; // ISO timestamp
  clock_out: string | null; // ISO timestamp
  auto_closed: boolean;
  minutes_late: number;
  notes?: string | null;
  created_at?: string;
  employee?: Employee;
}

export interface Schedule {
  id: string;
  employee_id: string;
  day_of_week: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  start_time: string; // '11:00'
  end_time: string; // '23:00'
  tolerance_minutes: number;
  is_active: boolean;
}

export interface SystemConfig {
  store_name: string;
  admin_pin: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  auto_checkout_hour: number; // 1:00 AM
  timezone_offset: number; // -5 (Perú)
}
