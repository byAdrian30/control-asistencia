import { NextRequest, NextResponse } from 'next/server';
import {
  sendTelegramMessage,
  answerCallbackQuery,
  getDefaultTelegramButtons,
  TelegramInlineKeyboard,
} from '@/lib/telegram';
import { generateAttendanceReport } from '@/lib/attendance-reporter';
import { getCloudFullState } from '@/lib/cloud-storage';
import { currentServerConfig } from '@/lib/server-state';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    message: 'Telegram Webhook de Asistencia Shimaya Ramen está activo 24/7 en Vercel.',
  });
}

export async function POST(req: NextRequest) {
  try {
    const cloudFullState = await getCloudFullState();
    const botToken =
      cloudFullState.config?.telegram_bot_token ||
      currentServerConfig.telegram_bot_token ||
      process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN no configurado' }, { status: 500 });
    }

    const body = await req.json();

    // 1. MANEJO DE CLIC EN BOTONES INTERACTIVOS (CALLBACK QUERY)
    if (body.callback_query) {
      const cq = body.callback_query;
      const callbackId = cq.id;
      const data: string = cq.data || '';
      const chatId = cq.message?.chat?.id || process.env.TELEGRAM_CHAT_ID;

      // Responder de inmediato al callback para quitar el spinner en Telegram
      await answerCallbackQuery({ botToken, callbackQueryId: callbackId });

      if (data === 'status_now') {
        // Consultar estatus en vivo ahora mismo
        const { text, keyboard } = await generateAttendanceReport(undefined, true);
        await sendTelegramMessage({
          botToken,
          chatId,
          message: text,
          parseMode: 'Markdown',
          replyMarkup: keyboard,
        });
      } else if (data === 'menu_dates') {
        // Mostrar menú con los últimos 5 días
        const dateButtonsKeyboard = buildDateSelectionKeyboard();
        await sendTelegramMessage({
          botToken,
          chatId,
          message: '📅 *CONSULTA DE REPORTES ANTERIORES*\n\nSelecciona el día que deseas revisar:',
          parseMode: 'Markdown',
          replyMarkup: dateButtonsKeyboard,
        });
      } else if (data.startsWith('report_date_')) {
        const targetDate = data.replace('report_date_', '');
        const { text } = await generateAttendanceReport(targetDate, false);

        const customKeyboard: TelegramInlineKeyboard = {
          inline_keyboard: [
            [
              { text: '📅 Elegir Otra Fecha', callback_data: 'menu_dates' },
              { text: '🔄 Estatus en Vivo de Hoy', callback_data: 'status_now' },
            ],
            [
              { text: '🌐 Abrir App de Asistencia', url: 'https://asistencia-tienda.vercel.app' },
            ],
          ],
        };

        await sendTelegramMessage({
          botToken,
          chatId,
          message: text,
          parseMode: 'Markdown',
          replyMarkup: customKeyboard,
        });
      }

      return NextResponse.json({ ok: true });
    }

    // 2. MANEJO DE MENSAJES DE TEXTO O COMANDOS
    if (body.message) {
      const msg = body.message;
      const chatId = msg.chat?.id || process.env.TELEGRAM_CHAT_ID;
      const text: string = (msg.text || '').trim().toLowerCase();

      if (
        text === '/start' ||
        text === '/menu' ||
        text === '/status' ||
        text === '/estatus' ||
        text === '/reporte' ||
        text === '/hoy'
      ) {
        const { text: reportText, keyboard } = await generateAttendanceReport(undefined, true);
        await sendTelegramMessage({
          botToken,
          chatId,
          message: reportText,
          parseMode: 'Markdown',
          replyMarkup: keyboard,
        });
      } else if (text === '/ayer') {
        const yesterdayDateStr = getPastDateStr(1);
        const { text: reportText } = await generateAttendanceReport(yesterdayDateStr, false);
        await sendTelegramMessage({
          botToken,
          chatId,
          message: reportText,
          parseMode: 'Markdown',
          replyMarkup: getDefaultTelegramButtons(),
        });
      } else {
        // Mensaje de bienvenida con botones
        await sendTelegramMessage({
          botToken,
          chatId,
          message:
            '🤖 *Sistema de Control de Asistencia - Shimaya Ramen*\n\n' +
            'Usa los botones interactivos abajo para consultar el estatus en tiempo real o solicitar reportes de días anteriores:',
          parseMode: 'Markdown',
          replyMarkup: getDefaultTelegramButtons(),
        });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    console.error('Error en Telegram Webhook:', err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

/**
 * Genera la fecha en formato YYYY-MM-DD restando N días a la fecha actual de Perú
 */
function getPastDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

/**
 * Construye el teclado interactivo con botones para los últimos 5 días
 */
function buildDateSelectionKeyboard(): TelegramInlineKeyboard {
  const buttons = [];

  for (let i = 1; i <= 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

    // Etiqueta legible: ej. "Ayer (Dom 01/11)" o "Sáb 31/10"
    const weekday = d.toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'short' });
    const dayMonth = d.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit' });
    const label = i === 1 ? `Ayer (${weekday} ${dayMonth})` : `${weekday.toUpperCase()} ${dayMonth}`;

    buttons.push({
      text: label,
      callback_data: `report_date_${dateStr}`,
    });
  }

  return {
    inline_keyboard: [
      [buttons[0], buttons[1]],
      [buttons[2], buttons[3]],
      [buttons[4], buttons[5]],
      [{ text: '« Volver al Estatus de Hoy', callback_data: 'status_now' }],
    ],
  };
}
