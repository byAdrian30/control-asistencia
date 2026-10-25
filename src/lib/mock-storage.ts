import { Employee, Attendance, Schedule, SystemConfig } from '@/types/database';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Carlos Mendoza',
    code: '1001',
    role: 'Vendedor Tienda',
    avatar_color: '#10b981',
    active: true,
  },
  {
    id: 'emp-2',
    name: 'Lucía Ramírez',
    code: '1002',
    role: 'Cajera Principal',
    avatar_color: '#6366f1',
    active: true,
  },
  {
    id: 'emp-3',
    name: 'Mateo Salazar',
    code: '1003',
    role: 'Atención al Cliente',
    avatar_color: '#f59e0b',
    active: true,
  },
  {
    id: 'emp-4',
    name: 'Andrea Vargas',
    code: '1004',
    role: 'Supervisora de Turno',
    avatar_color: '#ec4899',
    active: true,
  },
];

// Horario estándar: Lunes a Sábado 09:00 a 18:00
export const INITIAL_SCHEDULES: Schedule[] = [
  ...[1, 2, 3, 4, 5, 6].map((day) => ({
    id: `sch-1-${day}`,
    employee_id: 'emp-1',
    day_of_week: day,
    start_time: '09:00',
    end_time: '18:00',
    tolerance_minutes: 10,
    is_active: true,
  })),
  ...[1, 2, 3, 4, 5, 6].map((day) => ({
    id: `sch-2-${day}`,
    employee_id: 'emp-2',
    day_of_week: day,
    start_time: '09:00',
    end_time: '18:00',
    tolerance_minutes: 10,
    is_active: true,
  })),
  ...[1, 2, 3, 4, 5, 6].map((day) => ({
    id: `sch-3-${day}`,
    employee_id: 'emp-3',
    day_of_week: day,
    start_time: '10:00',
    end_time: '19:00',
    tolerance_minutes: 10,
    is_active: true,
  })),
  ...[1, 2, 3, 4, 5, 6].map((day) => ({
    id: `sch-4-${day}`,
    employee_id: 'emp-4',
    day_of_week: day,
    start_time: '08:30',
    end_time: '17:30',
    tolerance_minutes: 10,
    is_active: true,
  })),
];

export const DEFAULT_CONFIG: SystemConfig = {
  store_name: 'Tienda Principal',
  admin_pin: '1234',
  telegram_bot_token: '',
  telegram_chat_id: '',
  auto_checkout_hour: 1,
  timezone_offset: -5, // UTC-5 (Perú, Colombia, Ecuador)
};

const STORAGE_KEYS = {
  EMPLOYEES: 'store_attendance_employees',
  ATTENDANCE: 'store_attendance_records',
  SCHEDULES: 'store_attendance_schedules',
  CONFIG: 'store_attendance_config',
};

export const getLocalEmployees = (): Employee[] => {
  if (typeof window === 'undefined') return INITIAL_EMPLOYEES;
  const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_EMPLOYEES;
  }
};

export const saveLocalEmployees = (employees: Employee[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
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
  const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(INITIAL_SCHEDULES));
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
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
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
