import { getServiceSupabase } from '@/lib/supabase';
import { getCloudFullState } from '@/lib/cloud-storage';
import { INITIAL_EMPLOYEES, INITIAL_SCHEDULES } from '@/lib/mock-storage';
import { Employee, Schedule, Attendance } from '@/types/database';
import {
  calculateMinutesLate,
  formatPeruTime,
  formatPeruDate,
  getPeruDateTime,
  calculateQuincenaTardiness,
} from '@/lib/late-calculator';
import {
  buildLateReportMessage,
  getDefaultTelegramButtons,
  TelegramLateRecord,
  TelegramOnTimeRecord,
  TelegramPendingRecord,
  TelegramRestDayRecord,
  TelegramInlineKeyboard,
} from '@/lib/telegram';

export interface GenerateReportResult {
  text: string;
  keyboard: TelegramInlineKeyboard;
  stats: {
    totalEmployees: number;
    totalPresent: number;
    onTimeCount: number;
    lateCount: number;
    missingCount: number;
    restDayCount: number;
  };
}

/**
 * Genera el reporte de asistencia completo para cualquier fecha (o para hoy en vivo)
 * @param targetDateStr Fecha en formato YYYY-MM-DD (hora de Perú). Si se omite, toma la fecha de hoy.
 * @param isLive Indica si es una consulta en tiempo real en vivo.
 */
