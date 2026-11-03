import { Employee, Attendance, Schedule, SystemConfig } from '@/types/database';

export const INITIAL_EMPLOYEES: Employee[] = [
  // ================= COCINA (8 Colaboradores - Alexander excluido de asistencia) =================
  {
    id: 'emp-cocina-2',
    slug: 'doris-rojas',
    name: 'Doris Yanela Rojas Chilcon',
    code: '1010',
    has_custom_pin: true,
    role: '2do Jefe de Cocina',
    area: 'Cocina',
    avatar_color: '#f97316',
    active: true,
    registered_device_id: 'dev-1bd3e24e-31b3-4860-97c1-551700f9a908',
    registered_device_name: 'Apple iPhone (Safari)',
  },
  {
    id: 'emp-cocina-3',
    slug: 'brad-perez',
    name: 'Brad Hans Perez Diaz',
    code: '1206',
    has_custom_pin: true,
    role: 'Salteado',
    area: 'Cocina',
    avatar_color: '#eab308',
    active: true,
    registered_device_id: 'dev-bfa40dc2-395b-4a43-952c-6ec25c7af36f',
    registered_device_name: 'Apple iPhone (Safari)',
  },
  {
    id: 'emp-cocina-4',
    slug: 'mayleb-castro',
    name: 'Mayleb Vanne Castro Estrada',
    code: '1111',
    has_custom_pin: true,
    role: 'Makis',
    area: 'Cocina',
    avatar_color: '#10b981',
    active: true,
    registered_device_id: 'dev-a0c496b6-0db0-4ea2-932c-4c35a1d73c2f',
    registered_device_name: 'Apple iPhone (Safari)',
  },
  {
    id: 'emp-cocina-5',
    slug: 'michel-carhuanco',
    name: 'Michel Anderson Carhuanco Martinez',
    code: '9214',
    has_custom_pin: true,
    role: 'Frituras (Part Time)',
    area: 'Cocina',
    avatar_color: '#06b6d4',
    active: true,
    registered_device_id: 'dev-c18fbe66-b9f1-46a8-a6f6-edb5ebe4d0e9',
    registered_device_name: 'Celular Android (Chrome)',
  },
  {
    id: 'emp-cocina-6',
    slug: 'nayeli-chavez',
    name: 'Nayeli Chavez Alvarez',
    code: '1717',
    has_custom_pin: true,
    role: 'Frituras',
    area: 'Cocina',
    avatar_color: '#6366f1',
    active: true,
    registered_device_id: 'dev-de2b2d54-d714-4383-aab6-0997414632a3',
    registered_device_name: 'Apple iPhone (Safari)',
  },
  {
    id: 'emp-cocina-7',
    slug: 'renzo-bustamante',
    name: 'Renzo Fabio Bustamante Mora',
    code: '1709',
    has_custom_pin: true,
    role: 'Makis, Ramen, Frituras, Salteado',
    area: 'Cocina',
    avatar_color: '#8b5cf6',
    active: true,
    registered_device_id: 'dev-f3a83893-a2b0-417b-b805-94beca7bf3db',
    registered_device_name: 'Celular Android (Chrome)',
  },
  {
    id: 'emp-cocina-8',
    slug: 'rosa-tarrillo',
    name: 'Rosa Naomi Tarrillo Vilchez',
    code: '1001',
    has_custom_pin: true,
    role: 'Ramen (Lic. Maternidad)',
    area: 'Cocina',
    avatar_color: '#ec4899',
    active: true,
    registered_device_id: 'dev-3539eb63-0e47-4069-8b65-4f5b61271691',
    registered_device_name: 'Apple iPhone (Safari)',
  },
  {
    id: 'emp-cocina-9',
    slug: 'rossy-ramos',
    name: 'Rossy Lisseth Ramos Milian',
    code: '1002',
    has_custom_pin: true,
    role: 'Ramen, Frituras',
    area: 'Cocina',
    avatar_color: '#f43f5e',
    active: true,
    registered_device_id: 'dev-669c6de6-c3ad-419f-8f1a-5e6eb2fb2da9',
    registered_device_name: 'Celular Android (Chrome)',
  },

  // ================= SALÓN (8 Colaboradores - Adrian excluido de asistencia) =================
  {
    id: 'emp-salon-2',
    slug: 'angela-baldera',
    name: 'Angela Cintia Baldera Cienjuegos',
    code: '1209',
    has_custom_pin: true,
    role: 'Jefe de Salón',
    area: 'Salón',
    avatar_color: '#8b5cf6',
    active: true,
    registered_device_id: 'dev-f490d271-1fe1-431e-9024-fef056a5e87a',
    registered_device_name: 'Celular Android (Chrome)',
  },
  {
    id: 'emp-salon-3',
    slug: 'marjorie-gallardo',
    name: 'Marjorie Fiorella Gallardo Chévez',
    code: '1234',
    has_custom_pin: true,
    role: 'Cajero/a',
    area: 'Salón',
    avatar_color: '#10b981',
    active: true,
    registered_device_id: 'dev-b820a9c6-a0d7-46b7-b3b0-ce8b09a4da4a',
    registered_device_name: 'Celular Android (Chrome)',
  },
  {
    id: 'emp-salon-4',
    slug: 'alessandro-del-piero',
    name: 'Alessandro Del Piero Maco Raymundo',
    code: '2007',
    has_custom_pin: true,
    role: 'Juguetería, Atención',
    area: 'Salón',
    avatar_color: '#06b6d4',
    active: true,
    registered_device_id: 'dev-cb1768f0-84a9-4050-a3c4-2444a262ccdd',
    registered_device_name: 'Apple iPhone (Safari)',
  },
  {
    id: 'emp-salon-5',
    slug: 'axl-llontop',
    name: 'Axl Ali Llontop Cieza',
    code: '0000',
    has_custom_pin: true,
    role: 'Juguetería, Caja, Atención',
    area: 'Salón',
    avatar_color: '#f59e0b',
    active: true,
    registered_device_id: 'dev-df34d2ab-a74a-4288-ad98-d751d7a9158c',
    registered_device_name: 'Apple iPhone (Safari)',
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
    id: 'emp-salon-9',
    slug: 'tatiana-bonilla',
    name: 'Tatiana Bonilla La Serna',
    code: '',
    has_custom_pin: false,
    role: 'Aprendiendo: Atención (Part Time)',
    area: 'Salón',
    avatar_color: '#d97706',
    active: true,
  },
  {
    id: 'emp-salon-10',
    slug: 'yurikho-ruiz',
    name: 'Yurikho Ruiz Huaman',
    code: '2208',
    has_custom_pin: true,
    role: 'Atención',
    area: 'Salón',
    avatar_color: '#0284c7',
    active: true,
    registered_device_id: 'dev-696c22c5-334f-46fe-a426-215aa681da23',
    registered_device_name: 'Apple iPhone (Safari)',
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
  // ================= COCINA (Malla oficial 02/11 al 08/11) =================
  // Doris Rojas: Martes descanso -> [1, 3, 4, 5, 6, 0]
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-2', d)),
  // Brad Perez: Jueves descanso -> [1, 2, 3, 5, 6, 0]
  ...[1, 2, 3, 5, 6, 0].map((d) => createShift('emp-cocina-3', d)),
  // Mayleb Castro: Lunes descanso -> [2, 3, 4, 5, 6, 0]
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-4', d)),
  // Michel Carhuanco PT: Martes descanso -> [1, 3, 4, 5] (15:00-23:00) y [6, 0] (11:00-23:00)
  ...[1, 3, 4, 5].map((d) => createShift('emp-cocina-5', d, '15:00', '23:00')),
  createShift('emp-cocina-5', 6, '11:00', '23:00'),
  createShift('emp-cocina-5', 0, '11:00', '23:00'),
  // Nayeli Chavez: Miercoles descanso -> [1, 2, 4, 5, 6, 0]
  ...[1, 2, 4, 5, 6, 0].map((d) => createShift('emp-cocina-6', d)),
  // Renzo Bustamante: Miercoles descanso -> [1, 2, 4, 5, 6, 0]
  ...[1, 2, 4, 5, 6, 0].map((d) => createShift('emp-cocina-7', d)),
  // Rosa Naomi: Martes descanso -> [1, 3, 4, 5, 6, 0] (12:00-23:00)
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-8', d, '12:00', '23:00')),
  // Rossy Ramos: Lunes descanso -> [2, 3, 4, 5, 6, 0]
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-9', d)),

  // ================= SALÓN (Malla oficial 02/11 al 08/11) =================
  // Angela Baldera: Miercoles descanso -> [1, 2, 4, 5, 6, 0]
  ...[1, 2, 4, 5, 6, 0].map((d) => createShift('emp-salon-2', d)),
  // Marjorie Gallardo: Jueves descanso -> [1, 2, 3, 5, 6, 0]
  ...[1, 2, 3, 5, 6, 0].map((d) => createShift('emp-salon-3', d)),
  // Alessandro Del Piero: Martes descanso -> [1, 3, 4, 5, 6, 0]
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-4', d)),
  // Axl Llontop: Lunes descanso -> [2, 3, 4, 5, 6, 0]
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-5', d)),
  // Leandro Heredia: Martes descanso -> [1, 3, 4, 5, 6, 0]
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-6', d)),
  // Manuel Torres: Lunes descanso -> [2, 3, 4, 5, 6, 0]
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-7', d)),
  // Tatiana Bonilla La Serna: Lunes/Jueves descanso, Martes/Miercoles 17:00-23:00, Viernes/Sabado/Domingo FT 11:00-23:00
  createShift('emp-salon-9', 2, '17:00', '23:00'),
  createShift('emp-salon-9', 3, '17:00', '23:00'),
  createShift('emp-salon-9', 5, '11:00', '23:00'),
  createShift('emp-salon-9', 6, '11:00', '23:00'),
  createShift('emp-salon-9', 0, '11:00', '23:00'),
  // Yurikho Ruiz: Lunes 13:45, Martes 14:00, Miercoles/Jueves descanso, Viernes FT 11:00, Sabado FT 11:00, Domingo 13:45
  createShift('emp-salon-10', 1, '13:45', '23:00'),
  createShift('emp-salon-10', 2, '14:00', '23:00'),
  createShift('emp-salon-10', 5, '11:00', '23:00'),
  createShift('emp-salon-10', 6, '11:00', '23:00'),
  createShift('emp-salon-10', 0, '13:45', '23:00'),
];

export const DEFAULT_CONFIG: SystemConfig = {
  store_name: 'Shimaya Ramen - Mall Aventura Chiclayo',
  admin_pin: '1907',
  telegram_bot_token: '8941568069:AAEeg9DZhP54X8XP-ZGjcKLYnbVhAOKYs80',
  telegram_chat_id: '8657890692',
  auto_checkout_hour: 1,
  timezone_offset: -5,
  // Coordenadas exactas de Shimaya Ramen - Mall Aventura Chiclayo (Av. Panamericana Norte 639)
  mall_lat: -6.76329,
  mall_lng: -79.86164,
  radius_meters: 250, // Radio generoso (250m) para cubrir la zona del mall e interiores de cocina
  store_location_name: 'Shimaya Ramen - Mall Aventura Chiclayo',
  require_gps: false, // Flexible por hoy para permitir a todos iniciar su jornada sin bloqueos
  require_device_match: true,
  require_biometrics: false,
};

const STORAGE_KEYS = {
  EMPLOYEES_V3: 'store_attendance_employees_v6',
  ATTENDANCE_V3: 'store_attendance_records_v6',
  SCHEDULES_V3: 'store_attendance_schedules_v6',
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
    if (!Array.isArray(parsed) || parsed.length < 8) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES_V3, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    // Excluir a Adrian, Alexander y Raquel de la asistencia
    const filtered = parsed.filter(
      (e: Employee) =>
        e.id !== 'emp-cocina-1' &&
        e.id !== 'emp-salon-1' &&
        e.id !== 'emp-salon-8' &&
        !e.name?.toLowerCase().includes('raquel')
    );
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES_V3, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return INITIAL_EMPLOYEES;
  }
};

