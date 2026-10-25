import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { buildLateReportMessage, sendTelegramMessage } from '@/lib/telegram';
import { calculateMinutesLate } from '@/lib/late-calculator';
import { Employee, Schedule, Attendance } from '@/types/database';

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
    // Inicio del día local (hoy a las 00:00:00)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const dateStr = now.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let lateRecords: Array<{
      name: string;
      clockInTime: string;
      expectedTime: string;
      minutesLate: number;
    }> = [];
    let onTimeCount = 0;
    let totalPresent = 0;

    if (supabase) {
      // 1. Obtener empleados
      const { data: employees } = await supabase.from('employees').select('*').eq('active', true);
      const employeeMap = new Map<string, Employee>();
      (employees || []).forEach((e: Employee) => employeeMap.set(e.id, e));

      // 2. Obtener horarios del día de la semana actual
      const currentDayOfWeek = now.getDay();
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
        const clockInDate = new Date(att.clock_in);
        const timeStr = clockInDate.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        // Si ya tiene minutes_late registrado en base de datos o lo calculamos
        let lateMin = att.minutes_late;
        let expectedStr = sch?.start_time ? sch.start_time.slice(0, 5) : 'Sin horario';

        if (lateMin === 0 && sch) {
          const calc = calculateMinutesLate(clockInDate, sch);
          lateMin = calc.minutesLate;
        }

        if (lateMin > 0) {
          lateRecords.push({
            name: empName,
            clockInTime: timeStr,
            expectedTime: expectedStr,
            minutesLate: lateMin,
          });
        } else {
          onTimeCount++;
        }
      });
    } else {
      // Datos de ejemplo para prueba si Supabase no está conectado todavía
      lateRecords = [
        {
          name: 'Mateo Salazar',
          clockInTime: '10:24 AM',
          expectedTime: '10:00 AM',
          minutesLate: 24,
        },
      ];
      onTimeCount = 3;
      totalPresent = 4;
    }

    // 4. Construir y enviar mensaje Telegram
    const message = buildLateReportMessage({
      storeName,
      dateStr,
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
