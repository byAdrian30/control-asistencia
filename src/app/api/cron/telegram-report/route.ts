import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { buildLateReportMessage, sendTelegramMessage } from '@/lib/telegram';
import {
  calculateMinutesLate,
  formatPeruTime,
  formatPeruDate,
  getPeruDateTime,
  getQuincenaRange,
  calculateQuincenaTardiness,
} from '@/lib/late-calculator';
import { Employee, Schedule, Attendance } from '@/types/database';
import { serverAttendances } from '@/lib/server-state';
import { INITIAL_EMPLOYEES, INITIAL_SCHEDULES } from '@/lib/mock-storage';

export async function GET(req: NextRequest) {
  return handleTelegramReport(req);
}

export async function POST(req: NextRequest) {
  return handleTelegramReport(req);
}

async function handleTelegramReport(req: NextRequest) {
  try {
    let bodyData: { botToken?: string; chatId?: string; storeName?: string } = {};
    if (req.method === 'POST') {
      try {
        bodyData = await req.json();
      } catch {
        bodyData = {};
      }
    }

    const botToken = bodyData.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = bodyData.chatId || process.env.TELEGRAM_CHAT_ID;
    const storeName = bodyData.storeName || process.env.STORE_NAME || 'Tienda Principal';

    if (!botToken || !chatId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan credenciales de Telegram (TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID).',
        },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const now = new Date();
    const peruNow = getPeruDateTime(now);
    const dateStr = formatPeruDate(now);
    const quincena = getQuincenaRange(now);

    // Rango de hoy en hora Perú (America/Lima) convertido a UTC
    const todayStart = new Date(Date.UTC(peruNow.year, peruNow.month - 1, peruNow.day, 5, 0, 0)).toISOString();
    const todayEnd = new Date(Date.UTC(peruNow.year, peruNow.month - 1, peruNow.day + 1, 4, 59, 59)).toISOString();

    let lateRecords: Array<{
      name: string;
      clockInTime: string;
      expectedTime: string;
      minutesLate: number;
      quincenaTotalMinutes?: number;
      lostChippu?: boolean;
    }> = [];
    let onTimeCount = 0;
    let totalPresent = 0;
    const currentDayOfWeek = peruNow.dayOfWeek;

    if (supabase) {
      // 1. Obtener empleados
      const { data: employees } = await supabase.from('employees').select('*').eq('active', true);
      const employeeMap = new Map<string, Employee>();
      (employees || []).forEach((e: Employee) => employeeMap.set(e.id, e));

      // 2. Obtener horarios del día de la semana actual en Perú
      const { data: schedules } = await supabase
        .from('schedules')
        .select('*')
        .eq('day_of_week', currentDayOfWeek)
        .eq('is_active', true);
      const scheduleMap = new Map<string, Schedule>();
      (schedules || []).forEach((s: Schedule) => scheduleMap.set(s.employee_id, s));

      // 3. Obtener asistencias de hoy
      const { data: attendances } = await supabase
        .from('attendance')
        .select('*')
        .gte('clock_in', todayStart)
        .lte('clock_in', todayEnd);

      const records = (attendances || []) as Attendance[];
      totalPresent = records.length;

      records.forEach((att) => {
        const emp = employeeMap.get(att.employee_id);
        const empName = emp ? emp.name : 'Colaborador';
        const sch = scheduleMap.get(att.employee_id);
        const timeStr = formatPeruTime(att.clock_in);

        let lateMin = 0;
        let expectedStr = sch?.start_time ? sch.start_time.slice(0, 5) : 'Sin horario';

        if (sch) {
          const calc = calculateMinutesLate(att.clock_in, sch);
          lateMin = calc.minutesLate;
        }

        if (lateMin > 0) {
          const qCalc = calculateQuincenaTardiness(att.employee_id, records, 0, att.clock_in);
          lateRecords.push({
            name: empName,
            clockInTime: timeStr,
            expectedTime: expectedStr,
            minutesLate: lateMin,
            quincenaTotalMinutes: qCalc.totalMinutes,
            lostChippu: qCalc.lostChippu,
          });
        } else {
          onTimeCount++;
        }
      });
    } else {
      // Usar marcaciones reales almacenadas en la memoria central del servidor
      const employeeMap = new Map<string, Employee>();
      INITIAL_EMPLOYEES.forEach((e) => employeeMap.set(e.id, e));

      const scheduleMap = new Map<string, Schedule>();
      INITIAL_SCHEDULES.filter((s) => s.day_of_week === currentDayOfWeek && s.is_active).forEach((s) =>
        scheduleMap.set(s.employee_id, s)
      );

      totalPresent = serverAttendances.length;

      serverAttendances.forEach((att) => {
        const emp = employeeMap.get(att.employee_id);
        const empName = emp ? emp.name : 'Colaborador';
        const sch = scheduleMap.get(att.employee_id);
        const timeStr = formatPeruTime(att.clock_in);

        let lateMin = 0;
        let expectedStr = sch?.start_time ? sch.start_time.slice(0, 5) : 'Sin horario';
        if (sch) {
          const calc = calculateMinutesLate(att.clock_in, sch);
          lateMin = calc.minutesLate;
        }

        if (lateMin > 0) {
          const qCalc = calculateQuincenaTardiness(att.employee_id, serverAttendances, 0, att.clock_in);
          lateRecords.push({
            name: empName,
            clockInTime: timeStr,
            expectedTime: expectedStr,
            minutesLate: lateMin,
            quincenaTotalMinutes: qCalc.totalMinutes,
            lostChippu: qCalc.lostChippu,
          });
        } else {
          onTimeCount++;
        }
      });
    }

    // 4. Construir y enviar mensaje Telegram
    const message = buildLateReportMessage({
      storeName,
      dateStr,
      quincenaLabel: quincena.label,
      lateRecords,
      onTimeCount,
      totalPresent,
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
      message: 'Notificación de tardanzas enviada con éxito a Telegram.',
      data: {
        totalPresent,
        lateCount: lateRecords.length,
        onTimeCount,
        lateRecords,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
