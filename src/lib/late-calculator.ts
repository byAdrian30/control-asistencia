import { Schedule } from '@/types/database';

/**
 * Retorna los componentes de fecha y hora en la zona horaria oficial de Perú (America/Lima, UTC-5).
 * Funciona de manera idéntica en servidores Vercel (UTC) y navegadores cliente.
 */
export function getPeruDateTime(dateInput?: Date | string | null): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeek: number;
} {
  const d = dateInput
    ? typeof dateInput === 'string'
      ? new Date(dateInput)
      : dateInput
    : new Date();

  // Usar Intl con zona horaria America/Lima
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  let hours = getPart('hour');
  if (hours === 24) hours = 0;

  // Mapear día de la semana en Lima (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdays[weekdayStr] ?? d.getDay();

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hours,
    minutes: getPart('minute'),
    seconds: getPart('second'),
    dayOfWeek,
  };
}

/**
 * Formatea una fecha o timestamp a formato de hora 12h en hora Perú (ej: "10:15 AM", "11:30 AM")
 */
export function formatPeruTime(dateInput?: Date | string | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formatea una fecha a formato largo en hora Perú (ej: "domingo, 25 de octubre de 2026")
 */
export function formatPeruDate(dateInput?: Date | string | null): string {
  const d = dateInput
    ? typeof dateInput === 'string'
      ? new Date(dateInput)
      : dateInput
    : new Date();
  return d.toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calcula los minutos de tardanza comparando la hora de marcación en hora Perú con el horario programado.
 * @param clockInDate Fecha y hora de la marcación (Date o string ISO)
 * @param schedule Horario asignado para el empleado
 */
export function calculateMinutesLate(
  clockInDate: Date | string,
  schedule?: Schedule | null
): { minutesLate: number; isLate: boolean; details: string } {
  if (!schedule || !schedule.is_active || !schedule.start_time) {
    return { minutesLate: 0, isLate: false, details: 'Sin horario fijo asignado' };
  }

  // Obtener hora y minutos reales en hora Perú (America/Lima)
  const peruTime = getPeruDateTime(clockInDate);
  const actualTotalMinutes = peruTime.hours * 60 + peruTime.minutes;

  // Desglosar la hora de entrada esperada (ej: "11:00" o "11:00:00")
  const [targetHours, targetMinutes] = schedule.start_time.split(':').map(Number);
  const targetTotalMinutes = targetHours * 60 + (targetMinutes || 0);
  const tolerance = schedule.tolerance_minutes ?? 10;
  const limitTotalMinutes = targetTotalMinutes + tolerance;

  if (actualTotalMinutes > limitTotalMinutes) {
    const lateMinutes = actualTotalMinutes - targetTotalMinutes;
    return {
      minutesLate: lateMinutes,
      isLate: true,
      details: `Llegó ${lateMinutes} min tarde (Horario: ${schedule.start_time.slice(0, 5)}, tolerancia: ${tolerance}m)`,
    };
  }

  return {
    minutesLate: 0,
    isLate: false,
    details: `A tiempo (Horario: ${schedule.start_time.slice(0, 5)})`,
  };
}

/**
 * Formato de horas trabajadas entre entrada y salida
 */
export function formatHoursWorked(clockIn: string, clockOut?: string | null): string {
  const start = new Date(clockIn).getTime();
  const end = clockOut ? new Date(clockOut).getTime() : Date.now();
  const diffMinutes = Math.max(0, Math.floor((end - start) / (1000 * 60)));

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
}
