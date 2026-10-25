import { Attendance, SystemConfig } from '@/types/database';
import { DEFAULT_CONFIG } from '@/lib/mock-storage';

// Estado global en memoria del servidor Next.js
export let serverAttendances: Attendance[] = [];

export let currentServerConfig: SystemConfig = {
  ...DEFAULT_CONFIG,
  mall_lat: -6.76329,
  mall_lng: -79.86164,
  radius_meters: 250,
  store_location_name: 'Shimaya Ramen - Mall Aventura Chiclayo',
  require_gps: false, // Desactivado por hoy para permitir inicio de jornada sin bloqueos
  require_biometrics: false,
};

export function setServerConfig(newConfig: Partial<SystemConfig>) {
  currentServerConfig = {
    ...currentServerConfig,
    ...newConfig,
  };
}

export function addOrUpdateServerAttendance(record: Attendance) {
  const existingIndex = serverAttendances.findIndex((a) => a.id === record.id);
  if (existingIndex >= 0) {
    serverAttendances[existingIndex] = { ...serverAttendances[existingIndex], ...record };
  } else {
    const openIndex = serverAttendances.findIndex(
      (a) => a.employee_id === record.employee_id && !a.clock_out && record.clock_out
    );
    if (openIndex >= 0) {
      serverAttendances[openIndex] = { ...serverAttendances[openIndex], ...record };
    } else {
      serverAttendances = [record, ...serverAttendances];
    }
  }
}
