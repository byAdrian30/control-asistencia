import { Employee, Attendance, Schedule, SystemConfig } from '@/types/database';

export const INITIAL_EMPLOYEES: Employee[] = [
  // ================= COCINA (9 Colaboradores) =================
  {
    id: 'emp-cocina-1',
    slug: 'alexander-campos',
    name: 'Alexander Genaro Campos Huanani',
    code: '',
    has_custom_pin: false,
    role: 'Jefe de Cocina',
    area: 'Cocina',
    avatar_color: '#ef4444',
    active: true,
  },
  {
    id: 'emp-cocina-2',
    slug: 'doris-rojas',
    name: 'Doris Yanela Rojas Chilcon',
    code: '',
    has_custom_pin: false,
    role: '2do Jefe de Cocina',
    area: 'Cocina',
    avatar_color: '#f97316',
    active: true,
  },
  {
    id: 'emp-cocina-3',
    slug: 'brad-perez',
    name: 'Brad Hans Perez Diaz',
    code: '',
    has_custom_pin: false,
    role: 'Salteado',
    area: 'Cocina',
    avatar_color: '#eab308',
    active: true,
  },
  {
    id: 'emp-cocina-4',
    slug: 'mayleb-castro',
    name: 'Mayleb Vanne Castro Estrada',
    code: '',
    has_custom_pin: false,
    role: 'Makis',
    area: 'Cocina',
    avatar_color: '#10b981',
    active: true,
  },
  {
    id: 'emp-cocina-5',
    slug: 'michel-carhuanco',
    name: 'Michel Anderson Carhuanco Martinez',
    code: '',
    has_custom_pin: false,
    role: 'Frituras (Part Time)',
    area: 'Cocina',
    avatar_color: '#06b6d4',
    active: true,
  },
  {
    id: 'emp-cocina-6',
    slug: 'nayeli-chavez',
    name: 'Nayeli Chavez Alvarez',
    code: '',
    has_custom_pin: false,
    role: 'Frituras',
    area: 'Cocina',
    avatar_color: '#6366f1',
    active: true,
  },
  {
    id: 'emp-cocina-7',
    slug: 'renzo-bustamante',
    name: 'Renzo Fabio Bustamante Mora',
    code: '',
    has_custom_pin: false,
    role: 'Makis, Ramen, Frituras, Salteado',
    area: 'Cocina',
    avatar_color: '#8b5cf6',
    active: true,
  },
  {
    id: 'emp-cocina-8',
    slug: 'rosa-tarrillo',
    name: 'Rosa Naomi Tarrillo Vilchez',
    code: '',
    has_custom_pin: false,
    role: 'Ramen (Lic. Maternidad)',
    area: 'Cocina',
    avatar_color: '#ec4899',
    active: true,
  },
  {
    id: 'emp-cocina-9',
    slug: 'rossy-ramos',
    name: 'Rossy Lisseth Ramos Milian',
    code: '',
    has_custom_pin: false,
    role: 'Ramen, Frituras',
    area: 'Cocina',
    avatar_color: '#f43f5e',
    active: true,
  },

  // ================= SALÓN (10 Colaboradores) =================
  {
    id: 'emp-salon-1',
    slug: 'adrian-barranzuela',
    name: 'Adrian Smith Barranzuela Cordova',
    code: '',
    has_custom_pin: false,
    role: 'Líder de Tienda',
    area: 'Salón',
    avatar_color: '#3b82f6',
    active: true,
  },
  {
    id: 'emp-salon-2',
    slug: 'angela-baldera',
    name: 'Angela Cintia Baldera Cienjuegos',
    code: '',
    has_custom_pin: false,
    role: 'Jefe de Salón',
    area: 'Salón',
    avatar_color: '#8b5cf6',
    active: true,
  },
  {
    id: 'emp-salon-3',
    slug: 'marjorie-gallardo',
    name: 'Marjorie Fiorella Gallardo Chévez',
    code: '',
    has_custom_pin: false,
    role: 'Cajero/a',
    area: 'Salón',
    avatar_color: '#10b981',
    active: true,
  },
  {
    id: 'emp-salon-4',
    slug: 'alessandro-del-piero',
    name: 'Alessandro Del Piero Maco Raymundo',
    code: '',
    has_custom_pin: false,
    role: 'Juguetería, Atención',
    area: 'Salón',
    avatar_color: '#06b6d4',
    active: true,
  },
  {
    id: 'emp-salon-5',
    slug: 'axl-llontop',
    name: 'Axl Ali Llontop Cieza',
    code: '',
    has_custom_pin: false,
    role: 'Juguetería, Caja, Atención',
    area: 'Salón',
    avatar_color: '#f59e0b',
    active: true,
  },
  {
    id: 'emp-salon-6',
    slug: 'leandro-heredia',
    name: 'Leandro Emmanuel Heredia Carbonel',
    code: '',
    has_custom_pin: false,
    role: 'Juguetería, Atención',
    area: 'Salón',
    avatar_color: '#14b8a6',
    active: true,
  },
  {
    id: 'emp-salon-7',
    slug: 'manuel-torres',
    name: 'Manuel Renato Torres Mendoza',
    code: '',
    has_custom_pin: false,
    role: 'Juguetería, Atención',
    area: 'Salón',
    avatar_color: '#6366f1',
    active: true,
  },
  {
    id: 'emp-salon-8',
    slug: 'raquel-perez',
    name: 'Raquel Abigail Perez Ramirez',
    code: '',
    has_custom_pin: false,
    role: 'Nuevo - Atención',
    area: 'Salón',
    avatar_color: '#e11d48',
    active: true,
  },
  {
    id: 'emp-salon-9',
    slug: 'tatiana-escobar',
    name: 'Tatiana Escobar',
    code: '',
    has_custom_pin: false,
    role: 'Nuevo PT - Atención',
    area: 'Salón',
    avatar_color: '#d97706',
    active: true,
  },
  {
    id: 'emp-salon-10',
    slug: 'yurikho-ruiz',
    name: 'Yurikho Ruiz Huaman',
    code: '',
    has_custom_pin: false,
    role: 'Atención',
    area: 'Salón',
    avatar_color: '#0284c7',
    active: true,
  },
];

