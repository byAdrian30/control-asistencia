import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const { botToken, chatId } = await req.json();

    if (!botToken || !chatId) {
      return NextResponse.json(
        { success: false, error: 'Debes ingresar el Token del Bot y el Chat ID' },
        { status: 400 }
      );
    }

    const testMessage = `🤖 *¡Conexión Exitosa con el Bot de Telegram!*\n\nEl sistema de *Control de Asistencia de Tienda* está vinculado correctamente.\n\n📅 Fecha: \`${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}\` (Hora Perú)\n⏰ Recibirás las alertas de tardanza todos los días a las 12:00 PM.`;

    const res = await sendTelegramMessage({
      botToken,
      chatId,
      message: testMessage,
      parseMode: 'Markdown',
    });

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || 'Error al enviar mensaje' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Mensaje de prueba enviado con éxito a Telegram.' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
