import { Employee, Schedule, Attendance, SystemConfig } from '@/types/database';
import { INITIAL_EMPLOYEES, INITIAL_SCHEDULES, DEFAULT_CONFIG } from '@/lib/mock-storage';

const GITHUB_TOKEN =
  process.env.GITHUB_STORAGE_TOKEN ||
  process.env.GITHUB_TOKEN ||
  '';

const GIST_ID =
  process.env.GITHUB_GIST_ID ||
  'cc4c33e9f80554e83bebe736702f331b';

export interface FullStoreState {
  employees: Employee[];
  schedules: Schedule[];
  attendances: Attendance[];
  config: SystemConfig;
}

// Cache en memoria para respuestas ultra-rápidas en el servidor
let cachedState: FullStoreState | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 2500; // 2.5s TTL

export async function getCloudFullState(): Promise<FullStoreState> {
  const now = Date.now();
  if (cachedState && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedState;
  }

  if (!GITHUB_TOKEN || !GIST_ID) {
    return (
      cachedState || {
        employees: INITIAL_EMPLOYEES,
        schedules: INITIAL_SCHEDULES,
        attendances: [],
        config: DEFAULT_CONFIG,
      }
    );
  }

  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Shimaya-Attendance-App',
        Accept: 'application/vnd.github+json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Error al consultar Gist central:', res.status, res.statusText);
      return (
        cachedState || {
          employees: INITIAL_EMPLOYEES,
          schedules: INITIAL_SCHEDULES,
          attendances: [],
          config: DEFAULT_CONFIG,
        }
      );
    }

    const data = await res.json();
    const files = data.files || {};

    // 1. Empleados
    let employees: Employee[] = INITIAL_EMPLOYEES;
    if (files['employees.json']?.content) {
      try {
        const parsed = JSON.parse(files['employees.json'].content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          employees = parsed;
        }
      } catch {}
    }

    // 2. Horarios
    let schedules: Schedule[] = INITIAL_SCHEDULES;
    if (files['schedules.json']?.content) {
      try {
        const parsed = JSON.parse(files['schedules.json'].content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          schedules = parsed;
        }
      } catch {}
    }

    // 3. Asistencias
    let attendances: Attendance[] = [];
    if (files['attendances.json']?.content) {
      try {
        const parsed = JSON.parse(files['attendances.json'].content);
        if (Array.isArray(parsed)) {
          attendances = parsed;
        }
      } catch {}
    }

    // 4. Configuración
    let config: SystemConfig = DEFAULT_CONFIG;
    if (files['config.json']?.content) {
      try {
        const parsed = JSON.parse(files['config.json'].content);
        if (parsed && typeof parsed === 'object') {
          config = { ...DEFAULT_CONFIG, ...parsed };
        }
      } catch {}
    }

    // Limpieza de seguridad permanente: jamás incluir a Adrian, Alexander o Raquel
    employees = employees.filter(
      (e) => e.id !== 'emp-cocina-1' && e.id !== 'emp-salon-1' && e.id !== 'emp-salon-8'
    );
    schedules = schedules.filter(
      (s) =>
        s.employee_id !== 'emp-cocina-1' &&
        s.employee_id !== 'emp-salon-1' &&
        s.employee_id !== 'emp-salon-8'
    );
    attendances = attendances.filter(
      (a) =>
        a.employee_id !== 'emp-cocina-1' &&
        a.employee_id !== 'emp-salon-1' &&
        a.employee_id !== 'emp-salon-8'
    );

    const fullState: FullStoreState = {
      employees,
      schedules,
      attendances,
      config,
    };

    cachedState = fullState;
    lastFetchTime = now;
    return fullState;
  } catch (err) {
    console.error('Error de red al consultar almacenamiento central:', err);
    return (
      cachedState || {
        employees: INITIAL_EMPLOYEES,
        schedules: INITIAL_SCHEDULES,
        attendances: [],
        config: DEFAULT_CONFIG,
      }
    );
  }
}

export async function saveCloudFullState(
  updates: Partial<FullStoreState>
): Promise<FullStoreState> {
  const current = await getCloudFullState();

  const nextState: FullStoreState = {
    employees: updates.employees
      ? updates.employees.filter(
          (e) => e.id !== 'emp-cocina-1' && e.id !== 'emp-salon-1' && e.id !== 'emp-salon-8'
        )
      : current.employees,
    schedules: updates.schedules
      ? updates.schedules.filter(
          (s) =>
            s.employee_id !== 'emp-cocina-1' &&
            s.employee_id !== 'emp-salon-1' &&
            s.employee_id !== 'emp-salon-8'
        )
      : current.schedules,
    attendances: updates.attendances
      ? updates.attendances.filter(
          (a) =>
            a.employee_id !== 'emp-cocina-1' &&
            a.employee_id !== 'emp-salon-1' &&
            a.employee_id !== 'emp-salon-8'
        )
      : current.attendances,
    config: updates.config ? { ...current.config, ...updates.config } : current.config,
  };

  cachedState = nextState;
  lastFetchTime = Date.now();

  if (!GITHUB_TOKEN || !GIST_ID) {
    return nextState;
  }

  const patchFiles: Record<string, { content: string }> = {};

  if (updates.employees) {
    patchFiles['employees.json'] = {
      content: JSON.stringify(nextState.employees, null, 2),
    };
  }
  if (updates.schedules) {
    patchFiles['schedules.json'] = {
      content: JSON.stringify(nextState.schedules, null, 2),
    };
  }
  if (updates.attendances) {
    patchFiles['attendances.json'] = {
      content: JSON.stringify(nextState.attendances, null, 2),
    };
  }
  if (updates.config) {
    patchFiles['config.json'] = {
      content: JSON.stringify(nextState.config, null, 2),
    };
  }

  try {
    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Shimaya-Attendance-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: patchFiles }),
    });
  } catch (err) {
    console.error('Error guardando en almacenamiento central:', err);
  }

  return nextState;
}

// Helpers para compatibilidad
export async function getCloudAttendances(): Promise<Attendance[]> {
  const state = await getCloudFullState();
  return state.attendances;
}

export async function saveCloudAttendance(record: Attendance): Promise<Attendance[]> {
  const state = await getCloudFullState();
  let updatedList: Attendance[] = [];
  const existingIdx = state.attendances.findIndex((a) => a.id === record.id);

  if (existingIdx >= 0) {
    updatedList = [...state.attendances];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...record };
  } else {
    const openIdx = state.attendances.findIndex(
      (a) => a.employee_id === record.employee_id && !a.clock_out && record.clock_out
    );
    if (openIdx >= 0) {
      updatedList = [...state.attendances];
      updatedList[openIdx] = { ...updatedList[openIdx], ...record };
    } else {
      updatedList = [record, ...state.attendances];
    }
  }

  await saveCloudFullState({ attendances: updatedList });
  return updatedList;
}

export async function saveCloudAttendancesList(records: Attendance[]): Promise<Attendance[]> {
  await saveCloudFullState({ attendances: records });
  return records;
}