function createShift(empId: string, day: number, start = '11:00', end = '23:00', tol = 10): Schedule {
  return {
    id: `sch-${empId}-${day}`,
    employee_id: empId,
    day_of_week: day,
    start_time: start,
    end_time: end,
    tolerance_minutes: tol,
    is_active: true,
  };
}

export const INITIAL_SCHEDULES: Schedule[] = [
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-1', d)),
  ...[1, 2, 3, 5, 6, 0].map((d) => createShift('emp-cocina-2', d)),
  ...[1, 2, 3, 5, 6, 0].map((d) => createShift('emp-cocina-3', d)),
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-4', d)),
  ...[1, 3, 4, 5].map((d) => createShift('emp-cocina-5', d, '15:00', '23:00')),
  createShift('emp-cocina-5', 6, '11:00', '23:00'),
  createShift('emp-cocina-5', 0, '11:00', '23:00'),
  ...[1, 2, 4, 5, 6, 0].map((d) => createShift('emp-cocina-6', d)),
  ...[1, 2, 4, 5, 6, 0].map((d) => createShift('emp-cocina-7', d)),
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-8', d, '12:00', '23:00')),
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-9', d)),

  ...[1, 2, 4, 5, 6, 0].map((d) => createShift('emp-salon-1', d)),
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-2', d)),
  ...[1, 2, 3, 5, 6, 0].map((d) => createShift('emp-salon-3', d)),
  ...[1, 2, 3, 5, 6, 0].map((d) => createShift('emp-salon-4', d)),
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-5', d)),
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-6', d)),
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-7', d)),
  ...[1, 2, 4, 5, 6, 0].map((d) => createShift('emp-salon-8', d)),
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-9', d, '15:00', '23:00')),

  createShift('emp-salon-10', 1, '13:45', '23:00'),
  createShift('emp-salon-10', 2, '14:00', '23:00'),
  createShift('emp-salon-10', 5, '11:00', '23:00'),
  createShift('emp-salon-10', 6, '11:00', '23:00'),
  createShift('emp-salon-10', 0, '13:45', '23:00'),
];

