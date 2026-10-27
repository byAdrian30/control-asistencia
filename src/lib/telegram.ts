/**
 * Envía un mensaje a Telegram mediante el Bot API
 */
export async function sendTelegramMessage(params: {
  botToken: string;
  chatId: string;
  message: string;
  parseMode?: 'Markdown' | 'HTML';
}): Promise<{ success: boolean; error?: string; responseData?: unknown }> {
  const { botToken, chatId, message, parseMode = 'Markdown' } = params;

  if (!botToken || !chatId) {
    return {
      success: false,
      error: 'Token de Telegram o Chat ID no configurados.',
    };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
      }),
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
 * Genera el reporte formateado en Markdown para Telegram para el reporte del mediodía (12:00 PM).
 * Desglosa:
 * 1. Colaboradores que NO marcaron (Faltas pendientes del turno matutino 11:00 / 12:00)
 * 2. Colaboradores en su DÍA DE DESCANSO según la malla oficial
 * 3. Colaboradores de TURNO TARDE (entran después de las 12:00 PM)
 * 4. Colaboradores PRESENTES PUNTUALES
 * 5. Alertas de TARDANZA y pérdida del 100% de Chippu
 */
export function buildLateReportMessage(params: {
  storeName: string;
  dateStr: string;
  quincenaLabel?: string;
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
    quincenaLabel,
    lateRecords = [],
    onTimeRecords = [],
    onTimeCount = onTimeRecords.length,
    totalPresent = 0,
    missingRecords = [],
    afternoonRecords = [],
    restDayRecords = [],
    totalEmployees = 17,
  } = params;

  let msg = `🏪 *REPORTE DE ASISTENCIA - 12:00 PM*\n`;
  msg += `📍 *Tienda:* ${cleanMd(storeName)}\n`;
  msg += `📅 *Fecha:* ${cleanMd(dateStr)}\n`;
  if (quincenaLabel) {
    msg += `🗓️ *Periodo:* ${cleanMd(quincenaLabel)}\n`;
  }
  msg += `👥 *Total Colaboradores:* ${totalEmployees}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 *ESTADO GENERAL DEL DÍA:*\n`;
  msg += `• Presentes marcados: *${totalPresent}* (A tiempo: ${onTimeCount}, Tardanzas: ${lateRecords.length})\n`;
  msg += `• 🚨 *No marcaron (Faltas turno mañana):* *${missingRecords.length}*\n`;
  msg += `• 🕒 *Turno tarde (Ingreso posterior):* *${afternoonRecords.length}*\n`;
  msg += `• 😴 *En día de descanso:* *${restDayRecords.length}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // 1. COLABORADORES QUE NO HAN MARCADO (Debieron ingresar a las 11:00 / 12:00)
  if (missingRecords.length > 0) {
    msg += `🚨 *COLABORADORES QUE NO HAN MARCADO (${missingRecords.length}):*\n`;
    msg += `_(Debieron ingresar a las 11:00 / 12:00 y no registran marcación)_\n`;
    missingRecords.forEach((item, index) => {
      const areaTag = item.area ? ` [${cleanMd(item.area)}]` : '';
      msg += `${index + 1}. *${cleanMd(item.name)}*${areaTag}\n`;
      msg += `   ⏰ Hora esperada: \`${item.expectedTime}\`\n`;
    });
    msg += `\n`;
  } else {
    msg += `✅ *FALTAS MATUTINAS:* Cero faltas, todo el personal de la mañana registró su ingreso.\n\n`;
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
    msg += `✅ *PUNTUALIDAD:* Cero tardanzas hoy entre los presentes.\n\n`;
  }

  // 3. PRESENTES PUNTUALES
  if (onTimeRecords.length > 0) {
    msg += `🟢 *PRESENTES PUNTUALES (${onTimeRecords.length}):*\n`;
    onTimeRecords.forEach((item) => {
      const areaTag = item.area ? ` (${cleanMd(item.area)})` : '';
      msg += `• ${cleanMd(item.name)}${areaTag} - \`${item.clockInTime}\`\n`;
    });
    msg += `\n`;
  }

  // 4. TURNO TARDE
  if (afternoonRecords.length > 0) {
    msg += `🕒 *TURNO TARDE - INGRESO POSTERIOR (${afternoonRecords.length}):*\n`;
    msg += `_(No les correspondía marcar a las 12:00 PM)_\n`;
    afternoonRecords.forEach((item) => {
      const areaTag = item.area ? ` [${cleanMd(item.area)}]` : '';
      msg += `• *${cleanMd(item.name)}*${areaTag} - Entrada programada: \`${item.expectedTime}\`\n`;
    });
    msg += `\n`;
  }

  // 5. EN SU DÍA DE DESCANSO
  if (restDayRecords.length > 0) {
    msg += `😴 *EN SU DÍA DE DESCANSO HOY (${restDayRecords.length}):*\n`;
    msg += `_(Según la malla semanal oficial)_\n`;
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

  msg += `_Mensaje generado automáticamente por el Sistema de Asistencia Shimaya Ramen._`;
  return msg;
}
