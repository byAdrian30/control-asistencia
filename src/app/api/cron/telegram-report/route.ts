import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import {
  buildLateReportMessage,
  sendTelegramMessage,
  TelegramLateRecord,
  TelegramOnTimeRecord,
  TelegramPendingRecord,
  TelegramRestDayRecord,
} from '@/lib/telegram';
import {
  calculateMinutesLate,
  formatPeruTime,
  formatPeruDate,
  getPeruDateTime,
  getQuincenaRange,
  calculateQuincenaTardiness,
} from '@/lib/late-calculator';
import { Employee, Schedule, Attendance } from '@/types/database';
import {
  serverAttendances,
  currentServerConfig,
  addOrUpdateServerAttendance,
} from '@/lib/server-state';
import { getCloudAttendances } from '@/lib/cloud-storage';
import { INITIAL_EMPLOYEES, INITIAL_SCHEDULES } from '@/lib/mock-storage';

export async function GET(req: NextRequest) {
  return handleTelegramReport(req);
}

export async function POST(req: NextRequest) {
  return handleTelegramReport(req);
}

async function handleTelegramReport(req: NextRequest) {
  try {
    let bodyData: {
      botToken?: string;
      chatId?: string;
      storeName?: string;
      attendances?: Attendance[];
    } = {};

    if (req.method === 'POST') {
      try {
        bodyData = await req.json();
      } catch {
        bodyData = {};
      }
    }

    // Si el cliente envió marcaciones en el POST, integrarlas a la memoria central del servidor
    if (Array.isArray(bodyData.attendances)) {
      bodyData.attendances.forEach((att: Attendance) => {
        addOrUpdateServerAttendance(att);
      });
    }

    const botToken =
      bodyData.botToken ||
      currentServerConfig.telegram_bot_token ||
      process.env.TELEGRAM_BOT_TOKEN;

    const chatId =
      bodyData.chatId ||
      currentServerConfig.telegram_chat_id ||
      process.env.TELEGRAM_CHAT_ID;

    const storeName =
      bodyData.storeName ||
      currentServerConfig.store_name ||
      process.env.STORE_NAME ||
      'Shimaya Ramen - Mall Aventura Chiclayo';

    if (!botToken || !chatId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Faltan credenciales de Telegram (TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID). Configúralas en el Panel Admin o en Vercel.',
        },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const now = new Date();
    const peruNow = getPeruDateTime(now);
    const dateStr = formatPeruDate(now);
    const quincena = getQuincenaRange(now);
    const currentDayOfWeek = peruNow.dayOfWeek;

    // Rango de hoy en hora Perú (America/Lima) convertido a UTC
    const todayStart = new Date(Date.UTC(peruNow.year, peruNow.month - 1, peruNow.day, 5, 0, 0)).toISOString();
    const todayEnd = new Date(Date.UTC(peruNow.year, peruNow.month - 1, peruNow.day + 1, 4, 59, 59)).toISOString();
    const todayStartTime = new Date(todayStart).getTime();
    const todayEndTime = new Date(todayEnd).getTime();

    const isToday = (iso?: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= todayStartTime && t <= todayEndTime;
    };

    // 1. Obtener todos los colaboradores activos (16 de Cocina y Salón, excluyendo a Adrian, Alexander y Raquel)
    let allEmployees: Employee[] = INITIAL_EMPLOYEES.filter(
      (e) => e.id !== 'emp-cocina-1' && e.id !== 'emp-salon-1' && e.id !== 'emp-salon-8'
    );
    if (supabase) {
      const { data: emps } = await supabase.from('employees').select('*').eq('active', true);
      if (emps && emps.length > 0) {
        allEmployees = emps.filter(
          (e: Employee) =>
            e.id !== 'emp-cocina-1' && e.id !== 'emp-salon-1' && e.id !== 'emp-salon-8'
        );
      }
    }

    // 2. Obtener horarios correspondientes al día de hoy según la malla horaria oficial
    let todaySchedules: Schedule[] = INITIAL_SCHEDULES.filter(
      (s) =>
        s.day_of_week === currentDayOfWeek &&
        s.is_active &&
        s.employee_id !== 'emp-cocina-1' &&
        s.employee_id !== 'emp-salon-1' &&
        s.employee_id !== 'emp-salon-8'
    );
    if (supabase) {
      const { data: schs } = await supabase
        .from('schedules')
        .select('*')
        .eq('day_of_week', currentDayOfWeek)
        .eq('is_active', true);
      if (schs && schs.length > 0) {
        todaySchedules = schs.filter(
          (s: Schedule) =>
            s.employee_id !== 'emp-cocina-1' &&
            s.employee_id !== 'emp-salon-1' &&
            s.employee_id !== 'emp-salon-8'
        );
      }
    }

    const scheduleMap = new Map<string, Schedule>();
    todaySchedules.forEach((s) => scheduleMap.set(s.employee_id, s));

    // 3. Obtener todas las marcaciones del almacenamiento central en la nube
    const cloudAtts = await getCloudAttendances();
    const idMap = new Map<string, Attendance>();
    serverAttendances.forEach((a) => idMap.set(a.id, a));
    cloudAtts.forEach((a) => idMap.set(a.id, a));

    if (supabase) {
      const { data: dbAtts } = await supabase
        .from('attendance')
        .select('*')
        .gte('clock_in', todayStart)
        .lte('clock_in', todayEnd);
      if (dbAtts && dbAtts.length > 0) {
        dbAtts.forEach((att: Attendance) => idMap.set(att.id, att));
      }
    }

    const allAttendances: Attendance[] = Array.from(idMap.values());

    // Marcaciones de hoy
    const todayAttendances = allAttendances.filter((a) => isToday(a.clock_in));

    // 4. Clasificar a cada uno de los 19 colaboradores
    const lateRecords: TelegramLateRecord[] = [];
    const onTimeRecords: TelegramOnTimeRecord[] = [];
    const missingRecords: TelegramPendingRecord[] = [];
    const afternoonRecords: TelegramPendingRecord[] = [];
    const restDayRecords: TelegramRestDayRecord[] = [];

    allEmployees.forEach((emp) => {
      const sch = scheduleMap.get(emp.id);

      // Si no tiene horario programado para hoy en la malla -> Está de descanso
      if (!sch || !sch.is_active) {
        restDayRecords.push({
          name: emp.name,
          area: emp.area,
          role: emp.role,
        });
        return;
      }

      // Buscar si ya marcó ingreso hoy
      const empTodayAtts = todayAttendances
        .filter((a) => a.employee_id === emp.id && isToday(a.clock_in))
        .sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());

      const att = empTodayAtts[0];

      if (att) {
        // Marcó ingreso
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
        // NO ha marcado aún hoy
        const [startH, startM] = (sch.start_time || '11:00').split(':').map(Number);
        const startTotalMinutes = (startH || 0) * 60 + (startM || 0);

        // Turno de la mañana / mediodía: 12:00 PM = 720 minutos
        if (startTotalMinutes <= 720) {
          missingRecords.push({
            name: emp.name,
            expectedTime: sch.start_time ? sch.start_time.slice(0, 5) : '11:00',
            area: emp.area,
            role: emp.role,
          });
        } else {
          // Turno de la tarde (13:45, 14:00, 15:00): aún no le correspondía marcar a las 12 PM
          afternoonRecords.push({
            name: emp.name,
            expectedTime: sch.start_time ? sch.start_time.slice(0, 5) : '15:00',
            area: emp.area,
            role: emp.role,
          });
        }
      }
    });

    const totalPresent = onTimeRecords.length + lateRecords.length;
    const onTimeCount = onTimeRecords.length;

    // 5. Construir y enviar mensaje Telegram
    const message = buildLateReportMessage({
      storeName,
      dateStr,
      quincenaLabel: quincena.label,
      lateRecords,
      onTimeRecords,
      onTimeCount,
      totalPresent,
      missingRecords,
      afternoonRecords,
      restDayRecords,
      totalEmployees: allEmployees.length,
    });

    const telegramRes = await sendTelegramMessage({
      botToken,
      chatId,
      message,
      parseMode: 'Markdown',
    });

    if (!telegramRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: telegramRes.error,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reporte del mediodía enviado con éxito a Telegram.',
      data: {
        totalEmployees: allEmployees.length,
        totalPresent,
        onTimeCount,
        lateCount: lateRecords.length,
        missingCount: missingRecords.length,
        afternoonCount: afternoonRecords.length,
        restDayCount: restDayRecords.length,
        missingRecords,
        lateRecords,
        onTimeRecords,
        afternoonRecords,
        restDayRecords,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
