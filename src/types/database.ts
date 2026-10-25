export interface Employee {
  id: string;
  slug: string; // e.g. 'alexander-campos' para links amigables
  name: string;
  code: string; // PIN de 4 dígitos
  has_custom_pin: boolean;
  role: string;
  area: 'Cocina' | 'Salón';
  avatar_color?: string;
  active: boolean;
  // Control de dispositivo único intransferible
  registered_device_id?: string | null;
  registered_device_name?: string | null;
  registered_device_at?: string | null;
  biometric_enrolled?: boolean;
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
  // Datos de auditoría biométrica y GPS
  clock_in_lat?: number | null;
  clock_in_lng?: number | null;
  clock_in_distance_meters?: number | null;
  clock_out_lat?: number | null;
  clock_out_lng?: number | null;
  device_id?: string | null;
  device_name?: string | null;
  verified_by_gps?: boolean;
  verified_by_biometrics?: boolean;
  verified_by_device?: boolean;
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
  // Geovalla y control antifraude en Mall Aventura
  mall_lat: number; // Latitud de Shimaya Ramen en Mall Aventura
  mall_lng: number; // Longitud
  radius_meters: number; // Radio permitido (ej: 150 metros)
  store_location_name: string;
  require_gps: boolean;
  require_device_match: boolean;
  require_biometrics: boolean;
}