export async function generateAttendanceReport(
  targetDateStr?: string,
  isLive = false
): Promise<GenerateReportResult> {
  const now = new Date();
  const currentPeruDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const selectedDateStr = targetDateStr || currentPeruDateStr;
  const isToday = selectedDateStr === currentPeruDateStr;

  // Fecha de referencia para cálculos de día de la semana
  const [y, m, d] = selectedDateStr.split('-').map(Number);
  const refDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // Mediodía UTC para evitar desfases
  const dayOfWeek = refDate.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

  const formattedDateTitle = refDate.toLocaleDateString('es-PE', {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const cloudState = await getCloudFullState();
  const supabase = getServiceSupabase();

  // 1. Obtener colaboradores (16 oficiales, sin Adrian, Alexander ni Raquel)
  const isExclId = (id: string, name?: string) =>
    id === 'emp-cocina-1' ||
    id === 'emp-salon-1' ||
    id === 'emp-salon-8' ||
    (name && name.toLowerCase().includes('raquel'));

  let allEmployees: Employee[] = (
    cloudState.employees && cloudState.employees.length > 0 ? cloudState.employees : INITIAL_EMPLOYEES
  ).filter((e) => !isExclId(e.id, e.name) && e.active !== false);

  if (supabase) {
    const { data: emps } = await supabase.from('employees').select('*').eq('active', true);
    if (emps && emps.length > 0) {
      allEmployees = emps.filter((e: Employee) => !isExclId(e.id, e.name));
    }
  }

  // 2. Obtener horarios correspondientes al día de la semana seleccionado
  let schedulesForDay: Schedule[] = (
    cloudState.schedules && cloudState.schedules.length > 0 ? cloudState.schedules : INITIAL_SCHEDULES
  ).filter((s) => s.day_of_week === dayOfWeek && s.is_active && !isExclId(s.employee_id));

  if (supabase) {
    const { data: schs } = await supabase
      .from('schedules')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);
    if (schs && schs.length > 0) {
      schedulesForDay = schs.filter((s: Schedule) => !isExclId(s.employee_id));
    }
  }

  const scheduleMap = new Map<string, Schedule>();
  schedulesForDay.forEach((s) => scheduleMap.set(s.employee_id, s));

  // 3. Obtener marcaciones para la fecha indicada
  let allAttendances: Attendance[] = cloudState.attendances || [];
  if (supabase) {
    const { data: dbAtts } = await supabase.from('attendance').select('*').limit(600);
    if (dbAtts && dbAtts.length > 0) {
      const mergedMap = new Map<string, Attendance>();
      allAttendances.forEach((a) => mergedMap.set(a.id, a));
      dbAtts.forEach((a) => mergedMap.set(a.id, a));
      allAttendances = Array.from(mergedMap.values());
    }
  }

  // Filtrar marcaciones del día seleccionado
  const dateAttendances = allAttendances.filter((a) => {
    if (!a.clock_in) return false;
    const aDateStr = new Date(a.clock_in).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    return aDateStr === selectedDateStr;
  });

  // Hora actual en Perú para saber si ya pasó la hora de entrada
  const currentPeruHourMinute = now.toLocaleTimeString('en-US', {
    timeZone: 'America/Lima',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const [curH, curM] = currentPeruHourMinute.split(':').map(Number);
  const curTotalMinutes = (curH || 0) * 60 + (curM || 0);

  const lateRecords: TelegramLateRecord[] = [];
  const onTimeRecords: TelegramOnTimeRecord[] = [];
  const missingRecords: TelegramPendingRecord[] = [];
  const afternoonRecords: TelegramPendingRecord[] = [];
  const restDayRecords: TelegramRestDayRecord[] = [];

  allEmployees.forEach((emp) => {
    const sch = scheduleMap.get(emp.id);

    // En descanso
    if (!sch || !sch.is_active) {
      restDayRecords.push({
        name: emp.name,
        area: emp.area,
        role: emp.role,
      });
      return;
    }

    // Buscar marcación de entrada
    const empPunches = dateAttendances
      .filter((a) => a.employee_id === emp.id)
      .sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());

    const att = empPunches[0];

    if (att) {
      const timeStr = formatPeruTime(att.clock_in);
      const expectedStr = sch.start_time ? sch.start_time.slice(0, 5) : '11:00';
      const calc = calculateMinutesLate(att.clock_in, sch);
      const lateMin = calc.minutesLate;

      if (lateMin > 0) {
        const qCalc = calculateQuincenaTardiness(emp.id, allAttendances, 0, att.clock_in);
        lateRecords.push({
          name: emp.name,
          clockInTime: timeStr,
          expectedTime: expectedStr,
          minutesLate: lateMin,
          quincenaTotalMinutes: qCalc.totalMinutes,
          lostChippu: qCalc.lostChippu,
          area: emp.area,
        });
      } else {
        onTimeRecords.push({
          name: emp.name,
          clockInTime: timeStr,
          expectedTime: expectedStr,
          area: emp.area,
        });
      }
    } else {
      // No ha marcado
      const [startH, startM] = (sch.start_time || '11:00').split(':').map(Number);
      const startTotalMinutes = (startH || 0) * 60 + (startM || 0);

      // Si es hoy y aún no es la hora de entrada programada (y no son más de las 5:30 PM)
      if (isToday && curTotalMinutes < startTotalMinutes && curTotalMinutes < 1050) {
        afternoonRecords.push({
          name: emp.name,
          expectedTime: sch.start_time ? sch.start_time.slice(0, 5) : '15:00',
          area: emp.area,
          role: emp.role,
        });
      } else {
        // Ya pasó su hora de entrada o es un reporte histórico/de las 5:30 PM -> Falta sin marcar
        missingRecords.push({
          name: emp.name,
          expectedTime: sch.start_time ? sch.start_time.slice(0, 5) : '11:00',
          area: emp.area,
          role: emp.role,
        });
      }
    }
  });

  const totalPresent = onTimeRecords.length + lateRecords.length;

  // Determinar título del reporte
  let reportTitle = '🏪 *REPORTE DIARIO DE ASISTENCIA - 5:30 PM*';
  if (isLive) {
    const liveTimeStr = now.toLocaleTimeString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    reportTitle = `🔄 *ESTATUS DE ASISTENCIA EN VIVO (${liveTimeStr})*`;
  } else if (!isToday) {
    reportTitle = `📅 *REPORTE HISTÓRICO DE ASISTENCIA*`;
  }

  const text = buildLateReportMessage({
    storeName: cloudState.config?.store_name || 'Shimaya Ramen - Mall Aventura Chiclayo',
    dateStr: formattedDateTitle,
    reportTitle,
    lateRecords,
    onTimeRecords,
    onTimeCount: onTimeRecords.length,
    totalPresent,
    missingRecords,
    afternoonRecords,
    restDayRecords,
    totalEmployees: allEmployees.length,
  });

  return {
    text,
    keyboard: getDefaultTelegramButtons(),
    stats: {
      totalEmployees: allEmployees.length,
      totalPresent,
      onTimeCount: onTimeRecords.length,
      lateCount: lateRecords.length,
      missingCount: missingRecords.length,
      restDayCount: restDayRecords.length,
    },
  };
}
