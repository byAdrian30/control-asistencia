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
 * REGLA SHIMAYA: Los minutos de tardanza SIEMPRE se computan si la marcación ocurre después de la hora programada,
 * sin importar si está dentro del margen de cortesía de tolerancia.
 * 
 * Ejemplo: Horario 11:00 AM, entrada 11:04 AM -> 4 minutos de tardanza.
 */
export function calculateMinutesLate(
  clockInDate: Date | string,
  schedule?: Schedule | null
): { minutesLate: number; isLate: boolean; details: string; withinTolerance: boolean } {
  if (!schedule || !schedule.is_active || !schedule.start_time) {
    return {
      minutesLate: 0,
      isLate: false,
      details: 'Sin horario fijo asignado',
      withinTolerance: true,
    };
  }

  // Obtener hora y minutos reales en hora Perú (America/Lima)
  const peruTime = getPeruDateTime(clockInDate);
  const actualTotalMinutes = peruTime.hours * 60 + peruTime.minutes;

  // Desglosar la hora de entrada esperada (ej: "11:00" o "11:00:00")
  const [targetHours, targetMinutes] = schedule.start_time.split(':').map(Number);
  const targetTotalMinutes = targetHours * 60 + (targetMinutes || 0);
  const tolerance = schedule.tolerance_minutes ?? 10;
  const limitTotalMinutes = targetTotalMinutes + tolerance;

  if (actualTotalMinutes > targetTotalMinutes) {
    const lateMinutes = actualTotalMinutes - targetTotalMinutes;
    const isWithinTolerance = actualTotalMinutes <= limitTotalMinutes;
    return {
      minutesLate: lateMinutes,
      isLate: true,
      withinTolerance: isWithinTolerance,
      details: isWithinTolerance
        ? `Llegó +${lateMinutes}m tarde (Dentro de cortesía de ${tolerance}m)`
        : `Llegó +${lateMinutes}m tarde (Excedió cortesía de ${tolerance}m)`,
    };
  }

  return {
    minutesLate: 0,
    isLate: false,
    withinTolerance: true,
    details: `Puntual (Horario: ${schedule.start_time.slice(0, 5)})`,
  };
}

/**
 * Retorna los rangos de la quincena actual en hora oficial de Perú:
 * - 1ra Quincena: Días 1 al 15 del mes.
 * - 2da Quincena: Días 16 al último día del mes.
 */
export interface QuincenaInfo {
  startIso: string;
  endIso: string;
  quincenaNumber: 1 | 2;
  monthName: string;
  year: number;
  label: string;
}

export function getQuincenaRange(dateInput?: Date | string | null): QuincenaInfo {
  const peru = getPeruDateTime(dateInput);
  const isFirstQuincena = peru.day <= 15;
  const quincenaNumber: 1 | 2 = isFirstQuincena ? 1 : 2;

  const startDay = isFirstQuincena ? 1 : 16;
  const endDay = isFirstQuincena ? 15 : new Date(peru.year, peru.month, 0).getDate();

  // En hora Perú (UTC-5):
  const startIso = new Date(Date.UTC(peru.year, peru.month - 1, startDay, 5, 0, 0)).toISOString();
  const endIso = new Date(Date.UTC(peru.year, peru.month - 1, endDay + 1, 4, 59, 59)).toISOString();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const monthName = monthNames[peru.month - 1];
  const label = `${quincenaNumber === 1 ? '1ra' : '2da'} Quincena de ${monthName} ${peru.year}`;

  return {
    startIso,
    endIso,
    quincenaNumber,
    monthName,
    year: peru.year,
    label,
  };
}

/**
 * Calcula los minutos de tardanza acumulados en la quincena para un colaborador
 * y verifica la regla de pérdida del 100% de Chippu al llegar a 10 minutos.
 */
export function calculateQuincenaTardiness(
  employeeId: string,
  attendances: Array<{ employee_id: string; clock_in: string; minutes_late?: number | null }>,
  additionalMinutes: number = 0,
  referenceDate?: Date | string | null
): {
  totalMinutes: number;
  lostChippu: boolean;
  remainingMinutes: number;
  quincenaLabel: string;
} {
  const quincena = getQuincenaRange(referenceDate);
  const startTime = new Date(quincena.startIso).getTime();
  const endTime = new Date(quincena.endIso).getTime();

  let totalMinutes = 0;

  attendances.forEach((att) => {
    if (att.employee_id === employeeId && att.clock_in) {
      const attTime = new Date(att.clock_in).getTime();
      if (attTime >= startTime && attTime <= endTime) {
        totalMinutes += att.minutes_late || 0;
      }
    }
  });

  totalMinutes += additionalMinutes;

  const CHIPPU_LIMIT = 10;
  const lostChippu = totalMinutes >= CHIPPU_LIMIT;
  const remainingMinutes = Math.max(0, CHIPPU_LIMIT - totalMinutes);

  return {
    totalMinutes,
    lostChippu,
    remainingMinutes,
    quincenaLabel: quincena.label,
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
