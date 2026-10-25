import { Employee, Attendance, Schedule, SystemConfig } from '@/types/database';

export const INITIAL_EMPLOYEES: Employee[] = [
  // ================= COCINA (9 Colaboradores) =================
  {
    id: 'emp-cocina-1',
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
    name: 'Yurikho Ruiz Huaman',
    code: '',
    has_custom_pin: false,
    role: 'Atención',
    area: 'Salón',
    avatar_color: '#0284c7',
    active: true,
  },
];

// Helper para crear horarios fácilmente
// day: 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
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
  // 1. Alexander Genaro Campos Huanani (Descanso: Lunes 1) -> Trabaja 2,3,4,5,6,0 a las 11:00
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-1', d)),

  // 2. Doris Yanela Rojas Chilcon (Descanso: Jueves 4) -> Trabaja 1,2,3,5,6,0 a las 11:00
  ...[1, 2, 3, 5, 6, 0].map((d) => createShift('emp-cocina-2', d)),

  // 3. Brad Hans Perez Diaz (Descanso: Jueves 4) -> Trabaja 1,2,3,5,6,0 a las 11:00
  ...[1, 2, 3, 5, 6, 0].map((d) => createShift('emp-cocina-3', d)),

  // 4. Mayleb Vanne Castro Estrada (Descanso: Martes 2) -> Trabaja 1,3,4,5,6,0 a las 11:00
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-4', d)),

  // 5. Michel Anderson Carhuanco Martinez (Descanso: Martes 2)
  // Lun, Mie, Jue, Vie: 15:00 a 23:00 (PT). Sab, Dom: 11:00 a 23:00 (FT)
  ...[1, 3, 4, 5].map((d) => createShift('emp-cocina-5', d, '15:00', '23:00')),
  createShift('emp-cocina-5', 6, '11:00', '23:00'),
  createShift('emp-cocina-5', 0, '11:00', '23:00'),

  // 6. Nayeli Chavez Alvarez (Descanso: Miércoles 3) -> Trabaja 1,2,4,5,6,0 a las 11:00
  ...[1, 2, 4, 5, 6, 0].map((d) => createShift('emp-cocina-6', d)),

  // 7. Renzo Fabio Bustamante Mora (Descanso: Miércoles 3) -> Trabaja 1,2,4,5,6,0 a las 11:00
  ...[1, 2, 4, 5, 6, 0].map((d) => createShift('emp-cocina-7', d)),

  // 8. Rosa Naomi Tarrillo Vilchez (Descanso: Martes 2) -> Lic. Maternidad 12:00 a 23:00 en 1,3,4,5,6,0
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-8', d, '12:00', '23:00')),

  // 9. Rossy Lisseth Ramos Milian (Descanso: Lunes 1) -> Trabaja 2,3,4,5,6,0 a las 11:00
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-cocina-9', d)),

  // 10. Adrian Smith Barranzuela Cordova (Descanso: Miércoles 3) -> Trabaja 1,2,4,5,6,0 a las 11:00
  ...[1, 2, 4, 5, 6, 0].map((d) => createShift('emp-salon-1', d)),

  // 11. Angela Cintia Baldera Cienjuegos (Descanso: Martes 2) -> Trabaja 1,3,4,5,6,0 a las 11:00
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-2', d)),

  // 12. Marjorie Fiorella Gallardo Chévez (Descanso: Jueves 4) -> Trabaja 1,2,3,5,6,0 a las 11:00
  ...[1, 2, 3, 5, 6, 0].map((d) => createShift('emp-salon-3', d)),

  // 13. Alessandro Del Piero Maco Raymundo (Descanso: Jueves 4) -> Trabaja 1,2,3,5,6,0 a las 11:00
  ...[1, 2, 3, 5, 6, 0].map((d) => createShift('emp-salon-4', d)),

  // 14. Axl Ali Llontop Cieza (Descanso: Lunes 1) -> Trabaja 2,3,4,5,6,0 a las 11:00
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-5', d)),

  // 15. Leandro Emmanuel Heredia Carbonel (Descanso: Martes 2) -> Trabaja 1,3,4,5,6,0 a las 11:00
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-6', d)),

  // 16. Manuel Renato Torres Mendoza (Descanso: Lunes 1) -> Trabaja 2,3,4,5,6,0 a las 11:00
  ...[2, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-7', d)),

  // 17. Raquel Abigail Perez Ramirez (Descanso: Miércoles 3) -> Trabaja 1,2,4,5,6,0 a las 11:00
  ...[1, 2, 4, 5, 6, 0].map((d) => createShift('emp-salon-8', d)),

  // 18. Tatiana Escobar (Descanso: Martes 2) -> PT 15:00 a 23:00 en 1,3,4,5,6,0
  ...[1, 3, 4, 5, 6, 0].map((d) => createShift('emp-salon-9', d, '15:00', '23:00')),

  // 19. Yurikho Ruiz Huaman (Descanso: Miércoles 3 y Jueves 4)
  createShift('emp-salon-10', 1, '13:45', '23:00'), // Lunes
  createShift('emp-salon-10', 2, '14:00', '23:00'), // Martes
  createShift('emp-salon-10', 5, '11:00', '23:00'), // Viernes
  createShift('emp-salon-10', 6, '11:00', '23:00'), // Sábado
  createShift('emp-salon-10', 0, '13:45', '23:00'), // Domingo
];

export const DEFAULT_CONFIG: SystemConfig = {
  store_name: 'Tienda Shimaya',
  admin_pin: '1234',
  telegram_bot_token: '',
  telegram_chat_id: '',
  auto_checkout_hour: 1,
  timezone_offset: -5,
};

const STORAGE_KEYS = {
  EMPLOYEES_V2: 'store_attendance_employees_v2',
  ATTENDANCE: 'store_attendance_records',
  SCHEDULES_V2: 'store_attendance_schedules_v2',
  CONFIG: 'store_attendance_config',
};

export const getLocalEmployees = (): Employee[] => {
  if (typeof window === 'undefined') return INITIAL_EMPLOYEES;
  const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES_V2);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES_V2, JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
  }
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length < 10) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES_V2, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    return parsed;
  } catch {
    return INITIAL_EMPLOYEES;
  }
};

export const saveLocalEmployees = (employees: Employee[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES_V2, JSON.stringify(employees));
};

export const getLocalAttendance = (): Attendance[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
};

export const saveLocalAttendance = (records: Attendance[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
};

export const getLocalSchedules = (): Schedule[] => {
  if (typeof window === 'undefined') return INITIAL_SCHEDULES;
  const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES_V2);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES_V2, JSON.stringify(INITIAL_SCHEDULES));
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
  localStorage.setItem(STORAGE_KEYS.SCHEDULES_V2, JSON.stringify(schedules));
};

export const getLocalConfig = (): SystemConfig => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
    return DEFAULT_CONFIG;
  }
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const saveLocalConfig = (config: SystemConfig) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
};
