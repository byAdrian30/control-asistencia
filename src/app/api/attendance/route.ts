import { NextResponse } from 'next/server';
import { Attendance } from '@/types/database';
import {
  serverAttendances,
  addOrUpdateServerAttendance,
  currentServerConfig,
} from '@/lib/server-state';
import { getCloudAttendances, saveCloudAttendance } from '@/lib/cloud-storage';
import {
  getQuincenaRange,
  formatPeruTime,
} from '@/lib/late-calculator';
import { INITIAL_EMPLOYEES } from '@/lib/mock-storage';
import { sendTelegramMessage } from '@/lib/telegram';

export async function GET() {
  const cloudList = await getCloudAttendances();
  const idMap = new Map<string, Attendance>();
  serverAttendances.forEach((a) => idMap.set(a.id, a));
  cloudList.forEach((a) => idMap.set(a.id, a));
  const list = Array.from(idMap.values())
    .filter((a) => {
      // Excluir marcación de Mayleb hoy martes (día de descanso oficial)
      if (a.employee_id === 'emp-cocina-4' && a.clock_in) {
        const d = new Date(a.clock_in).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        if (d === '2026-10-27') return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());

  return NextResponse.json(list, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body) {
      return NextResponse.json({ error: 'Payload vacío' }, { status: 400 });
    }

    // Si es un array de sincronización masiva
    if (Array.isArray(body)) {
      const currentCloud = await getCloudAttendances();
      const idMap = new Map<string, Attendance>();
      currentCloud.forEach((a) => idMap.set(a.id, a));
      serverAttendances.forEach((a) => idMap.set(a.id, a));

      body.forEach((item: Attendance) => {
        if (item && item.id) {
          idMap.set(item.id, item);
          addOrUpdateServerAttendance(item);
        }
      });

      const merged = Array.from(idMap.values()).sort(
        (a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime()
      );

      const { saveCloudAttendancesList } = await import('@/lib/cloud-storage');
      await saveCloudAttendancesList(merged);

      return NextResponse.json({
        success: true,
        count: merged.length,
        attendances: merged,
      });
    }

    const record: Attendance = body;
    if (!record || !record.id) {
      return NextResponse.json({ error: 'Registro inválido' }, { status: 400 });
    }

    // Si se intenta registrar marcación a Mayleb hoy martes, ignorar porque descansa hoy
    if (record.employee_id === 'emp-cocina-4') {
      const d = new Date(record.clock_in).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      if (d === '2026-10-27') {
        return NextResponse.json({ success: true, message: 'Colaborador en descanso hoy' });
      }
    }

    // Guardar en memoria y persistir en la base de datos central en la nube
    addOrUpdateServerAttendance(record);
    const updatedCloudList = await saveCloudAttendance(record);

    // Calcular acumulado de tardanza en la quincena
    const isClockIn = !record.clock_out;
    const quincena = getQuincenaRange(record.clock_in);
    const quincenaStart = new Date(quincena.startIso).getTime();
    const quincenaEnd = new Date(quincena.endIso).getTime();

    let previousMinutes = 0;
    updatedCloudList.forEach((att) => {
      if (att.employee_id === record.employee_id && att.id !== record.id && att.clock_in) {
        const t = new Date(att.clock_in).getTime();
        if (t >= quincenaStart && t <= quincenaEnd) {
          previousMinutes += att.minutes_late || 0;
        }
      }
    });

    const thisPunchLate = record.minutes_late || 0;
    const newTotalMinutes = previousMinutes + thisPunchLate;
    const reachedThreshold = previousMinutes < 10 && newTotalMinutes >= 10;
    const alreadyLostAndLate = previousMinutes >= 10 && thisPunchLate > 0;

    // Si es entrada y superó el límite de 10 minutos en la quincena, DISPARAR ALERTA INMEDIATA A TELEGRAM
    if (isClockIn && (reachedThreshold || alreadyLostAndLate)) {
      const { getCloudFullState } = await import('@/lib/cloud-storage');
      const cloudFull = await getCloudFullState();
      const botToken =
        cloudFull.config?.telegram_bot_token ||
        currentServerConfig.telegram_bot_token ||
        process.env.TELEGRAM_BOT_TOKEN;
      const chatId =
        cloudFull.config?.telegram_chat_id ||
        currentServerConfig.telegram_chat_id ||
        process.env.TELEGRAM_CHAT_ID;
      const storeName =
        cloudFull.config?.store_name ||
        currentServerConfig.store_name ||
        'Shimaya Ramen';

      if (botToken && chatId) {
        const emp =
          cloudFull.employees.find((e) => e.id === record.employee_id) ||
          INITIAL_EMPLOYEES.find((e) => e.id === record.employee_id);
        const empName = emp ? emp.name : 'Colaborador';
        const inTimeStr = formatPeruTime(record.clock_in);

        const alertMessage = 
`🚨 *¡ALERTA URGENTE: PÉRDIDA DE CHIPPU (100%)!* 🚨

📍 *Tienda:* ${storeName}
👤 *Colaborador:* *${empName}*
⏰ *Hora de entrada:* \`${inTimeStr}\`
⚠️ *Tardanza de hoy:* *+${thisPunchLate} minutos*

━━━━━━━━━━━━━━━━━━━━━
📊 *Tardanza acumulada en quincena:* *${newTotalMinutes} minutos*
❌ *Límite máximo permitido:* 10 minutos
🚫 *SANCIÓN:* *HA PERDIDO EL 100% DE SU CHIPPU DE LA QUINCENA*
📅 *Periodo:* ${quincena.label}
━━━━━━━━━━━━━━━━━━━━━

_Aviso automático disparado de inmediato por el Sistema de Asistencia de Shimaya Ramen._`;

        sendTelegramMessage({
          botToken,
          chatId,
          message: alertMessage,
          parseMode: 'Markdown',
        }).catch((err) => console.error('Error enviando alerta de Chippu a Telegram:', err));
      }
    }

    return NextResponse.json({
      success: true,
      count: updatedCloudList.length,
      quincenaTardiness: {
        totalMinutes: newTotalMinutes,
        lostChippu: newTotalMinutes >= 10,
        quincenaLabel: quincena.label,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error procesando marcación';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteEmployeeId = searchParams.get('deleteEmployeeId');
    if (!deleteEmployeeId) {
      return NextResponse.json({ error: 'Falta deleteEmployeeId' }, { status: 400 });
    }

    const { getCloudAttendances, saveCloudAttendancesList } = await import('@/lib/cloud-storage');
    const currentCloud = await getCloudAttendances();
    const filtered = currentCloud.filter((a) => a.employee_id !== deleteEmployeeId);
    await saveCloudAttendancesList(filtered);

    return NextResponse.json({ success: true, count: filtered.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