export const DEFAULT_CONFIG: SystemConfig = {
  store_name: 'Shimaya Ramen',
  admin_pin: '1234',
  telegram_bot_token: '',
  telegram_chat_id: '',
  auto_checkout_hour: 1,
  timezone_offset: -5,
  // Coordenadas exactas de Shimaya Ramen - Mall Aventura Chiclayo (Av. Panamericana Norte 639)
  mall_lat: -6.76329,
  mall_lng: -79.86164,
  radius_meters: 250, // Radio generoso (250m) para cubrir la zona del mall e interiores de cocina
  store_location_name: 'Shimaya Ramen - Mall Aventura Chiclayo',
  require_gps: false, // Flexible por hoy para permitir a todos iniciar su jornada sin bloqueos
  require_device_match: true,
  require_biometrics: true,
};

const STORAGE_KEYS = {
  EMPLOYEES_V3: 'store_attendance_employees_v3',
  ATTENDANCE_V3: 'store_attendance_records_v3',
  SCHEDULES_V3: 'store_attendance_schedules_v3',
  CONFIG_V3: 'store_attendance_config_v3',
};

export const getLocalEmployees = (): Employee[] => {
  if (typeof window === 'undefined') return INITIAL_EMPLOYEES;
  const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES_V3);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES_V3, JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
  }
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length < 10) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES_V3, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    return parsed;
  } catch {
    return INITIAL_EMPLOYEES;
  }
};

export const saveLocalEmployees = (employees: Employee[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES_V3, JSON.stringify(employees));
};

export const getLocalAttendance = (): Attendance[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_V3);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
};

export const saveLocalAttendance = (records: Attendance[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE_V3, JSON.stringify(records));
};

export const getLocalSchedules = (): Schedule[] => {
  if (typeof window === 'undefined') return INITIAL_SCHEDULES;
  const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES_V3);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES_V3, JSON.stringify(INITIAL_SCHEDULES));
    return INITIAL_SCHEDULES;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_SCHEDULES;
  }
};

export const saveLocalSchedules = (schedules: Schedule[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SCHEDULES_V3, JSON.stringify(schedules));
};

export const getLocalConfig = (): SystemConfig => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const saved = localStorage.getItem(STORAGE_KEYS.CONFIG_V3);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.CONFIG_V3, JSON.stringify(DEFAULT_CONFIG));
    return DEFAULT_CONFIG;
  }
  try {
    const parsed: SystemConfig = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };

    // Auto-migración si el dispositivo tiene en caché las coordenadas antiguas de Lima (< -10):
    // Esto fuerza la actualización instantánea a Mall Aventura Chiclayo (-6.76329, -79.86164)
    // para resolver el error "a 600 km de lejos" en los celulares de todo el equipo.
    if (!parsed.mall_lat || parsed.mall_lat < -10 || parsed.store_location_name?.includes('Santa Anita')) {
      parsed.mall_lat = -6.76329;
      parsed.mall_lng = -79.86164;
      parsed.radius_meters = 250;
      parsed.store_location_name = 'Shimaya Ramen - Mall Aventura Chiclayo';
      parsed.require_gps = false;
      localStorage.setItem(STORAGE_KEYS.CONFIG_V3, JSON.stringify(parsed));
    }

    return parsed;
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const saveLocalConfig = (config: SystemConfig) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CONFIG_V3, JSON.stringify(config));
};
