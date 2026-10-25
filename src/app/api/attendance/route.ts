import { NextResponse } from 'next/server';
import { Attendance } from '@/types/database';
import {
  serverAttendances,
  addOrUpdateServerAttendance,
  currentServerConfig,
} from '@/lib/server-state';
import {
  getQuincenaRange,
  formatPeruTime,
} from '@/lib/late-calculator';
import { INITIAL_EMPLOYEES } from '@/lib/mock-storage';
import { sendTelegramMessage } from '@/lib/telegram';

export async function GET() {
  return NextResponse.json(serverAttendances, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function POST(req: Request) {
  try {
    const record: Attendance = await req.json();
    if (!record || !record.id) {
      return NextResponse.json({ error: 'Registro inválido' }, { status: 400 });
    }

    // Calcular acumulado de tardanza en la quincena antes de guardar este registro
    const isClockIn = !record.clock_out;
    const quincena = getQuincenaRange(record.clock_in);
    const quincenaStart = new Date(quincena.startIso).getTime();
    const quincenaEnd = new Date(quincena.endIso).getTime();

    let previousMinutes = 0;
    serverAttendances.forEach((att) => {
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

    // Guardar en el almacén del servidor
    addOrUpdateServerAttendance(record);

    // Si es entrada y superó el límite de 10 minutos en la quincena, DISPARAR ALERTA INMEDIATA A TELEGRAM
    if (isClockIn && (reachedThreshold || alreadyLostAndLate)) {
      const botToken = currentServerConfig.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = currentServerConfig.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
      const storeName = currentServerConfig.store_name || 'Shimaya Ramen';

      if (botToken && chatId) {
        const emp = INITIAL_EMPLOYEES.find((e) => e.id === record.employee_id);
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

        // Enviar asíncronamente
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
      count: serverAttendances.length,
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
