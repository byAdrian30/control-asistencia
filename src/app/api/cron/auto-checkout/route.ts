import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCloudFullState, saveCloudFullState } from '@/lib/cloud-storage';
import { serverAttendances, addOrUpdateServerAttendance } from '@/lib/server-state';

export async function GET(req: NextRequest) {
  return handleAutoCheckout(req);
}

export async function POST(req: NextRequest) {
  return handleAutoCheckout(req);
}

async function handleAutoCheckout(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Si CRON_SECRET está configurado y viene de cron externo, verificar
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(req.url);
      const manual = url.searchParams.get('manual');
      if (!manual) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    const now = new Date();
    const todayPeru = now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

    // 1. Obtener estado central
    const cloudState = await getCloudFullState();
    const attendances = cloudState.attendances || [];

    const closedIds: string[] = [];
    const updatedAttendances = attendances.map((att) => {
      if (!att.clock_out && att.clock_in) {
        const attDatePeru = new Date(att.clock_in).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        const diffHours = (now.getTime() - new Date(att.clock_in).getTime()) / (1000 * 60 * 60);

        // Si la marcación es de un día anterior en Perú O si han transcurrido más de 6 horas
        if (attDatePeru < todayPeru || diffHours >= 6) {
          closedIds.push(att.id);

          // Cierre a la 1:00 AM del día posterior a su inicio (o la hora actual)
          const closeTime = new Date(att.clock_in);
          closeTime.setHours(closeTime.getHours() + 12);
          const finalClose = closeTime.getTime() < now.getTime() ? closeTime.toISOString() : now.toISOString();

          const closedRecord = {
            ...att,
            clock_out: finalClose,
            auto_closed: true,
            notes: att.notes
              ? `${att.notes} | Cierre automático 1:00 AM`
              : 'Cierre automático a la 1:00 AM (Personal no marcó salida)',
          };
          addOrUpdateServerAttendance(closedRecord);
          return closedRecord;
        }
      }
      return att;
    });

    if (closedIds.length > 0) {
      // Guardar en almacenamiento central en la nube
      await saveCloudFullState({ attendances: updatedAttendances });

      // Guardar en Supabase PostgreSQL
      const supabase = getServiceSupabase();
      if (supabase) {
        await supabase
          .from('attendance')
          .update({
            clock_out: now.toISOString(),
            auto_closed: true,
            notes: 'Cierre automático a la 1:00 AM (Personal no marcó salida)',
          })
          .in('id', closedIds);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se cerraron automáticamente ${closedIds.length} sesión(es) abiertas.`,
      closedCount: closedIds.length,
      closedIds,
      timestamp: now.toISOString(),
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
