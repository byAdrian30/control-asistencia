import { Schedule } from '@/types/database';

/**
 * Calcula los minutos de tardanza comparando la hora de marcación con el horario programado.
 * @param clockInDate Fecha y hora de la marcación (Date)
 * @param schedule Horario asignado para el empleado
 */
export function calculateMinutesLate(
  clockInDate: Date,
  schedule?: Schedule | null
): { minutesLate: number; isLate: boolean; details: string } {
  if (!schedule || !schedule.is_active || !schedule.start_time) {
    return { minutesLate: 0, isLate: false, details: 'Sin horario fijo asignado' };
  }

  // Desglosar la hora de entrada esperada (ej: "09:00" o "09:00:00")
  const [targetHours, targetMinutes] = schedule.start_time.split(':').map(Number);
  const tolerance = schedule.tolerance_minutes ?? 10;

  // Crear fecha objetivo para el mismo día de la marcación
  const expectedTime = new Date(clockInDate);
  expectedTime.setHours(targetHours, targetMinutes, 0, 0);

  // Hora límite con tolerancia
  const limitTime = new Date(expectedTime.getTime() + tolerance * 60 * 1000);

  const diffMs = clockInDate.getTime() - expectedTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (clockInDate > limitTime) {
    const lateMinutes = Math.max(0, diffMinutes);
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
