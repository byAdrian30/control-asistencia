/**
 * Identificación y huella digital única del dispositivo móvil
 */

const DEVICE_ID_KEY = 'shimaya_attendance_device_uuid_v1';
const BOUND_EMPLOYEE_KEY = 'shimaya_bound_employee_id_v1';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-env';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = `dev-${crypto.randomUUID()}`;
    } else {
      deviceId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function getStoredBoundEmployeeId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(BOUND_EMPLOYEE_KEY);
}

export function setStoredBoundEmployeeId(employeeId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BOUND_EMPLOYEE_KEY, employeeId);
}

export function clearStoredBoundEmployeeId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BOUND_EMPLOYEE_KEY);
}

/**
 * Detecta un nombre amigable del teléfono (ej: "Apple iPhone 14", "Samsung Galaxy", etc.)
 */
export function getDeviceDescription(): string {
  if (typeof window === 'undefined') return 'Dispositivo Desconocido';
  const ua = navigator.userAgent;

  let model = 'Celular';
  if (/iPhone/i.test(ua)) {
    model = 'Apple iPhone';
  } else if (/iPad/i.test(ua)) {
    model = 'Apple iPad';
  } else if (/Samsung/i.test(ua) || /SM-/i.test(ua)) {
    model = 'Samsung Galaxy';
  } else if (/Xiaomi|Redmi|POCO/i.test(ua)) {
    model = 'Xiaomi / Redmi';
  } else if (/Motorola|Moto/i.test(ua)) {
    model = 'Motorola';
  } else if (/Huawei|HONOR/i.test(ua)) {
    model = 'Huawei';
  } else if (/Pixel/i.test(ua)) {
    model = 'Google Pixel';
  } else if (/Android/i.test(ua)) {
    model = 'Celular Android';
  } else if (/Windows/i.test(ua)) {
    model = 'PC Windows';
  } else if (/Macintosh/i.test(ua)) {
    model = 'Apple Mac';
  }

  let browser = '';
  if (/Chrome/i.test(ua) && !/Edge|OPR/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge/i.test(ua)) browser = 'Edge';

  return `${model} (${browser || 'Navegador'})`;
}
