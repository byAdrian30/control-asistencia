import { Employee, Schedule, Attendance, SystemConfig } from '@/types/database';
import { INITIAL_EMPLOYEES, INITIAL_SCHEDULES, DEFAULT_CONFIG } from '@/lib/mock-storage';
import { getServiceSupabase } from '@/lib/supabase';

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
    const isExclId = (id: string) => id === 'emp-cocina-1' || id === 'emp-salon-1' || id === 'emp-salon-8';
    employees = employees.filter((e) => !isExclId(e.id) && !e.name?.toLowerCase().includes('raquel'));
    schedules = schedules.filter((s) => !isExclId(s.employee_id));
    attendances = attendances.filter((a) => !isExclId(a.employee_id));

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

  const isExclId = (id: string) => id === 'emp-cocina-1' || id === 'emp-salon-1' || id === 'emp-salon-8';

  const nextState: FullStoreState = {
    employees: updates.employees
      ? updates.employees.filter((e) => !isExclId(e.id) && !e.name?.toLowerCase().includes('raquel'))
      : current.employees.filter((e) => !isExclId(e.id) && !e.name?.toLowerCase().includes('raquel')),
    schedules: updates.schedules
      ? updates.schedules.filter((s) => !isExclId(s.employee_id))
      : current.schedules.filter((s) => !isExclId(s.employee_id)),
    attendances: updates.attendances
      ? updates.attendances.filter((a) => !isExclId(a.employee_id))
      : current.attendances.filter((a) => !isExclId(a.employee_id)),
    config: updates.config ? { ...current.config, ...updates.config } : current.config,
  };

  cachedState = nextState;
  lastFetchTime = Date.now();

  // Sincronización automática de réplica a Supabase PostgreSQL
  try {
    const sb = getServiceSupabase();
    if (sb) {
      if (updates.employees && updates.employees.length > 0) {
        const empRows = nextState.employees.map((e) => ({
          id: e.id,
          slug: e.slug || null,
          name: e.name,
          code: e.code || '',
          has_custom_pin: !!e.has_custom_pin,
          role: e.role || 'Colaborador',
          area: e.area || 'Salón',
          avatar_color: e.avatar_color || '#3b82f6',
          active: e.active !== false,
          registered_device_id: e.registered_device_id || null,
          registered_device_name: e.registered_device_name || null,
          registered_device_at: e.registered_device_at || null,
        }));
        await sb.from('employees').upsert(empRows, { onConflict: 'id' });
      }

      if (updates.schedules && updates.schedules.length > 0) {
        const schRows = nextState.schedules.map((s) => ({
          id: s.id,
          employee_id: s.employee_id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          tolerance_minutes: s.tolerance_minutes || 10,
          is_active: s.is_active !== false,
        }));
        await sb.from('schedules').upsert(schRows, { onConflict: 'id' });
      }

      if (updates.attendances && updates.attendances.length > 0) {
        const attRows = nextState.attendances.map((a) => ({
          id: a.id,
          employee_id: a.employee_id,
          clock_in: a.clock_in,
          clock_out: a.clock_out || null,
          auto_closed: !!a.auto_closed,
          minutes_late: a.minutes_late || 0,
          notes: a.notes || null,
          clock_in_lat: a.clock_in_lat ?? null,
          clock_in_lng: a.clock_in_lng ?? null,
          clock_in_distance_meters: a.clock_in_distance_meters ?? null,
          clock_out_lat: a.clock_out_lat ?? null,
          clock_out_lng: a.clock_out_lng ?? null,
          device_id: a.device_id || null,
          device_name: a.device_name || null,
          verified_by_gps: a.verified_by_gps !== false,
          verified_by_device: a.verified_by_device !== false,
          verified_by_biometrics: !!a.verified_by_biometrics,
        }));
        await sb.from('attendance').upsert(attRows, { onConflict: 'id' });
      }
    }
  } catch (sbErr) {
    console.error('Error sincronizando con Supabase:', sbErr);
  }

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
