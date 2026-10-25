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

/**
 * Genera el reporte formateado en Markdown para Telegram con las tardanzas del mediodía
 */
export function buildLateReportMessage(params: {
  storeName: string;
  dateStr: string;
  lateRecords: Array<{
    name: string;
    clockInTime: string;
    expectedTime: string;
    minutesLate: number;
  }>;
  onTimeCount: number;
  totalPresent: number;
}): string {
  const { storeName, dateStr, lateRecords, onTimeCount, totalPresent } = params;

  let msg = `🏪 *REPORTE DE ASISTENCIA - MEDIODÍA*\n`;
  msg += `📍 *Tienda:* ${storeName}\n`;
  msg += `📅 *Fecha:* ${dateStr}\n`;
  msg += `👥 *Personal Marcado:* ${totalPresent} colaboradores\n\n`;

  if (lateRecords.length === 0) {
    msg += `✅ *¡Excelente! Todo el personal llegó a tiempo hoy.*\n`;
    msg += `• Colaboradores puntuales: ${onTimeCount}\n`;
  } else {
    msg += `⚠️ *ALERTAS DE TARDANZA (${lateRecords.length}):*\n`;
    lateRecords.forEach((item, index) => {
      msg += `\n${index + 1}. *${item.name}*\n`;
      msg += `   ⏰ Entrada: \`${item.clockInTime}\` (Esperado: ${item.expectedTime})\n`;
      msg += `   🚨 *Tardanza: +${item.minutesLate} minutos*\n`;
    });

    msg += `\n📊 *Resumen:* ${lateRecords.length} tardanza(s), ${onTimeCount} a tiempo.`;
  }

  msg += `\n\n_Mensaje generado automáticamente por el Sistema de Asistencia._`;
  return msg;
}
