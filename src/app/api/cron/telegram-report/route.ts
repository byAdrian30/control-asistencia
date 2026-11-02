import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { generateAttendanceReport } from '@/lib/attendance-reporter';
import { getCloudFullState } from '@/lib/cloud-storage';
import { currentServerConfig } from '@/lib/server-state';

export async function GET(req: NextRequest) {
  return handleTelegramReport(req);
}

export async function POST(req: NextRequest) {
  return handleTelegramReport(req);
}

async function handleTelegramReport(req: NextRequest) {
  try {
    const cloudFullState = await getCloudFullState();

    const botToken =
      cloudFullState.config?.telegram_bot_token ||
      currentServerConfig.telegram_bot_token ||
      process.env.TELEGRAM_BOT_TOKEN;

    const chatId =
      cloudFullState.config?.telegram_chat_id ||
      currentServerConfig.telegram_chat_id ||
      process.env.TELEGRAM_CHAT_ID;

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

    // Generar reporte de las 5:30 PM
    const { text, keyboard, stats } = await generateAttendanceReport(undefined, false);

    const telegramRes = await sendTelegramMessage({
      botToken,
      chatId,
      message: text,
      parseMode: 'Markdown',
      replyMarkup: keyboard,
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
      message: 'Reporte de las 5:30 PM enviado con éxito a Telegram con botones interactivos.',
      data: stats,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
