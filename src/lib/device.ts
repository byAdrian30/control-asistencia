/**
 * Identificación y huella digital única del dispositivo móvil
 * Soporte dual: LocalStorage + Cookies con expiración de 1 año (resistente a iOS Safari y navegadores integrados)
 */

const DEVICE_ID_KEY = 'shimaya_attendance_device_uuid_v1';
const BOUND_EMPLOYEE_KEY = 'shimaya_bound_employee_id_v1';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-env';
  
  let deviceId: string | null = null;
  try {
    deviceId = localStorage.getItem(DEVICE_ID_KEY);
  } catch {}

  if (!deviceId) {
    deviceId = getCookie(DEVICE_ID_KEY);
  }

  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = `dev-${crypto.randomUUID()}`;
    } else {
      deviceId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }

  try {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  } catch {}
  setCookie(DEVICE_ID_KEY, deviceId);

  return deviceId;
}

export function getStoredBoundEmployeeId(): string | null {
  if (typeof window === 'undefined') return null;
  
  let boundId: string | null = null;
  try {
    boundId = localStorage.getItem(BOUND_EMPLOYEE_KEY);
  } catch {}

  if (!boundId) {
    boundId = getCookie(BOUND_EMPLOYEE_KEY);
    if (boundId) {
      try {
        localStorage.setItem(BOUND_EMPLOYEE_KEY, boundId);
      } catch {}
    }
  }

  return boundId;
}

export function setStoredBoundEmployeeId(employeeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BOUND_EMPLOYEE_KEY, employeeId);
  } catch {}
  setCookie(BOUND_EMPLOYEE_KEY, employeeId);
}

export function clearStoredBoundEmployeeId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BOUND_EMPLOYEE_KEY);
  } catch {}
  deleteCookie(BOUND_EMPLOYEE_KEY);
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