export const saveLocalEmployees = (employees: Employee[]) => {
  if (typeof window === 'undefined') return;
  // Excluir a Adrian, Alexander y Raquel de la asistencia
  const filtered = employees.filter(
    (e: Employee) =>
      e.id !== 'emp-cocina-1' &&
      e.id !== 'emp-salon-1' &&
      e.id !== 'emp-salon-8'
  );
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES_V3, JSON.stringify(filtered));
};

export const getLocalAttendance = (): Attendance[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_V3);
  if (!saved) return [];
  try {
    const list: Attendance[] = JSON.parse(saved);
    // Filtrar marcaciones accidentales o de colaboradores eliminados
    const filtered = list.filter((a) => {
      if (a.employee_id === 'emp-salon-8') return false;
      if (a.employee_id === 'emp-cocina-1' || a.employee_id === 'emp-salon-1') return false;
      if (a.employee_id === 'emp-cocina-4' && a.clock_in) {
        const d = new Date(a.clock_in).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        if (d === '2026-10-27') return false;
      }
      return true;
    });
    if (filtered.length !== list.length) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_V3, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
};

export const saveLocalAttendance = (records: Attendance[]) => {
  if (typeof window === 'undefined') return;
  // Filtrar a Mayleb en descanso y a Raquel/Adrian/Alexander
  const filtered = records.filter((a) => {
    if (a.employee_id === 'emp-salon-8') return false;
    if (a.employee_id === 'emp-cocina-1' || a.employee_id === 'emp-salon-1') return false;
    if (a.employee_id === 'emp-cocina-4' && a.clock_in) {
      const d = new Date(a.clock_in).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      if (d === '2026-10-27') return false;
    }
    return true;
  });
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE_V3, JSON.stringify(filtered));
};

export const getLocalSchedules = (): Schedule[] => {
  if (typeof window === 'undefined') return INITIAL_SCHEDULES;
  const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES_V3);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES_V3, JSON.stringify(INITIAL_SCHEDULES));
    return INITIAL_SCHEDULES;
  }
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length < 70) {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES_V3, JSON.stringify(INITIAL_SCHEDULES));
      return INITIAL_SCHEDULES;
    }
    const filtered = parsed.filter(
      (s: Schedule) =>
        s.employee_id !== 'emp-cocina-1' &&
        s.employee_id !== 'emp-salon-1' &&
        s.employee_id !== 'emp-salon-8'
    );
    return filtered;
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

    if (!parsed.telegram_bot_token || !parsed.telegram_chat_id) {
      parsed.telegram_bot_token = DEFAULT_CONFIG.telegram_bot_token;
      parsed.telegram_chat_id = DEFAULT_CONFIG.telegram_chat_id;
      parsed.store_name = DEFAULT_CONFIG.store_name;
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
