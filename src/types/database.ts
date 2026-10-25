export interface Employee {
  id: string;
  name: string;
  code: string; // PIN de 4 dígitos o código de empleado
  role: string;
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
  // Join helper
  employee?: Employee;
}

export interface Schedule {
  id: string;
  employee_id: string;
  day_of_week: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  start_time: string; // '09:00'
  end_time: string; // '18:00'
  tolerance_minutes: number;
  is_active: boolean;
}

export interface SystemConfig {
  store_name: string;
  admin_pin: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  auto_checkout_hour: number; // Por defecto 1 (1:00 AM)
  timezone_offset: number; // UTC-5 por defecto para Perú/Colombia
}

export interface AttendanceSummary {
  employee: Employee;
  todayAttendance: Attendance | null;
  status: 'presente' | 'ausente' | 'jornada_terminada';
  hoursWorkedToday?: string;
}
