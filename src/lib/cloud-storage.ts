import { Attendance, SystemConfig } from '@/types/database';

const GITHUB_TOKEN =
  process.env.GITHUB_STORAGE_TOKEN ||
  process.env.GITHUB_TOKEN ||
  '';

const GIST_ID =
  process.env.GITHUB_GIST_ID ||
  'cc4c33e9f80554e83bebe736702f331b';

// Cache en memoria para evitar saturar el rate limit de GitHub
let cachedAttendances: Attendance[] | null = null;
let lastAttendancesFetchTime = 0;
const CACHE_TTL_MS = 3000; // 3 segundos de caché para lecturas rápidas

/**
 * Obtiene todas las marcaciones almacenadas en la base de datos central en la nube (GitHub Gist)
 */
export async function getCloudAttendances(): Promise<Attendance[]> {
  const now = Date.now();
  if (cachedAttendances && now - lastAttendancesFetchTime < CACHE_TTL_MS) {
    return cachedAttendances;
  }

  if (!GITHUB_TOKEN || !GIST_ID) {
    return cachedAttendances || [];
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
      return cachedAttendances || [];
    }

    const data = await res.json();
    const content = data.files?.['attendances.json']?.content;
    if (content) {
      const parsed: Attendance[] = JSON.parse(content);
      if (Array.isArray(parsed)) {
        cachedAttendances = parsed;
        lastAttendancesFetchTime = now;
        return parsed;
      }
    }
    return cachedAttendances || [];
  } catch (err) {
    console.error('Error de red al consultar almacenamiento central:', err);
    return cachedAttendances || [];
  }
}

/**
 * Guarda o actualiza una marcación en la base de datos central en la nube (GitHub Gist)
 */
export async function saveCloudAttendance(record: Attendance): Promise<Attendance[]> {
  const current = await getCloudAttendances();

  let updatedList: Attendance[] = [];
  const existingIdx = current.findIndex((a) => a.id === record.id);

  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...record };
  } else {
    // Si es un checkout sin id previo pero existe una marcación abierta
    const openIdx = current.findIndex(
      (a) => a.employee_id === record.employee_id && !a.clock_out && record.clock_out
    );
    if (openIdx >= 0) {
      updatedList = [...current];
      updatedList[openIdx] = { ...updatedList[openIdx], ...record };
    } else {
      updatedList = [record, ...current];
    }
  }

  // Actualizar caché en memoria inmediatamente
  cachedAttendances = updatedList;
  lastAttendancesFetchTime = Date.now();

  if (!GITHUB_TOKEN || !GIST_ID) {
    return updatedList;
  }

  try {
    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Shimaya-Attendance-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          'attendances.json': {
            content: JSON.stringify(updatedList, null, 2),
          },
        },
      }),
    });
  } catch (err) {
    console.error('Error guardando en almacenamiento central:', err);
  }

  return updatedList;
}
