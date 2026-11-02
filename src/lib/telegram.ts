/**
 * Integración con Telegram Bot API
 * Soporta envío de mensajes, botones interactivos (inline keyboards),
 * confirmación de callbacks y generación de reportes estructurados.
 */

export interface TelegramButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramButton[][];
}

/**
 * Retorna los botones interactivos principales para Telegram
 */
export function getDefaultTelegramButtons(): TelegramInlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: '🔄 Estatus en Vivo de Hoy', callback_data: 'status_now' }
      ],
      [
        { text: '📅 Reportes de Otros Días', callback_data: 'menu_dates' }
      ],
      [
        { text: '🌐 Abrir App de Asistencia', url: 'https://asistencia-tienda.vercel.app' }
      ]
    ]
  };
}

/**
 * Responde inmediatamente a un clic de botón en Telegram para quitar el reloj de carga
 */
export async function answerCallbackQuery(params: {
  botToken: string;
  callbackQueryId: string;
  text?: string;
}): Promise<void> {
  const { botToken, callbackQueryId, text } = params;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (e) {
    console.warn('Error respondiendo callback_query:', e);
  }
}

/**
 * Envía un mensaje a Telegram mediante el Bot API (soporta botones interactivos)
 */
export async function sendTelegramMessage(params: {
  botToken: string;
  chatId: string | number;
  message: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: TelegramInlineKeyboard;
}): Promise<{ success: boolean; error?: string; responseData?: unknown }> {
  const { botToken, chatId, message, parseMode = 'Markdown', replyMarkup } = params;

  if (!botToken || !chatId) {
    return {
      success: false,
      error: 'Token de Telegram o Chat ID no configurados.',
    };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: message,
      parse_mode: parseMode,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || 'Error al comunicarse con Telegram API',
        responseData: data,
      };
    }

    return { success: true, responseData: data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

export interface TelegramLateRecord {
  name: string;
  clockInTime: string;
  expectedTime: string;
  minutesLate: number;
  quincenaTotalMinutes?: number;
  lostChippu?: boolean;
  area?: string;
}

export interface TelegramOnTimeRecord {
  name: string;
  clockInTime: string;
  expectedTime?: string;
  area?: string;
}

export interface TelegramPendingRecord {
  name: string;
  expectedTime: string;
  area?: string;
  role?: string;
}

export interface TelegramRestDayRecord {
  name: string;
  area?: string;
  role?: string;
}

function cleanMd(text?: string): string {
  if (!text) return '';
  return text.replace(/[*_`\[\]]/g, ' ').trim();
}

/**
 * Genera el reporte formateado en Markdown para Telegram.
 * Sin el campo PERIODO (retirado a solicitud).
 * Por defecto configurado para el reporte diario de las 5:30 PM o consultas en vivo.
 */
export function buildLateReportMessage(params: {
  storeName: string;
  dateStr: string;
  reportTitle?: string;
  lateRecords: TelegramLateRecord[];
  onTimeRecords?: TelegramOnTimeRecord[];
  onTimeCount?: number;
  totalPresent: number;
  missingRecords?: TelegramPendingRecord[];
  afternoonRecords?: TelegramPendingRecord[];
  restDayRecords?: TelegramRestDayRecord[];
  totalEmployees?: number;
}): string {
  const {
    storeName,
    dateStr,
    reportTitle = '🏪 *REPORTE DE ASISTENCIA - 5:30 PM*',
    lateRecords = [],
    onTimeRecords = [],
    onTimeCount = onTimeRecords.length,
    totalPresent = 0,
    missingRecords = [],
    afternoonRecords = [],
    restDayRecords = [],
    totalEmployees = 16,
  } = params;

  let msg = `${reportTitle}\n`;
  msg += `📍 *Tienda:* ${cleanMd(storeName)}\n`;
  msg += `📅 *Fecha:* ${cleanMd(dateStr)}\n`;
  msg += `👥 *Total Colaboradores:* ${totalEmployees}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 *ESTADO GENERAL:*\n`;
  msg += `• Presentes marcados: *${totalPresent}* (A tiempo: ${onTimeCount}, Tardanzas: ${lateRecords.length})\n`;
  msg += `• 🚨 *No marcaron (Faltas):* *${missingRecords.length}*\n`;
  if (afternoonRecords.length > 0) {
    msg += `• 🕒 *Turno tarde por ingresar:* *${afternoonRecords.length}*\n`;
  }
  msg += `• 😴 *En día de descanso:* *${restDayRecords.length}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // 1. COLABORADORES QUE NO HAN MARCADO
  if (missingRecords.length > 0) {
    msg += `🚨 *COLABORADORES QUE NO HAN MARCADO (${missingRecords.length}):*\n`;
    missingRecords.forEach((item, index) => {
      const areaTag = item.area ? ` [${cleanMd(item.area)}]` : '';
      msg += `${index + 1}. *${cleanMd(item.name)}*${areaTag}\n`;
      msg += `   ⏰ Hora esperada de ingreso: \`${item.expectedTime}\`\n`;
    });
    msg += `\n`;
  } else {
    msg += `✅ *ASISTENCIA COMPLETA:* Todos los colaboradores programados para hoy registraron su ingreso.\n\n`;
  }

  // 2. ALERTAS DE TARDANZA
  if (lateRecords.length > 0) {
    msg += `⚠️ *ALERTAS DE TARDANZA (${lateRecords.length}):*\n`;
    lateRecords.forEach((item, index) => {
      const areaTag = item.area ? ` [${cleanMd(item.area)}]` : '';
      msg += `${index + 1}. *${cleanMd(item.name)}*${areaTag}\n`;
      msg += `   ⏰ Entrada: \`${item.clockInTime}\` (Esperado: ${item.expectedTime})\n`;
      msg += `   ⏱️ *Tardanza hoy: +${item.minutesLate} min*\n`;
      if (item.quincenaTotalMinutes !== undefined) {
        if (item.lostChippu) {
          msg += `   🚨 *¡PERDIÓ EL 100% DE SU CHIPPU!* (Acumulado: ${item.quincenaTotalMinutes}/10 min)\n`;
        } else {
          msg += `   🟡 *Chippu:* Acumula ${item.quincenaTotalMinutes}/10 min en la quincena\n`;
        }
      }
    });
    msg += `\n`;
  } else {
    msg += `✅ *PUNTUALIDAD:* Cero tardanzas registradas hoy entre los presentes.\n\n`;
  }

  // 3. PRESENTES PUNTUALES
  if (onTimeRecords.length > 0) {
    msg += `🟢 *PRESENTES PUNTUALES (${onTimeRecords.length}):*\n`;
    onTimeRecords.forEach((item) => {
      const areaTag = item.area ? ` (${cleanMd(item.area)})` : '';
      msg += `• ${cleanMd(item.name)}${areaTag} - Ingreso: \`${item.clockInTime}\`\n`;
    });
    msg += `\n`;
  }

  // 4. TURNO TARDE (solo si el reporte se ejecuta antes de la hora de su turno)
  if (afternoonRecords.length > 0) {
    msg += `🕒 *TURNO TARDE - INGRESO POSTERIOR (${afternoonRecords.length}):*\n`;
    afternoonRecords.forEach((item) => {
      const areaTag = item.area ? ` [${cleanMd(item.area)}]` : '';
      msg += `• *${cleanMd(item.name)}*${areaTag} - Programado: \`${item.expectedTime}\`\n`;
    });
    msg += `\n`;
  }

  // 5. EN SU DÍA DE DESCANSO
  if (restDayRecords.length > 0) {
    msg += `😴 *EN SU DÍA DE DESCANSO HOY (${restDayRecords.length}):*\n`;
    restDayRecords.forEach((item) => {
      const areaTag = item.area ? ` (${cleanMd(item.area)})` : '';
      msg += `• ${cleanMd(item.name)}${areaTag}\n`;
    });
    msg += `\n`;
  }

  // Resumen Chippu
  const lostChippuCount = lateRecords.filter((r) => r.lostChippu).length;
  if (lostChippuCount > 0) {
    msg += `❌ *Colaboradores que perdieron el 100% del Chippu:* ${lostChippuCount}\n\n`;
  }

  msg += `_Sistema de Asistencia en la Nube · Shimaya Ramen_`;
  return msg;
}
