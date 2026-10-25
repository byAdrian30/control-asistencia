import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

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

    const supabase = getServiceSupabase();

    if (!supabase) {
      return NextResponse.json({
        success: false,
        message: 'Supabase no configurado en variables de entorno del servidor. Si estás en modo demo local, el auto-cierre se procesa en la app cliente.',
      });
    }

    // Hora límite: cualquier marcación abierta de hace más de 4 horas o anterior a las 00:00 de hoy
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();

    // 1. Buscar registros sin cerrar
    const { data: openRecords, error: fetchError } = await supabase
      .from('attendance')
      .select('id, employee_id, clock_in')
      .is('clock_out', null)
      .lt('clock_in', fourHoursAgo);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!openRecords || openRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay jornadas abiertas pendientes de auto-cierre.',
        closedCount: 0,
        timestamp: now.toISOString(),
      });
    }

    const recordIds = openRecords.map((r) => r.id);

    // 2. Actualizar registros: marcar salida a las 01:00 AM (o fecha actual de ejecución) y auto_closed = true
    const { error: updateError } = await supabase
      .from('attendance')
      .update({
        clock_out: now.toISOString(),
        auto_closed: true,
        notes: 'Cierre automático a la 1:00 AM (Personal no marcó salida)',
      })
      .in('id', recordIds);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Se desloguearon automáticamente ${recordIds.length} colaborador(es) que no marcaron salida.`,
      closedCount: recordIds.length,
      closedIds: recordIds,
      timestamp: now.toISOString(),
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
